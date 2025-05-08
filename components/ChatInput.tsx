import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import ModelSelector from './ModelSelector';

interface ChatInputProps {
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
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

const ChatInput: React.FC<ChatInputProps> = ({
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
  // Use the provided ref or create a local one if not provided
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = textareaRef || localTextareaRef;

  // Auto-focus the textarea when the component mounts and after any state changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Keep focus on the textarea after any input changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [input]);

  return (
    <>
      {/* Desktop input area */}
      <div 
        className={`fixed bottom-0 left-0 right-0 hidden md:block transition-colors duration-300 ${theme === 'dark' ? 'bg-[#171717]' : 'bg-[#f7f7f7]'}`} 
        style={{ width: 'calc(100vw - 60px)', marginLeft: '60px', zIndex: 10 }}
      >
        <div className="w-full max-w-[800px] mx-auto px-4 pb-6 pt-2">
          <div className={`rounded-xl p-3 shadow-lg transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1c1c1c]' : 'bg-white border border-neutral-200'}`}> 
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
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
                    handleSubmit(e);
                  }
                }}
                placeholder="Message..."
                rows={1}
                className="flex-1 p-3 min-w-0 bg-transparent resize-none outline-none min-h-[44px] max-h-[200px] text-base placeholder-neutral-500 overflow-y-auto whitespace-pre-wrap break-words rounded-lg"
                style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                disabled={isLoading}
              />
              <div className="flex items-center gap-2">
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
      </div>

      {/* Mobile input is now handled by MobileInput.tsx component */}
    </>
  );
};

export default ChatInput;
