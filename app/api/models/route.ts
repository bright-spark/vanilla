export const runtime = 'edge';
import config from '@/config';

// Helper function to categorize models by type
function categorizeModel(modelId: string): 'text-to-text' | 'text-to-image' | 'inpainting' | 'image-to-image' | 'other' {
  const id = modelId.toLowerCase();
  
  // Text-to-text models
  if (
    id.includes('llama') || 
    id.includes('mistral') || 
    id.includes('gemma') || 
    id.includes('qwen') || 
    id.includes('claude') ||
    id.includes('gpt')
  ) {
    return 'text-to-text';
  }
  
  // Text-to-image models
  if (
    id.includes('stable-diffusion') || 
    id.includes('sdxl') || 
    id.includes('dall-e')
  ) {
    return 'text-to-image';
  }
  
  // Inpainting models
  if (
    id.includes('inpaint') || 
    id.includes('controlnet')
  ) {
    return 'inpainting';
  }
  
  // Image-to-image models
  if (
    id.includes('img2img') || 
    id.includes('image-to-image') ||
    id.includes('upscale') ||
    id.includes('style-transfer')
  ) {
    return 'image-to-image';
  }
  
  return 'other';
}

// Define best models for each category
const bestModels = {
  'text-to-text': '@cf/meta/llama-4-scout-17b-16e-instruct',
  'text-to-image': '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  'inpainting': '@cf/stabilityai/stable-diffusion-xl-base-1.0', // Fallback if no specific inpainting model
  'image-to-image': '@cf/stabilityai/stable-diffusion-xl-base-1.0', // Fallback if no specific img2img model
};

export async function GET() {
  try {
    if (config.useMockData) {
      // Return mock data when configured to do so
      return Response.json({
        object: "list",
        data: [
          {
            id: '@cf/meta/llama-4-scout-17b-16e-instruct',
            name: 'Llama 4 (Text)',
            type: 'text-to-text',
            created: Date.now(),
            owned_by: 'meta',
          },
          {
            id: '@cf/meta/llama-3-70b-instruct',
            name: 'Llama 3.3 (Text)',
            type: 'text-to-text',
            created: Date.now(),
            owned_by: 'meta',
          },
          {
            id: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
            name: 'Stable Diffusion XL (Image)',
            type: 'text-to-image',
            created: Date.now(),
            owned_by: 'stability',
          },
          {
            id: '@cf/stabilityai/stable-diffusion-inpainting',
            name: 'SD Inpainting',
            type: 'inpainting',
            created: Date.now(),
            owned_by: 'stability',
          },
          {
            id: '@cf/stabilityai/stable-diffusion-img2img',
            name: 'SD Image-to-Image',
            type: 'image-to-image',
            created: Date.now(),
            owned_by: 'stability',
          }
        ],
        bestModels
      });
    }

    const response = await fetch(`${config.apiBaseUrl}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
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

    // Transform the response and categorize models
    const models = data.models?.map((model: any) => {
      const type = categorizeModel(model.id);
      return {
        id: model.id,
        name: `${model.name || model.id} (${type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')})`,
        type,
        created: Date.now(),
        owned_by: model.provider || "redbuilder",
      };
    }) || [];

    // Update best models based on available models
    const availableModelsByType: Record<string, any[]> = {
      'text-to-text': [],
      'text-to-image': [],
      'inpainting': [],
      'image-to-image': [],
    };

    // Group models by type
    models.forEach((model: any) => {
      if (availableModelsByType[model.type]) {
        availableModelsByType[model.type].push(model);
      }
    });

    // Select best model for each type
    Object.keys(availableModelsByType).forEach(type => {
      if (availableModelsByType[type].length > 0) {
        // Use the first model of each type as the best one
        bestModels[type as keyof typeof bestModels] = availableModelsByType[type][0].id;
      }
    });

    return Response.json({
      object: "list",
      data: models,
      bestModels
    });
  } catch (error: any) {
    console.error('Error fetching models:', error);
    // Return mock data as fallback
    return Response.json({
      object: "list",
      data: [
        {
          id: '@cf/meta/llama-4-scout-17b-16e-instruct',
          name: 'Llama 4 (Text)',
          type: 'text-to-text',
          created: Date.now(),
          owned_by: 'meta',
        },
        {
          id: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
          name: 'Stable Diffusion XL (Image)',
          type: 'text-to-image',
          created: Date.now(),
          owned_by: 'stability',
        }
      ],
      bestModels,
      error: {
        message: error.message || 'An unknown error occurred',
        type: 'internal_error',
      }
    });
  }
}