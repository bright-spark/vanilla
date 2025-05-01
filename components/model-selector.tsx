"use client"

import * as React from 'react';
import { Check, ChevronsUpDown, ChevronDown } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
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
  '@cf/bge/bge-large-en': 'BGE',
  '@cf/mdm/mdm-100': 'MDM100',
  '@cf/resnet/resnet-50': 'ResNet',
  '@cf/openai/whisper': 'Whisper',
  '@cf/stabilityai/stable-diffusion-xl-base-1.0': 'SD XL Base',
  '@cf/facebook/bart-large-cnn': 'Bart',
  // Add more mappings as needed
};

export function ModelSelector() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('@cf/meta/llama-4-scout-17b-16e-instruct');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((response) => {
        // Handle both possible response formats (models or data array)
        const modelsList = Array.isArray(response) ? response : 
                         Array.isArray(response.models) ? response.models :
                         Array.isArray(response.data) ? response.data : [];
        
        setModels(modelsList);
        
        // Set default model from localStorage or use first available model
        const storedModel = window.localStorage.getItem('selectedModel');
        if (storedModel && modelsList.some((m: Model) => m.id === storedModel)) {
          setSelectedModel(storedModel);
        } else if (modelsList.length > 0) {
          setSelectedModel(modelsList[0].id);
        }
      })
      .catch((error) => console.error('Error fetching models:', error));
  }, []);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setIsOpen(false);
    window.localStorage.setItem('selectedModel', modelId);
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('modelChanged', { detail: { model: modelId } }));
  };

  const selectedModelName = models.find((m: Model) => m.id === selectedModel)?.name || 'Claude 3.7 Sonnet';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 text-sm text-neutral-200 hover:text-white transition-colors focus:outline-none"
        aria-label="Select model"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-64 py-1 bg-[#1c1c1c] rounded-lg shadow-lg border border-[#2a2a2a] z-50">
            {models.map((model: Model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2a2a2a] transition-colors ${
                  selectedModel === model.id ? 'text-white font-medium' : 'text-neutral-300'
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 