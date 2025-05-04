import { OpenAIStream, StreamingTextResponse } from 'ai';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { messages, model, stream: streamParam = false } = await req.json();

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Missing or invalid messages field',
            type: 'invalid_request_error',
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Validate model
    if (!model) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Missing model field',
            type: 'invalid_request_error',
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Log the request for debugging
    console.log('Chat API request body:', JSON.stringify({ messages, model, stream: streamParam }, null, 2));

    // Try to connect to the multimodel API
    let multimodelResponse: Response;
    
    try {
      // Forward the request to our local multimodel API
      multimodelResponse = await fetch('http://localhost:8787/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: streamParam,
          temperature: 0.7,
          max_tokens: 1000
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      console.log('Multimodel API response status:', multimodelResponse.status);
      
      // Check if the response is ok
      if (!multimodelResponse.ok) {
        const errorText = await multimodelResponse.text();
        console.error('Multimodel API error:', errorText);
        throw new Error(`API returned ${multimodelResponse.status}: ${errorText}`);
      }
    } catch (fetchError: unknown) {
      // Handle connection errors
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error('Connection error to multimodel API:', errorMessage);
      
      // Return a friendly error message
      return new Response(
        JSON.stringify({
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, but I can't connect to the AI service right now. Please make sure the multimodel API server is running at http://localhost:8787 and try again.",
        }),
        {
          status: 200, // Return 200 to avoid client-side error handling
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle streaming responses
    if (streamParam) {
      try {
        const stream = OpenAIStream(multimodelResponse);
        return new StreamingTextResponse(stream);
      } catch (streamError: unknown) {
        // Log the streaming error
        const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
        console.error('Error creating streaming response:', errorMessage);
        
        // Fall back to non-streaming response
        return new Response(
          JSON.stringify({
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, I encountered an error while streaming the response. Please try again with streaming disabled.',
          }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Handle non-streaming responses
    try {
      // Clone the response before reading its body
      const responseClone = multimodelResponse.clone();
      const responseText = await responseClone.text();
      
      // Try to parse the response as JSON
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed API response:', JSON.stringify(data, null, 2));
        
        return new Response(
          JSON.stringify({
            id: data.id || `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.choices?.[0]?.message?.content || 'Sorry, I encountered an error processing your request.',
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (parseError: unknown) {
        // Handle JSON parsing errors
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error('Error parsing JSON response:', errorMessage, '\nRaw response:', responseText);
        
        return new Response(
          JSON.stringify({
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, I received an invalid response from the AI service. Please try again later.',
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (responseError: unknown) {
      // Handle errors reading the response
      const errorMessage = responseError instanceof Error ? responseError.message : String(responseError);
      console.error('Error reading API response:', errorMessage);
      
      return new Response(
        JSON.stringify({
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing the AI service response. Please try again.',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    // Handle any other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Chat API error:', errorMessage);
    
    return new Response(
      JSON.stringify({
        error: {
          message: errorMessage || 'An internal error occurred',
          type: 'internal_error',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}