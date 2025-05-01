export const runtime = 'edge';

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          data: [],
          error: {
            message: 'API key not configured',
            type: 'configuration_error',
          },
        }),
        { status: 500 }
      );
    }

    const response = await fetch('https://api.redbuilder.io/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'An unknown error occurred' }
      }));
      return new Response(
        JSON.stringify({
          data: [],
          error,
        }),
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform the response to match OpenAI format
    const models = data.models?.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      created: Date.now(),
      owned_by: model.provider || "redbuilder",
      permission: [],
      root: model.id,
      parent: null,
    })) || [];

    return Response.json({
      object: "list",
      data: models
    });
  } catch (error: any) {
    console.error('Models API error:', error);
    return new Response(
      JSON.stringify({
        data: [],
        error: {
          message: error.message || 'An internal error occurred',
          type: 'internal_error',
        },
      }),
      { status: 500 }
    );
  }
} 