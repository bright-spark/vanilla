export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { prompt, image, model = '@cf/stability-ai/stable-diffusion-xl-base-1.0' } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
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

    const endpoint = image 
      ? 'https://api.redbuilder.io/v1/images/variations'
      : 'https://api.redbuilder.io/v1/images/generations';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        image,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
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
    console.error('Image API error:', error);
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