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
  // Always keep the input area visible, no need to close it
  const handleMobileSubmit = (e?: React.FormEvent) => {
    handleSubmit(e);
    
    // Re-focus the textarea after submission
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  return (
    <div id="mobile-input-area" className="fixed bottom-0 left-0 right-0 block sm:hidden md:hidden z-[9999] transition-all duration-300 transform">
      <div className={`w-full p-3 shadow-lg transition-colors duration-300 border-t ${theme === 'dark' ? 'bg-[#1c1c1c] border-gray-800' : 'bg-white border-gray-200'}`} style={{ position: 'sticky', bottom: 0 }}>
        <form onSubmit={handleMobileSubmit} className="flex flex-col gap-2">
          {/* No need for the handle and close button since it's always visible */}
          
          <div className="flex items-center gap-2">
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
              rows={1}
              className="flex-1 p-3 bg-transparent resize-none outline-none min-h-[44px] max-h-[120px] text-base placeholder-neutral-500 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-300 dark:border-gray-700"
              style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
              disabled={isLoading}
            />
            
            <div className="flex items-center">
              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isLoading || isGeneratingImage}
                className={`rounded-lg transition-colors p-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#f97316] hover:bg-[#ea580c] focus:ring-[#f97316]' : 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-400'}`}
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MobileInput;
