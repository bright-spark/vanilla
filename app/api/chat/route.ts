import { OpenAIStream, StreamingTextResponse } from 'ai';

// Set the runtime to edge for best performance
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Chat API request body:', JSON.stringify(body, null, 2));
    
    const { messages, model = '@cf/meta/llama-4-scout-17b-16e-instruct' } = body;

    // Validate messages array
    if (!messages || !Array.isArray(messages)) {
      console.log('Invalid messages array:', messages);
      return new Response(
        JSON.stringify({
          error: {
            message: 'Messages array is required and must be an array',
            type: 'invalid_request_error',
          },
        }),
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY');
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

    // Forward the request to our OpenAI-compatible API
    const response = await fetch('https://api.redbuilder.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false, // Force non-streaming for testing
      }),
    });

    // Always handle as JSON response
    const data = await response.json();
    return new Response(
      JSON.stringify({
        id: data.id,
        role: "assistant",
        content: data.choices[0].message.content,
        createdAt: new Date(data.created * 1000).toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: any) {
    console.error('Chat API error:', error);
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