'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Sun, Moon } from 'lucide-react';
import { useEnsureInputVisibility } from '../hooks/useEnsureInputVisibility';
import { fetchWithRetry, fetchJsonWithRetry } from '../lib/api';

// Import refactored components
import StatusLED from './StatusLED';
import ModelSelector from './ModelSelector';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import MobileInput from './MobileInput';
import ExportMenu from './ExportMenu';
import EmptyChat from './EmptyChat';

// Define types for API responses
interface ImageGenerationResponse {
  data?: Array<{
    url?: string;
    revised_prompt?: string;
    urls?: Record<string, string>;
  }>;
  url?: string;
  imageUrl?: string;
  error?: {
    message: string;
    type: string;
  };
}

interface ChatResponse {
  id?: string;
  content: string;
  error?: {
    message: string;
    type: string;
  };
}

// Define the message interface
interface ChatMessage {
  id: string;
  role: string;
  content: string;
  isGenerating?: boolean;
}

export default function Chat() {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevError = useRef(false);
  const bgRef = useRef<HTMLDivElement>(null);
  
  // Use custom hook to ensure mobile input visibility
  useEnsureInputVisibility();
  
  // State for model selection
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  
  // State for messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system-0',
      role: 'system',
      content: 'You are a helpful AI assistant.',
    },
  ]);
  
  // State for input
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [statusLED, setStatusLED] = useState<'idle' | 'waiting' | 'error' | 'new-message' | 'recovered'>('idle');
  const [newMsgFlash, setNewMsgFlash] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Scroll to bottom with smooth behavior
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      
      // On mobile, also scroll the top of the message into view
      if (window.innerWidth < 640 && messages.length > 1) {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer && messageContainer.firstElementChild) {
          // Scroll to the top of the message container with a slight offset
          window.scrollTo({
            top: messageContainer.offsetTop - 20,
            behavior: 'smooth'
          });
        }
      }
    }
    
    // Always focus the textarea after messages change
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [messages]);
  
  // Auto-focus the textarea when the component mounts and on various events
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    
    // Set up event listeners to ensure focus is maintained
    const focusTextarea = () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };
    
    // Focus on touch events (for mobile)
    window.addEventListener('touchend', focusTextarea);
    // Focus when window gets focus
    window.addEventListener('focus', focusTextarea);
    // Focus after scrolling stops
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(focusTextarea, 100);
    };
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('touchend', focusTextarea);
      window.removeEventListener('focus', focusTextarea);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);
  
  // Set theme based on user preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);
  
  // Update theme in localStorage and document
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  // Listen for model changes from ModelSelector
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };
  
  // Listen for newChat event to reset chat
  useEffect(() => {
    const handleNewChat = () => {
      setMessages([
        {
          id: 'system-0',
          role: 'system',
          content: 'You are a helpful AI assistant.',
        },
      ]);
      setInput('');
      setSelectedImage(null);
      setIsGeneratingImage(false);
      setError(null);
      setIsLoading(false);
      setStatusLED('idle');
      
      // Focus the textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };
    
    window.addEventListener('newChat', handleNewChat);
    return () => {
      window.removeEventListener('newChat', handleNewChat);
    };
  }, []);
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  
  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Any custom key handling can go here
  };
  
  // Adjust textarea height based on content
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    setInput(textarea.value);
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        
        // Clear the file input
        if (e.target) {
          e.target.value = '';
        }
        
        // Focus the textarea
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if ((!input.trim() && !selectedImage) || isLoading) return;
    
    // Check if it's a text-to-image generation request
    const inputLower = input.trim().toLowerCase();
    const isImageGeneration = inputLower.startsWith('/image') || inputLower.startsWith('/img') || inputLower.startsWith('/imagine');
    
    if (isImageGeneration) {
      // Extract the prompt from the input
      let prompt = '';
      if (inputLower.startsWith('/image')) {
        prompt = input.trim().substring('/image'.length).trim();
      } else if (inputLower.startsWith('/img')) {
        prompt = input.trim().substring('/img'.length).trim();
      } else if (inputLower.startsWith('/imagine')) {
        prompt = input.trim().substring('/imagine'.length).trim();
      }
      
      if (!prompt) {
        setError('Please provide a prompt for image generation.');
        return;
      }
      
      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: input,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsGeneratingImage(true);
      setError(null);
      
      // Add assistant message with loading state
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        isGenerating: true,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      try {
        // Call the API to generate an image
        const response = await fetchJsonWithRetry<ImageGenerationResponse>('/api/image/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
          shouldRetry: (response) => {
            return !response.ok && (response.status >= 500 || response.status === 429);
          },
          shouldRetryOnError: (error) => {
            return error instanceof TypeError || error.name === 'AbortError';
          },
          onRetry: (retryCount, delay, error) => {
            console.log(`Retrying image generation (${retryCount})...`);
            // Update the assistant message to show retry status
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage.role === 'assistant' && lastMessage.isGenerating) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMessage, content: `Generating image... (retry ${retryCount})` },
                ];
              }
              return prev;
            });
          },
          maxRetries: 3,
          initialDelay: 1000,
        });
        
        // Check for errors
        if (response.error) {
          throw new Error(response.error.message || 'Failed to generate image');
        }
        
        // Get the image URL
        let imageUrl = '';
        
        if (response.data && response.data.length > 0) {
          // Handle RedBuilder API response
          const item = response.data[0];
          imageUrl = item.url || '';
          
          // Check if the URL is from the RedBuilder API
          if (imageUrl && !imageUrl.includes('mock-error')) {
            // Update the assistant message with the image
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage.role === 'assistant' && lastMessage.isGenerating) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: `![Generated image](${imageUrl})`,
                    isGenerating: false,
                  },
                ];
              }
              return prev;
            });
          } else {
            throw new Error('Failed to generate image');
          }
        } else if (response.url) {
          // Handle direct URL response
          imageUrl = response.url;
          
          // Update the assistant message with the image
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.role === 'assistant' && lastMessage.isGenerating) {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: `![Generated image](${imageUrl})`,
                  isGenerating: false,
                },
              ];
            }
            return prev;
          });
        } else if (response.imageUrl) {
          // Handle imageUrl property
          imageUrl = response.imageUrl;
          
          // Update the assistant message with the image
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.role === 'assistant' && lastMessage.isGenerating) {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: `![Generated image](${imageUrl})`,
                  isGenerating: false,
                },
              ];
            }
            return prev;
          });
        } else {
          throw new Error('No image URL in response');
        }
      } catch (err) {
        console.error('Error generating image:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate image');
        
        // Update the assistant message with the error
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.role === 'assistant' && lastMessage.isGenerating) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: `Error: ${err instanceof Error ? err.message : 'Failed to generate image'}`,
                isGenerating: false,
              },
            ];
          }
          return prev;
        });
      } finally {
        setIsGeneratingImage(false);
      }
    } else if (selectedImage) {
      // Handle message with image
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: input + (input ? '\n\n' : '') + `![Uploaded image](${selectedImage})`,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setSelectedImage(null);
      setIsLoading(true);
      setError(null);
      
      try {
        // Call the API to send the message with image
        const response = await fetchJsonWithRetry<ChatResponse>('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...messages.filter((msg) => msg.role !== 'system'),
              userMessage,
            ],
            model: selectedModel,
          }),
          shouldRetry: (response) => {
            return !response.ok && (response.status >= 500 || response.status === 429);
          },
          shouldRetryOnError: (error) => {
            return error instanceof TypeError || error.name === 'AbortError';
          },
          onRetry: (retryCount, delay, error) => {
            console.log(`Retrying chat request (${retryCount})...`);
          },
          maxRetries: 3,
          initialDelay: 1000,
        });
        
        // Check for errors
        if (response.error) {
          throw new Error(response.error.message || 'Failed to send message');
        }
        
        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: response.id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content,
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        setNewMsgFlash(true);
        setTimeout(() => setNewMsgFlash(false), 1000);
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle regular text message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: input,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setError(null);
      
      try {
        // Call the API to send the message
        const response = await fetchJsonWithRetry<ChatResponse>('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...messages.filter((msg) => msg.role !== 'system'),
              userMessage,
            ],
            model: selectedModel,
          }),
          shouldRetry: (response) => {
            return !response.ok && (response.status >= 500 || response.status === 429);
          },
          shouldRetryOnError: (error) => {
            return error instanceof TypeError || error.name === 'AbortError';
          },
          onRetry: (retryCount, delay, error) => {
            console.log(`Retrying chat request (${retryCount})...`);
          },
          maxRetries: 3,
          initialDelay: 1000,
        });
        
        // Check for errors
        if (response.error) {
          throw new Error(response.error.message || 'Failed to send message');
        }
        
        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: response.id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content,
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        setNewMsgFlash(true);
        setTimeout(() => setNewMsgFlash(false), 1000);
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setIsLoading(false);
      }
    }
    
    // Focus the textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  
  // Parallax scroll effect for background
  useEffect(() => {
    const handleScroll = () => {
      if (bgRef.current) {
        const scrollY = window.scrollY;
        bgRef.current.style.transform = `translateY(${scrollY * 0.1}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
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
      <EmptyChat
        theme={theme}
        statusLED={statusLED}
        setTheme={setTheme}
        handleSubmit={handleSubmit}
        input={input}
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        isLoading={isLoading}
        isGeneratingImage={isGeneratingImage}
        selectedImage={selectedImage}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />
    );
  }
  
  return (
    <div className={`relative flex flex-col min-h-screen w-screen overflow-x-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-[#171717] text-neutral-50' : 'bg-[#f7f7f7] text-neutral-900'}`}>
      {/* Top right controls: theme toggle, export options, and status LED */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <ExportMenu messages={messages} theme={theme} />
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
      
      {/* Main chat layout - add extra padding at bottom on mobile for the fixed input */}
      <div className="flex flex-col h-full w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-32 mb-24 sm:mb-0">
        <div className="flex flex-col space-y-3 py-4 px-2" id="message-container">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              message.role !== 'system' && (
                <MessageItem
                  key={message.id}
                  message={message}
                  theme={theme}
                  copiedMessageId={copiedMessageId}
                  setCopiedMessageId={setCopiedMessageId}
                />
              )
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Desktop input area */}
      <ChatInput
        input={input}
        isLoading={isLoading}
        isGeneratingImage={isGeneratingImage}
        selectedImage={selectedImage}
        theme={theme}
        selectedModel={selectedModel}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        adjustTextareaHeight={adjustTextareaHeight}
        onModelChange={handleModelChange}
        textareaRef={textareaRef}
      />
      
      {/* Mobile input area */}
      <MobileInput
        input={input}
        isLoading={isLoading}
        isGeneratingImage={isGeneratingImage}
        selectedImage={selectedImage}
        theme={theme}
        selectedModel={selectedModel}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        adjustTextareaHeight={adjustTextareaHeight}
        onModelChange={handleModelChange}
        textareaRef={textareaRef}
      />
      
      {/* Mobile floating action button island in bottom right */}
      <div className="block sm:hidden fixed bottom-20 right-4 z-50 rounded-full shadow-lg overflow-hidden">
        <button
          className={`p-4 flex items-center justify-center ${theme === 'dark' ? 'bg-[#1c1c1c]' : 'bg-white'}`}
          aria-label="New chat"
          onClick={() => window.dispatchEvent(new Event('newChat'))}
          type="button"
        >
          <Plus className="w-8 h-8 text-[#f97316]" />
        </button>
      </div>
    </div>
  );
}
