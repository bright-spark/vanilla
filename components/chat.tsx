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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
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
      setSelectedImage(null);
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
    const newInput = e.target.value;
    setInput(newInput);
    
    // Dispatch event for model selector to detect operation type
    window.dispatchEvent(new CustomEvent('inputChanged', { detail: { input: newInput } }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && (input.trim() || selectedImage)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    handleInputChange(e);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      console.error('Please select an image file');
      return;
    }
    
    try {
      // Create a temporary preview of the image using FileReader
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          const imageUrl = event.target.result as string;
          console.log('Image preview created');
          
          // Create a user message with the image
          const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: `![Uploaded Image](${imageUrl})`,
          };
          
          // Add the message to the chat
          setMessages(prevMessages => [...prevMessages, userMessage]);
        }
      };
      
      // Start reading the file as a data URL
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Image upload error:', error);
    } finally {
      // Clear the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || (!input.trim() && !selectedImage)) return;

    // Force close any open side menu
    const sideMenu = document.querySelector('.side-menu');
    const sideMenuOverlay = document.querySelector('.side-menu-overlay');
    
    if (sideMenu && sideMenu.classList.contains('open')) {
      sideMenu.classList.remove('open');
      if (sideMenuOverlay) {
        sideMenuOverlay.classList.remove('visible');
      }
    }

    setIsLoading(true);
    setError(false);
    setStatusLED('waiting');
    setTimeout(() => setNewMsgFlash(false), 400); // Brief blue flash
    
    // Check if this is a text-to-image generation request
    if (input.trim().startsWith('/imagine ') || input.trim().startsWith('/img ')) {
      // Extract the prompt
      const prompt = input.trim().replace(/^\/imagine\s+/, '').replace(/^\/img\s+/, '');
      if (!prompt) {
        setIsLoading(false);
        return;
      }
      
      // Create a message showing the image generation request
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: `Generating image from prompt: "${prompt}"`,
      };
      
      // Add the message to the chat
      setMessages([...messages, userMessage]);
      setInput('');
      
      // Set loading state
      setIsGeneratingImage(true);
      
      // Call the image generation API
      try {
        const res = await fetch('/api/image/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message || 'Error generating image');
        
        // Get the image URL - handle different response formats
        let imageUrl = '';
        
        // Check for different response formats
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          // Standard OpenAI format
          imageUrl = data.data[0].url || '';
        } else if (data.url) {
          // Direct URL format
          imageUrl = data.url;
        } else if (data.imageUrl) {
          // Custom format with imageUrl field
          imageUrl = data.imageUrl;
        }
        
        console.log('Extracted image URL:', imageUrl ? `${imageUrl.substring(0, 30)}...` : 'none');
        
        if (!imageUrl) {
          console.error('No image URL found in response:', data);
          throw new Error('No image URL in response');
        }
        
        // Check if it's a mock error URL
        const isMockUrl = imageUrl.includes('mock-error') || imageUrl.includes('api.redbuilder.io');
        if (isMockUrl) {
          console.log('Detected mock URL, using fallback');
          // Instead of throwing an error, we'll use a placeholder
          imageUrl = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3Qgd2lkdGg9IjkwJSIgaGVpZ2h0PSI5MCUiIHg9IjUlIiB5PSI1JSIgZmlsbD0iI2UwZTBlMCIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjMwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMzMzIj5JbWFnZSBHZW5lcmF0aW9uPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM1NTUiPkZhbGxiYWNrIHBsYWNlaG9sZGVyPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM3NzciPiR7cHJvbXB0LnN1YnN0cmluZygwLCAzMCl9JHtwcm9tcHQubGVuZ3RoID4gMzAgPyAnLi4uJyA6ICcnfTwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjcwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5EZXZlbG9wbWVudCBtb2RlPC90ZXh0Pjwvc3ZnPg==`;
        }
        
        // Check if it's an R2 storage URL
        if (imageUrl.includes('/images/') && !imageUrl.startsWith('data:')) {
          console.log('Detected R2 storage URL');
          // Make sure the URL is properly formatted for our environment
          if (!imageUrl.startsWith('http')) {
            // If it's a relative path, convert to absolute
            imageUrl = `http://localhost:8787${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          }
        }
        
        // Add the generated image as an assistant message
        setMessages(msgs => [
          ...msgs,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `Here's the image I generated from your prompt: "${prompt}"\n\n![Generated Image](${imageUrl})`,
          },
        ]);
      } catch (error: any) {
        console.error('Image generation error:', error);
        setMessages(msgs => [
          ...msgs,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I couldn't generate an image from that prompt. Error: ${error.message}`,
          },
        ]);
      } finally {
        setIsGeneratingImage(false);
        setIsLoading(false);
      }
      
      return;
    }
    
    // If there's a selected image, add it to the message
    if (selectedImage) {
      console.log('Adding image to message:', selectedImage.substring(0, 50) + '...');
      
      // Create a message with the image URL
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: input.trim() ? `${input}\n\n![Image](${selectedImage})` : `![Image](${selectedImage})`,
      };
      
      // Add the user message with the image
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setSelectedImage(null);
      
      try {
        // For data URLs, we'll just include the image in the message content as markdown
        // This avoids sending large data URLs in the JSON payload
        const isDataUrl = selectedImage.startsWith('data:');
        
        // Make API request with the image
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, {
              role: 'user',
              content: input || 'What do you see in this image?'
            }],
            model: selectedModel || '@cf/meta/llama-4-scout-17b-16e-instruct',
          }),
        });
        
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        setMessages(msgs => [
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
        setSelectedImage(null);
      }
      
      return;
    }
    
    // Regular text message
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
      if (!res.ok) {
        console.error(`API error: ${res.status} ${res.statusText}`);
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      
      try {
        const data = await res.json();
        
        setMessages(msgs => [
          ...msgs,
          {
            id: data.id || `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.content || 'Sorry, I encountered an error processing your request.',
          },
        ]);
      } catch (jsonError) {
        console.error('Error parsing API response:', jsonError);
        setMessages(msgs => [
          ...msgs,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, I encountered an error processing your request. The API response could not be parsed.',
          },
        ]);
      }
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
            <span className={`text-5xl md:text-6xl font-serif font-semibold tracking-tight text-center ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>It's me, Kiki.</span>
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
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      // Use handleInputChange to ensure the event is dispatched
                      handleInputChange(e);
                      adjustTextareaHeight(e);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      } else {
                        handleKeyDown(e);
                      }
                    }}
                    placeholder="Type your message..."
                    rows={1}
                    className={`flex-1 p-2 min-w-0 bg-transparent resize-none outline-none min-h-[44px] max-h-[200px] text-base placeholder-neutral-500 overflow-y-auto whitespace-normal break-words ${theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'}`}
                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <ModelSelector />
                    <button
                      type="submit"
                      disabled={(!input.trim() && !selectedImage) || isLoading || isGeneratingImage}
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
        <div className="w-full max-w-3xl mx-auto px-4 pb-24 sm:pb-0">
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
                    <div className={`flex-1 max-w-full sm:max-w-[85%] ${message.role === 'user' ? 'ml-0' : 'ml-11'}`}>
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
                          className="prose prose-invert max-w-none break-words whitespace-pre-wrap"
                          components={{
                            p: ({ node, children, ...props }) => <div className="mb-2 last:mb-0 break-words whitespace-pre-wrap" {...props}>{children}</div>,
                            code: ({ children }) => <code className="bg-neutral-700/50 rounded px-1 break-words whitespace-pre-wrap">{children}</code>,
                            img: ({ node, ...props }) => {
                              // Check if src is empty or undefined
                              if (!props.src || props.src === '') {
                                return (
                                  <div className="flex items-center justify-center w-full h-[200px] bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
                                    <span className="text-gray-500 dark:text-gray-400">Image not available</span>
                                  </div>
                                );
                              }
                              
                              return (
                                <img
                                  {...props}
                                  className="max-w-full rounded-lg my-2 max-h-[300px] object-contain"
                                  alt={props.alt || 'Image'}
                                  onError={(e) => {
                                    // Replace broken images with a placeholder
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzMzMyI+SW1hZ2UgbG9hZCBlcnJvcjwvdGV4dD48L3N2Zz4=';
                                  }}
                                />
                              );
                            },
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
                    accept="image/*"
                    onChange={handleFileUpload}
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
                    disabled={(!input.trim() && !selectedImage) || isLoading || isGeneratingImage}
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
                    accept="image/*"
                    onChange={handleFileUpload}
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
                    disabled={(!input.trim() && !selectedImage) || isLoading || isGeneratingImage}
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
