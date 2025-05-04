import { NextRequest } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    // Check if the request is a multipart form
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Request must be multipart/form-data',
            type: 'invalid_request_error',
          },
        }),
        { status: 400 }
      );
    }

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'No file provided',
            type: 'invalid_request_error',
          },
        }),
        { status: 400 }
      );
    }

    // Check file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'File must be an image',
            type: 'invalid_request_error',
          },
        }),
        { status: 400 }
      );
    }

    // Convert the file to a base64 string
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);
    
    // Create a data URL with the base64 data
    const dataUrl = `data:${file.type};base64,${base64Data}`;
    
    // Log the data URL length to help with debugging
    console.log(`Generated data URL with length: ${dataUrl.length}`);
    console.log(`Data URL starts with: ${dataUrl.substring(0, 50)}...`);
    
    // Create a simple response with the data URL
    return new Response(
      JSON.stringify({
        success: true,
        url: dataUrl,
        data: [{
          url: dataUrl
        }]
      }),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    console.error('Image upload error:', error);
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
