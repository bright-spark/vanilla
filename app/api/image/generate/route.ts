import { NextRequest } from 'next/server';
import config from '@/config';

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
    
    // Forward the prompt to the appropriate API based on environment
    const response = await fetch(`${config.apiBaseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '1024x1024',
        model: 'dall-e-3',
      }),
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

    try {
      // Return the response from the multimodel API
      const data = await response.json();
      console.log('Image generation response:', data);
      
      // Check if the response contains a mock error URL
      const url = data.data?.[0]?.url || data.url;
      if (url && (url.includes('mock-error') || url.includes('api.redbuilder.io'))) {
        console.log('Detected mock URL, generating fallback image');
        
        // Generate a fallback image data URL (a simple colored square with text)
        const fallbackImage = generateFallbackImage(prompt);
        
        // Return the fallback image
        return new Response(JSON.stringify({
          data: [{
            url: fallbackImage,
            revised_prompt: data.data?.[0]?.revised_prompt || `Fallback image for: ${prompt}`
          }]
        }), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      // Ensure the data structure is as expected
      if (!data.data?.[0]?.url && data.success && data.data) {
        console.log('Restructuring image data response');
        // Restructure the response if needed
        return new Response(JSON.stringify({
          data: data.data
        }), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (parseError) {
      console.error('Error parsing image generation response:', parseError);
      return new Response(
        JSON.stringify({
          error: {
            message: 'Error parsing image generation response',
            type: 'parse_error',
          },
        }),
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Image generation error:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'An internal error occurred',
          type: 'internal_error',
        },
      }),
      { status: 500 }
    );
  }
}
