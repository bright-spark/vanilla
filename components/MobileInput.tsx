import React, { useRef } from 'react';
import { X, Send } from 'lucide-react';
import ModelSelector from './ModelSelector';

interface MobileInputProps {
  input: string;
  isLoading: boolean;
  isGeneratingImage: boolean;
  selectedImage: string | null;
  theme: 'light' | 'dark';
  selectedModel: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  adjustTextareaHeight: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onModelChange: (model: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const MobileInput: React.FC<MobileInputProps> = ({
  input,
  isLoading,
  isGeneratingImage,
  selectedImage,
  theme,
  selectedModel,
  handleInputChange,
  handleSubmit,
  adjustTextareaHeight,
  onModelChange,
  textareaRef
}) => {
  const closeModal = () => {
    const mobileInputArea = document.getElementById('mobile-input-area');
    if (mobileInputArea) {
      mobileInputArea.classList.add('hidden');
      mobileInputArea.classList.remove('flex');
    }
  };

  const handleMobileSubmit = (e?: React.FormEvent) => {
    handleSubmit(e);
    closeModal();
  };

  return (
    <div id="mobile-input-area" className="fixed bottom-0 left-0 right-0 hidden sm:hidden md:hidden z-50 transition-all duration-300 transform bg-black bg-opacity-50">
      <div className={`w-full p-4 rounded-t-xl shadow-lg transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1c1c1c]' : 'bg-white'}`}>
        <form onSubmit={handleMobileSubmit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto"></div>
            <button 
              type="button" 
              className="absolute right-4 top-4 text-gray-500"
              onClick={closeModal}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              handleInputChange(e);
              adjustTextareaHeight(e);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleMobileSubmit(e);
              }
            }}
            placeholder="Message..."
            rows={3}
            className="w-full p-3 bg-transparent resize-none outline-none min-h-[80px] max-h-[200px] text-base placeholder-neutral-500 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-300 dark:border-gray-700"
            style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
            disabled={isLoading}
          />
          
          <div className="flex items-center justify-between mt-3">
            <ModelSelector 
              selectedModel={selectedModel} 
              onModelChange={onModelChange} 
            />
            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isLoading || isGeneratingImage}
              className={`rounded-lg transition-colors p-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#f97316] hover:bg-[#ea580c] focus:ring-[#f97316]' : 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-400'}`}
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MobileInput;
