import React from 'react';
import { Sun, Moon } from 'lucide-react';
import StatusLED from './StatusLED';

interface EmptyChatProps {
  theme: 'light' | 'dark';
  statusLED: 'idle' | 'waiting' | 'error' | 'new-message' | 'recovered';
  setTheme: (theme: 'light' | 'dark') => void;
  handleSubmit: (e?: React.FormEvent) => void;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  isGeneratingImage: boolean;
  selectedImage: string | null;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const EmptyChat: React.FC<EmptyChatProps> = ({
  theme,
  statusLED,
  setTheme,
  handleSubmit,
  input,
  handleInputChange,
  handleKeyDown,
  isLoading,
  isGeneratingImage,
  selectedImage,
  selectedModel,
  onModelChange
}) => {
  return (
    <div className={`flex flex-col items-center justify-center h-full min-h-screen w-full transition-colors duration-300 ${theme === 'dark' ? 'bg-[#171717]' : 'bg-[#f7f7f7]'}`}>
      {/* Top right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <button
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="bg-transparent p-0 m-0 focus:outline-none"
          style={{ boxShadow: 'none', border: 'none' }}
        >
          {theme === 'dark' ? (
            <Sun className="w-6 h-6" style={{ color: '#fff' }} />
          ) : (
            <Moon className="w-6 h-6" style={{ color: '#6b7280' }} />
          )}
        </button>
        <StatusLED status={statusLED} theme={theme} />
      </div>
      {/* Centered stack: greeting, subtitle, input area */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-xl mx-auto px-4 sm:px-0 gap-3">
        {/* Greeting row */}
        <div className="flex flex-row items-center justify-center gap-2 w-full">
          <span className="text-[#f97316] text-6xl">✻</span>
          <span className={`text-5xl md:text-6xl font-serif font-semibold tracking-tight text-center ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>It's me, Kiki.</span>
        </div>
        {/* Subtitle */}
        <p className={`text-lg text-center mb-6 ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>
          I'm a helpful assistant. How can I help you today?
        </p>
        {/* Input area */}
        <div className="w-full max-w-xl">
          <div className={`rounded-xl p-3 shadow-lg transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1c1c1c]' : 'bg-white border border-neutral-200'}`}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    } else {
                      handleKeyDown(e);
                    }
                  }}
                  placeholder="Message..."
                  rows={1}
                  className={`flex-1 p-2 min-w-0 bg-transparent resize-none outline-none min-h-[44px] max-h-[200px] text-base placeholder-neutral-500 overflow-y-auto whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'}`}
                  style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                  disabled={isLoading}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={(!input.trim() && !selectedImage) || isLoading || isGeneratingImage}
                    className={`rounded-lg transition-colors p-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#7c4a2d] hover:bg-[#f97316] focus:ring-[#f97316]' : 'bg-orange-200 hover:bg-orange-400 focus:ring-orange-400'}`}
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <svg 
                      className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-neutral-800'}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M14 5l7 7m0 0l-7 7m7-7H3" 
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyChat;
