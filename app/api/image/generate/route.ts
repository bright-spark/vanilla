import { NextRequest } from 'next/server';

// Define the config directly to avoid import issues
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.redbuilder.io',
  apiKey: process.env.REDBUILDER_API_KEY || process.env.OPENAI_API_KEY || '',
  useMockData: process.env.NODE_ENV === 'development' && (!process.env.REDBUILDER_API_KEY && !process.env.OPENAI_API_KEY)
};

// Type definition for the config
interface Config {
  apiBaseUrl: string;
  apiKey: string;
  useMockData: boolean;
}

/**
 * Fetch with retry and exponential backoff
 * @param url The URL to fetch
 * @param options Fetch options with retry configuration
 * @returns Promise with the fetch response
 */
async function fetchWithRetry(
  url: string,
  options: any = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = (response: Response) => !response.ok,
    shouldRetryOnError = (error: Error) => true,
    onRetry = (retryCount: number, delay: number, error?: Error) => {},
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      // Log attempt for debugging
      if (retryCount > 0) {
        console.log(`Attempt ${retryCount + 1}/${maxRetries + 1} to fetch ${url}`);
      }

      // Make the fetch request
      const response = await fetch(url, fetchOptions);

      // If the response is successful or we shouldn't retry, return it
      if (response.ok || (retryCount === maxRetries) || !(await shouldRetry(response))) {
        return response;
      }

      // Log retry information
      console.log(`Request failed with status ${response.status}. Retrying in ${delay}ms...`);
    } catch (error) {
      // Save the error for later
      lastError = error as Error;

      // If we've reached the maximum number of retries or we shouldn't retry on this error, throw
      if (retryCount === maxRetries || !(await shouldRetryOnError(lastError))) {
        throw lastError;
      }

      // Log retry information
      console.log(`Request failed with error: ${lastError.message}. Retrying in ${delay}ms...`);
    }

    // Call the onRetry callback with the error
    onRetry(retryCount + 1, delay, lastError || undefined);
    
    // Wait before the next retry
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Calculate the delay for the next retry
    delay = Math.min(delay * backoffFactor, maxDelay);
  }

  // This should never happen, but TypeScript requires a return statement
  throw lastError || new Error('Maximum retries reached');
}

/**
 * Generates a realistic image URL based on the prompt using RedBuilder API
 */
async function generateImageFromPrompt(prompt: string): Promise<string> {
  try {
    // Use the RedBuilder API for image generation
    const typedConfig = config as Config;
    
    // If no API key is available, use the fallback
    if (!typedConfig.apiKey) {
      console.log('No API key available, using fallback image');
      return generateFallbackPlaceholder(prompt);
    }
    
    const response = await fetchWithRetry(`${typedConfig.apiBaseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${typedConfig.apiKey}`
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '512x512',
        response_format: 'url'
      }),
      maxRetries: 3,
      initialDelay: 1000,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle different response formats
    if (data.data && data.data.length > 0) {
      return data.data[0].url || '';
    } else if (data.url) {
      return data.url;
    } else if (data.imageUrl) {
      return data.imageUrl;
    } else {
      throw new Error('No image URL in response');
    }
  } catch (error) {
    console.error('Error generating image from RedBuilder API:', error);
    // Fallback to a placeholder if the API call fails
    return generateFallbackPlaceholder(prompt);
  }
}

/**
 * Generates a fallback placeholder image if the API call fails
 */
function generateFallbackPlaceholder(prompt: string): string {
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
    
    try {
      // Generate image using our helper function
      const imageUrl = await generateImageFromPrompt(prompt);
      
      // Return the response with the image URL
      return new Response(
        JSON.stringify({
          created: Date.now(),
          data: [
            {
              url: imageUrl,
              revised_prompt: prompt,
            },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200
        }
      );
    } catch (apiError: any) {
      console.error('Error calling image generation API:', apiError);
      
      // Return an error response
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
  } catch (error: any) {
    console.error('Error processing image generation request:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Error processing image generation request',
          type: 'server_error',
        },
      }),
      { status: 500 }
    );
  }
}
