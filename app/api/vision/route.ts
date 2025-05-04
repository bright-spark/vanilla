export const runtime = 'edge';
import config from '@/config';

export async function POST(req: Request) {
  try {
    const { messages, model = '@cf/meta/llama-4-scout-17b-16e-instruct' } = await req.json();

    // Only check for API key if we're not using mock data
    if (!config.useMockData && !config.apiKey) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'API key not configured',
            type: 'configuration_error',
          },
        }),
        { status: 500 }
      );
    }

    const response = await fetch(`${config.apiBaseUrl}/v1/chat/completions/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'An unknown error occurred' }
      }));
      return new Response(
        JSON.stringify(error),
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error: any) {
    console.error('Vision API error:', error);
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