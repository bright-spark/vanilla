'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Plus, Send, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSelector } from './model-selector';

// Status LED component
function StatusLED({ status, theme }: { status: 'idle' | 'waiting' | 'error' | 'new-message' | 'recovered', theme: 'light' | 'dark' }) {
  let baseColor, glowColor, gradientStyle;
  
  if (status === 'waiting') {
    // Shiny orange
    baseColor = '#f97316';
    glowColor = 'rgba(249,115,22,0.7)';
    gradientStyle = 'radial-gradient(circle at 30% 30%, #fb923c, #f97316, #ea580c)';
  } else if (status === 'error') {
    // Shiny red
    baseColor = '#dc2626';
    glowColor = 'rgba(220,38,38,0.7)';
    gradientStyle = 'radial-gradient(circle at 30% 30%, #ef4444, #dc2626, #b91c1c)';
  } else if (status === 'new-message') {
    // Shiny blue
    baseColor = '#3b82f6';
    glowColor = 'rgba(59,130,246,0.7)';
    gradientStyle = 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6, #2563eb)';
  } else if (status === 'recovered') {
    // Shiny green
    baseColor = '#22c55e';
    glowColor = 'rgba(34,197,94,0.7)';
    gradientStyle = 'radial-gradient(circle at 30% 30%, #4ade80, #22c55e, #16a34a)';
  } else {
    // Idle: white in dark mode, off-white in light mode
    if (theme === 'dark') {
      baseColor = '#fff';
      glowColor = 'rgba(255,255,255,0.7)';
      gradientStyle = 'radial-gradient(circle at 30% 30%, #fff, #f3f4f6, #d1d5db)';
    } else {
      baseColor = '#f3f4f6';
      glowColor = 'rgba(243,244,246,0.7)';
      gradientStyle = 'radial-gradient(circle at 30% 30%, #f3f4f6, #e5e7eb, #d1d5db)';
    }
  }

  return (
    <motion.div
      className="w-3 h-3 rounded-full"
      animate={{
        opacity: status === 'waiting'
          ? [1, 0.2]
          : status === 'new-message'
          ? [1, 0.1, 1, 0.1, 1]
          : status === 'recovered'
          ? [1, 0.1, 1]
          : 1,
        scale: status === 'waiting' ? [1, 0.85] : 1,
      }}
      transition={{
        repeat:
          status === 'waiting'
            ? Infinity
            : 0,
        repeatType: 'reverse',
        duration:
          status === 'waiting'
            ? 0.8
            : status === 'new-message'
            ? 1.2
            : status === 'recovered'
            ? 0.8
            : 0,
        ease: 'easeInOut',
      }}
      style={{
        background: gradientStyle,
        boxShadow: `0 0 2px ${baseColor}, 0 0 4px ${baseColor}, 0 0 16px ${glowColor}`
      }}
    />
  );
}

export function Chat() {
  const [selectedModel, setSelectedModel] = useState('@cf/meta/llama-4-scout-17b-16e-instruct');
  const [messages, setMessages] = useState([
    {
      id: 'system-0',
      role: 'system',
      content: 'You are a helpful AI assistant.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [newMsgFlash, setNewMsgFlash] = useState(false);
  const [parallax, setParallax] = useState(0);
  const bgRef = useRef<HTMLDivElement>(null);
  const [statusLED, setStatusLED] = useState<'idle' | 'waiting' | 'error' | 'new-message' | 'recovered'>('idle');
  const prevError = useRef(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  useEffect(() => {
    // Only access localStorage in the browser
    const storedModel = window.localStorage.getItem('selectedModel');
    if (storedModel) {
      setSelectedModel(storedModel);
    }

    // Listen for model changes from ModelSelector
    const handleModelChange = (event: CustomEvent) => {
      const newModel = event.detail.model;
      setSelectedModel(newModel);
    };

    window.addEventListener('modelChanged', handleModelChange as EventListener);

    // Listen for newChat event to reset chat
    const handleNewChat = () => {
      setMessages([
        {
          id: 'system-0',
          role: 'system',
          content: 'You are a helpful AI assistant.',
        },
      ]);
      setInput('');
      setIsLoading(false);
      setError(false);
      setNewMsgFlash(false);
    };
    window.addEventListener('newChat', handleNewChat);

    return () => {
      window.removeEventListener('modelChanged', handleModelChange as EventListener);
      window.removeEventListener('newChat', handleNewChat);
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    handleInputChange(e);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    setError(false);
    setNewMsgFlash(true);
    setTimeout(() => setNewMsgFlash(false), 400); // Brief blue flash
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model: selectedModel || '@cf/meta/llama-4-scout-17b-16e-instruct',
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        {
          id: data.id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content,
        },
      ]);
    } catch (error) {
      setError(true);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Parallax scroll effect for message history background
  useEffect(() => {
    const handleScroll = () => {
      // Scroll the background at 60% of the scroll speed
      setParallax(window.scrollY * 0.6);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine if chat is empty (only system message)
  const isEmpty = messages.length === 1 && messages[0].role === 'system';

  // Determine status for LED
  useEffect(() => {
    if (error) {
      setStatusLED('error');
      prevError.current = true;
    } else if (newMsgFlash) {
      setStatusLED('new-message');
    } else if (isLoading) {
      setStatusLED('waiting');
    } else if (prevError.current) {
      setStatusLED('recovered');
      prevError.current = false;
      const timeout = setTimeout(() => setStatusLED('idle'), 800);
      return () => clearTimeout(timeout);
    } else {
      setStatusLED('idle');
    }
  }, [error, newMsgFlash, isLoading]);

  if (isEmpty) {
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
            <span className={`text-5xl md:text-6xl font-serif font-semibold tracking-tight text-center ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>It's, me.</span>
          </div>
          {/* Subtitle */}
          <div className={`text-lg text-center ${theme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'}`}></div>
          {/* Chat card (input area) */}
          <div className="w-full">
            <div className={`rounded-xl p-3 shadow-lg transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1c1c1c]' : 'bg-white border border-neutral-200'}`}> 
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex items-end gap-2">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className={`rounded-lg p-3 transition-colors ${theme === 'dark' ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'}`}> 
                      <Plus className={`w-5 h-5 ${theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-neutral-700'}`} />
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        // Handle file upload here
                        const file = e.target.files?.[0];
                        if (file) {
                          // TODO: Implement file upload handling
                          console.log('File selected:', file);
                        }
                      }}
                    />
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={adjustTextareaHeight}
                    onKeyDown={handleKeyDown}
                    placeholder=""
                    rows={1}
                    className={`flex-1 p-2 min-w-0 bg-transparent resize-none outline-none min-h-[44px] max-h-[200px] text-base placeholder-neutral-500 ${theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'}`}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <ModelSelector />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className={`rounded-lg transition-colors p-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-[#7c4a2d] hover:bg-[#f97316] focus:ring-[#f97316]' : 'bg-orange-200 hover:bg-orange-400 focus:ring-orange-400'}`}
                      style={{ minWidth: 44, minHeight: 44 }}
                    >
                      <Send className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-neutral-800'}`} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#171717] text-neutral-50' : 'bg-[#f7f7f7] text-neutral-900'}`}>
      {/* Top right controls: theme toggle and status LED */}
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

      {/* Message history container */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-[80vw] mx-auto px-2 mr-[64px] pb-24 sm:pb-0">
          <div className="flex flex-col space-y-3 py-4 px-2">
            <AnimatePresence initial={false}>
              {messages.map((message, idx) => (
                message.role !== 'system' && (
                  <motion.div
                    key={message.id}
                    className="flex items-start space-x-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* User avatar for user messages */}
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold shrink-0">
                        M
                      </div>
                    )}
                    <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'ml-0' : 'ml-11'}`}>
                      <div className={`rounded-2xl p-5 text-base transition-colors duration-300 ${
                        message.role === 'assistant'
                          ? theme === 'dark'
                            ? 'bg-[#1c1c1c] text-neutral-100'
                            : 'bg-white text-neutral-900 border border-neutral-200'
                          : theme === 'dark'
                            ? 'bg-[#232323] text-white'
                            : 'bg-[#f3f3f3] text-neutral-900 border border-neutral-200'
                      }`}>
                        <ReactMarkdown
                          className="prose prose-invert max-w-none"
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            code: ({ children }) => <code className="bg-neutral-700/50 rounded px-1">{children}</code>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Mobile fixed input bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 block sm:hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-[#171717]' : 'bg-[#f7f7f7]'}`}>
        <div className="w-full max-w-2xl mx-auto px-2 pb-4 pt-2">
          <div className={`rounded-xl p-3 shadow-lg transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1c1c1c]' : 'bg-white border border-neutral-200'}`}> 
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <label htmlFor="file-upload-chat-mobile" className="cursor-pointer">
                  <div className="rounded-lg hover:bg-neutral-800 p-3 transition-colors">
                    <Plus className="w-5 h-5 text-neutral-400 hover:text-white" />
                  </div>
                  <input
                    id="file-upload-chat-mobile"
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log('File selected:', file);
                      }
                    }}
                  />
                </label>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={adjustTextareaHeight}
                  onKeyDown={handleKeyDown}
                  placeholder=""
                  rows={1}
                  className={`flex-1 p-2 min-w-0 bg-transparent resize-none outline-none min-h-[44px] max-h-[200px] text-base placeholder-neutral-500 ${theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'}`}
                  disabled={isLoading}
                />
                <div className="flex items-center gap-2">
                  <ModelSelector />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="rounded-lg bg-[#7c4a2d] hover:bg-[#f97316] transition-colors p-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Desktop sticky input bar */}
      <div className={`hidden sm:block sticky bottom-0 w-full pb-8 pt-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-t from-[#171717] via-[#171717] to-transparent' : 'bg-gradient-to-t from-[#f7f7f7] via-[#f7f7f7] to-transparent' }`}>
        <div className="w-full max-w-2xl mx-auto px-2">
          <div className={`rounded-xl p-3 shadow-lg transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1c1c1c]' : 'bg-white border border-neutral-200'}`}> 
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <label htmlFor="file-upload-chat" className="cursor-pointer">
                  <div className="rounded-lg hover:bg-neutral-800 p-3 transition-colors">
                    <Plus className="w-5 h-5 text-neutral-400 hover:text-white" />
                  </div>
                  <input
                    id="file-upload-chat"
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      // Handle file upload here
                      const file = e.target.files?.[0];
                      if (file) {
                        // TODO: Implement file upload handling
                        console.log('File selected:', file);
                      }
                    }}
                  />
                </label>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={adjustTextareaHeight}
                  onKeyDown={handleKeyDown}
                  placeholder=""
                  rows={1}
                  className={`flex-1 p-2 min-w-0 bg-transparent resize-none outline-none min-h-[44px] max-h-[200px] text-base placeholder-neutral-500 ${theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'}`}
                  disabled={isLoading}
                />
                <div className="flex items-center gap-2">
                  <ModelSelector />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="rounded-lg bg-[#7c4a2d] hover:bg-[#f97316] transition-colors p-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile new chat button in top left */}
      <button
        className="block sm:hidden fixed top-4 left-4 z-50 bg-transparent p-1 rounded-full focus:outline-none"
        aria-label="New chat"
        onClick={() => window.dispatchEvent(new Event('newChat'))}
        type="button"
      >
        <Plus className="w-6 h-6 text-[#f97316]" />
      </button>
    </div>
  );
} 