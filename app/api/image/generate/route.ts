import { NextRequest } from 'next/server';

// Import the config and explicitly type it
// @ts-ignore - Suppress TypeScript errors for this import
import config from '@/config';

// Declare the type for TypeScript
declare const config: {
  apiBaseUrl: string;
  apiKey: string;
  useMockData: boolean;
};

/**
 * Fetch with retry and exponential backoff
 * @param url The URL to fetch
 * @param options Fetch options with retry configuration
 * @returns Promise with the fetch response
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      console.log(`Attempt ${retryCount + 1}/${maxRetries + 1} to fetch ${url}`);
      const response = await fetch(url, fetchOptions);
      
      // If the response is successful, return it
      if (response.ok) {
        return response;
      }

      // If we've reached the maximum number of retries, return the last response
      if (retryCount === maxRetries) {
        console.log(`Maximum retries reached (${maxRetries}). Returning last response.`);
        return response;
      }

      // Calculate the delay for the next retry
      delay = Math.min(delay * backoffFactor, maxDelay);
      
      console.log(`Request failed with status ${response.status}. Retrying in ${delay}ms...`);
      
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error as Error;
      
      // If we've reached the maximum number of retries, throw the last error
      if (retryCount === maxRetries) {
        console.log(`Maximum retries reached (${maxRetries}). Throwing error.`);
        throw lastError;
      }

      // Calculate the delay for the next retry
      delay = Math.min(delay * backoffFactor, maxDelay);
      
      console.log(`Request failed with error: ${lastError.message}. Retrying in ${delay}ms...`);
      
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never happen, but TypeScript requires a return statement
  throw lastError || new Error('Maximum retries reached');
}

/**
 * Generates a fallback image data URL with the prompt text
 * This is used when the actual image generation service returns a mock error
 */
function generateFallbackImage(prompt: string): string {
  // Create a canvas element (in Node.js environment)
  const width = 512;
  const height = 512;
  
  // Since we can't use Canvas in Edge runtime, create a simple SVG image
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <rect width="90%" height="90%" x="5%" y="5%" fill="#e0e0e0" stroke="#ccc" stroke-width="2"/>
      <text x="50%" y="30%" font-family="Arial" font-size="24" text-anchor="middle" fill="#333">Image Generation</text>
      <text x="50%" y="40%" font-family="Arial" font-size="18" text-anchor="middle" fill="#555">Fallback placeholder</text>
      <text x="50%" y="50%" font-family="Arial" font-size="16" text-anchor="middle" fill="#777" width="80%">${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}</text>
      <text x="50%" y="70%" font-family="Arial" font-size="14" text-anchor="middle" fill="#999">Development mode</text>
    </svg>
  `;
  
  // Convert SVG to a data URL - using btoa for base64 encoding in Edge runtime
  // Note: btoa doesn't handle Unicode well, so we escape the SVG content first
  const encodedSvg = btoa(encodeURIComponent(svgContent).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  const dataUrl = `data:image/svg+xml;base64,${encodedSvg}`;
  return dataUrl;
}

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { prompt } = body;
    
    if (!prompt) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Prompt is required',
            type: 'invalid_request_error',
          },
        }),
        { status: 400 }
      );
    }

    console.log('Image generation request:', { prompt });
    
    // Make the API request to RedBuilder API with retry mechanism
    try {
      const response = await fetchWithRetry(`${config.apiBaseUrl}/api/v1/image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          prompt,
          model: 'stable-diffusion-v1-5',
          n: 1,
          size: '512x512',
        }),
        // Retry configuration
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 8000,
        backoffFactor: 2
      });

      if (!response.ok) {
        const errorData = await response.json();
        return new Response(
          JSON.stringify({
            error: {
              message: errorData.error?.message || 'Error generating image',
              type: 'api_error',
            },
          }),
          { status: response.status }
        );
      }

      // Return the response from the RedBuilder API
      const data = await response.json();
      console.log('Image generation response:', data);
      
      // Check if the response contains a URL from the RedBuilder API
      let url = data.data?.[0]?.url || data.url;
      
      // Fix the URL if it's using the wrong domain or path structure
      if (url) {
        // Extract the filename from the URL to create a fixed version
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        // If we have multiple URLs in the response, use them or create fallbacks
        if (data.data?.[0]?.urls) {
          data.data[0].urls = {
            ...data.data[0].urls,
            // Add the known working direct URL format
            direct: `https://multi.redbuilder.io/generations/${filename}`,
            // Keep the original URL as a fallback
            original: url
          };
          
          // Also update the main URL to the one that works
          data.data[0].url = `https://multi.redbuilder.io/generations/${filename}`;
          url = data.data[0].url;
        } else if (data.data && data.data.length > 0) {
          // Create URLs object if it doesn't exist
          data.data[0].urls = {
            main: url,
            worker: `https://redbuilder-api.redbuilder.workers.dev/images/generations/${filename}`,
            direct: `https://multi.redbuilder.io/generations/${filename}`,
            public: `https://pub-account.r2.dev/generations/${filename}`
          };
          
          // Update the main URL to the one that works
          data.data[0].url = `https://multi.redbuilder.io/generations/${filename}`;
          url = data.data[0].url;
        }
      }
      
      console.log('Using URL from API response (updated if needed):', url);
      
      // Return the modified API response
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (apiError) {
      console.error('Error calling image generation API:', apiError);
      
      // If we're in development mode, generate a fallback image
      if (config.useMockData) {
        console.log('Using fallback image in development mode');
        const fallbackUrl = generateFallbackImage(prompt);
        
        // Return a mock response with the fallback image
        return new Response(
          JSON.stringify({
            created: Date.now(),
            data: [
              {
                url: fallbackUrl,
                revised_prompt: prompt,
              },
            ],
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      
      // Otherwise, return an error response
      return new Response(
        JSON.stringify({
          error: {
            message: apiError instanceof Error ? apiError.message : 'Error generating image',
            type: 'api_error',
          },
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing image generation request:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Error processing request',
          type: 'server_error',
        },
      }),
      { status: 500 }
    );
  }
}
