"use client"

import * as React from 'react';
import { Check, ChevronsUpDown, ChevronDown } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
  type?: 'text-to-text' | 'text-to-image' | 'inpainting' | 'image-to-image' | 'other';
}

interface BestModels {
  'text-to-text': string;
  'text-to-image': string;
  'inpainting': string;
  'image-to-image': string;
}

// Add a mapping from model id to short name
const modelShortNames: Record<string, string> = {
  '@cf/meta/llama-4-scout-17b-16e-instruct': 'Llama 4',
  '@cf/meta/llama-3-70b-instruct': 'Llama 3.3',
  '@cf/meta/llama-3-8b-instruct': 'Llama 3.1',
  '@cf/meta/llama-2-70b-chat-fp16': 'Llama 2',
  '@cf/google/gemma-3b-it': 'Gemma 3',
  '@cf/mistral/mistral-7b-instruct-v0.2': 'Mistral',
  '@cf/qwq/qwen-72b-chat': 'QwQ',
  '@cf/stabilityai/stable-diffusion-xl-base-1.0': 'SD XL',
  '@cf/stabilityai/stable-diffusion-inpainting': 'SD Inpaint',
  '@cf/stabilityai/stable-diffusion-img2img': 'SD Img2Img',
  // Add more mappings as needed
};

export function ModelSelector() {
  const [models, setModels] = useState<Model[]>([]);
  const [bestModels, setBestModels] = useState<BestModels>({
    'text-to-text': '@cf/meta/llama-4-scout-17b-16e-instruct',
    'text-to-image': '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    'inpainting': '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    'image-to-image': '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  });
  const [selectedModel, setSelectedModel] = useState('@cf/meta/llama-4-scout-17b-16e-instruct');
  const [currentModelType, setCurrentModelType] = useState<string>('text-to-text');
  const [isOpen, setIsOpen] = useState(false);

  // Detect the current operation type based on input
  const detectOperationType = (input: string): string => {
    if (!input) return 'text-to-text';
    
    // Check for image generation commands
    if (input.startsWith('/imagine') || input.startsWith('/img')) {
      return 'text-to-image';
    }
    
    // Check for inpainting (would need to detect if there's an image and text prompt)
    // This is a simplified check - in a real app you'd need more context
    if (input.includes('inpaint') || input.includes('mask')) {
      return 'inpainting';
    }
    
    // Check for image-to-image (would need to detect if there's an image and style transfer request)
    // This is a simplified check - in a real app you'd need more context
    if (input.includes('style') || input.includes('transform image')) {
      return 'image-to-image';
    }
    
    // Default to text-to-text
    return 'text-to-text';
  };

  // Listen for input changes to detect operation type
  useEffect(() => {
    const handleInputChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.input !== undefined) {
        const operationType = detectOperationType(customEvent.detail.input);
        setCurrentModelType(operationType);
        
        // Automatically select the best model for this operation type
        if (bestModels[operationType as keyof BestModels]) {
          setSelectedModel(bestModels[operationType as keyof BestModels]);
        }
      }
    };
    
    window.addEventListener('inputChanged', handleInputChange as EventListener);
    return () => {
      window.removeEventListener('inputChanged', handleInputChange as EventListener);
    };
  }, [bestModels]);

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((response) => {
        // Handle both possible response formats
        let modelsList = Array.isArray(response.data) ? response.data : [];
        
        // Get best models if available
        if (response.bestModels) {
          setBestModels(response.bestModels);
        }
        
        // If no models are available, create default models based on bestModels
        if (modelsList.length === 0 && response.bestModels) {
          const defaultModels: Model[] = [
            {
              id: response.bestModels['text-to-text'],
              name: modelShortNames[response.bestModels['text-to-text']] || 'Text Model',
              type: 'text-to-text'
            },
            {
              id: response.bestModels['text-to-image'],
              name: modelShortNames[response.bestModels['text-to-image']] || 'Image Generation',
              type: 'text-to-image'
            },
            {
              id: response.bestModels['inpainting'],
              name: modelShortNames[response.bestModels['inpainting']] || 'Inpainting',
              type: 'inpainting'
            },
            {
              id: response.bestModels['image-to-image'],
              name: modelShortNames[response.bestModels['image-to-image']] || 'Image to Image',
              type: 'image-to-image'
            }
          ];
          modelsList = defaultModels;
        }
        
        setModels(modelsList);
        
        // Set default model from localStorage or use best model for current type
        const storedModel = window.localStorage.getItem('selectedModel');
        if (storedModel && modelsList.some((m: Model) => m.id === storedModel)) {
          setSelectedModel(storedModel);
          
          // Determine the type of the stored model
          const storedModelData = modelsList.find((m: Model) => m.id === storedModel);
          if (storedModelData?.type) {
            setCurrentModelType(storedModelData.type);
          }
        } else if (bestModels[currentModelType as keyof BestModels]) {
          setSelectedModel(bestModels[currentModelType as keyof BestModels]);
        } else if (modelsList.length > 0) {
          setSelectedModel(modelsList[0].id);
        }
      })
      .catch((error) => {
        console.error('Error fetching models:', error);
        
        // Create default models on error
        const defaultModels: Model[] = [
          {
            id: bestModels['text-to-text'],
            name: modelShortNames[bestModels['text-to-text']] || 'Text Model',
            type: 'text-to-text'
          },
          {
            id: bestModels['text-to-image'],
            name: modelShortNames[bestModels['text-to-image']] || 'Image Generation',
            type: 'text-to-image'
          }
        ];
        
        setModels(defaultModels);
        setSelectedModel(bestModels[currentModelType as keyof BestModels]);
      });
  }, [currentModelType]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setIsOpen(false);
    window.localStorage.setItem('selectedModel', modelId);
    
    // Find the selected model to get its type
    const selectedModelData = models.find(m => m.id === modelId);
    if (selectedModelData?.type) {
      setCurrentModelType(selectedModelData.type);
    }
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('modelChanged', { detail: { model: modelId } }));
  };

  // Group models by type
  const modelsByType: Record<string, Model[]> = {};
  models.forEach(model => {
    if (model.type) {
      if (!modelsByType[model.type]) {
        modelsByType[model.type] = [];
      }
      modelsByType[model.type].push(model);
    }
  });

  const selectedModelName = models.find((m: Model) => m.id === selectedModel)?.name || 
    modelShortNames[selectedModel] || 
    'Select Model';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 text-sm text-neutral-200 hover:text-white transition-colors focus:outline-none"
        aria-label="Select model"
        title={`Current model: ${selectedModelName} (${currentModelType})`}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-72 py-1 bg-[#1c1c1c] rounded-lg shadow-lg border border-[#2a2a2a] z-50 max-h-[70vh] overflow-y-auto">
            {/* Display models grouped by type */}
            {Object.keys(modelsByType).length > 0 ? (
              Object.entries(modelsByType).map(([type, typeModels]) => (
                <div key={type} className="mb-2">
                  <div className="px-4 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-700">
                    {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </div>
                  {typeModels.map((model: Model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2a2a2a] transition-colors flex items-center ${
                        selectedModel === model.id ? 'text-white font-medium bg-[#2a2a2a]' : 'text-neutral-300'
                      }`}
                    >
                      {selectedModel === model.id && (
                        <Check className="mr-2 h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="flex-grow truncate">{model.name}</span>
                      {bestModels[type as keyof BestModels] === model.id && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-[#3b3b3b] text-neutral-300">Best</span>
                      )}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-neutral-400">No models available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 