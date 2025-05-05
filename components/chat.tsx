'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Send, Sun, Moon, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
  role: string; // Allow any string role
  content: string;
  isGenerating?: boolean;
}

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

export default function Chat() {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevError = useRef(false);
  const bgRef = useRef<HTMLDivElement>(null);
  
  // State for model selection
  const [selectedModel, setSelectedModel] = useState('@cf/meta/llama-4-scout-17b-16e-instruct');
  
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
  
  // State for loading
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // State for error
  const [error, setError] = useState(false);
  
  // State for theme
  const [theme, setTheme] = useState<'light' | 'dark'>(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  // State for status LED
  const [statusLED, setStatusLED] = useState<'idle' | 'waiting' | 'error' | 'new-message' | 'recovered'>('idle');
  
  // State for new message flash
  const [newMsgFlash, setNewMsgFlash] = useState(false);
  
  // State for parallax effect
  const [parallax, setParallax] = useState(0);
  
  // State for selected image
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // State for copy functionality
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copiedChat, setCopiedChat] = useState(false);

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

  // Focus the textarea on component mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Effect to scroll to the top of new message replies
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Find the last assistant message
      const lastAssistantMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'assistant');
      
      if (lastAssistantMessageIndex !== -1) {
        // Get the actual index in the original array
        const messageIndex = messages.length - 1 - lastAssistantMessageIndex;
        
        // Find all message elements
        const messageElements = document.querySelectorAll('#message-container > div > div');
        
        // If we found the message element, scroll it into view
        if (messageElements[messageIndex]) {
          messageElements[messageIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Fallback to scrolling to the end
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // If no assistant message, scroll to the end
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
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

    // Force close any open side menu - more robust implementation
    try {
      const sideMenu = document.querySelector('.side-menu');
      const sideMenuOverlay = document.querySelector('.side-menu-overlay');
      
      if (sideMenu) {
        sideMenu.classList.remove('open');
      }
      
      if (sideMenuOverlay) {
        sideMenuOverlay.classList.remove('visible');
      }
      
      // Also try to dispatch a custom event to ensure sidebar closes
      window.dispatchEvent(new CustomEvent('closeSidebar'));
    } catch (e) {
      console.error('Error closing sidebar:', e);
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
      
      // Create a message showing the image generation request with a loading placeholder
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: `Generating image from prompt: "${prompt}"`,
        isGenerating: true // Flag to indicate this message is in generating state
      };
      
      // Add the message to the chat
      setMessages([...messages, userMessage]);
      setInput('');
      
      // Set loading state
      setIsGeneratingImage(true);
      
      // Call the image generation API with retry mechanism
      try {
        const data = await fetchJsonWithRetry<ImageGenerationResponse>('/api/image/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          maxRetries: 3,
          initialDelay: 1000,
          backoffFactor: 1.5,
          // Only retry on network errors or 5xx server errors
          shouldRetry: (response) => response.status >= 500 || !response.ok,
          shouldRetryOnError: (error) => {
            // Retry on network errors (like connection refused)
            return error.name === 'TypeError' || error.message.includes('network') || error.message.includes('connection');
          },
          // Show retry status to the user
          onRetry: (retryCount, delay, error) => {
            console.log(`Retrying image generation (${retryCount}/3) after ${delay}ms delay...`);
            // Update the user message to show retry status
            setMessages(msgs => msgs.map(msg => 
              msg.isGenerating ? { 
                ...msg, 
                content: `Generating image from prompt: "${prompt}" (Retry ${retryCount}/3 - ${error ? error.message : 'Server error'})` 
              } : msg
            ));
          }
        });
        
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
        
        // Check if it's a mock error URL, but NOT from the RedBuilder API
        const isMockUrl = imageUrl.includes('mock-error') && !imageUrl.includes('api.redbuilder.io');
        if (isMockUrl) {
          console.log('Detected mock URL, using fallback');
          // Instead of throwing an error, we'll use a placeholder
          imageUrl = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3Qgd2lkdGg9IjkwJSIgaGVpZ2h0PSI5MCUiIHg9IjUlIiB5PSI1JSIgZmlsbD0iI2UwZTBlMCIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjMwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMzMzIj5JbWFnZSBHZW5lcmF0aW9uPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM1NTUiPkZhbGxiYWNrIHBsYWNlaG9sZGVyPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM3NzciPiR7cHJvbXB0LnN1YnN0cmluZygwLCAzMCl9JHtwcm9tcHQubGVuZ3RoID4gMzAgPyAnLi4uJyA6ICcnfTwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjcwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5EZXZlbG9wbWVudCBtb2RlPC90ZXh0Pjwvc3ZnPg==`;
        }
        
        // First, remove the isGenerating flag from the user message
        setMessages(msgs => msgs.map(msg => 
          msg.isGenerating ? { ...msg, isGenerating: false } : msg
        ));
        
        // Then add the generated image as an assistant message
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
        
        // First, remove the isGenerating flag from the user message
        setMessages(msgs => msgs.map(msg => 
          msg.isGenerating ? { ...msg, isGenerating: false } : msg
        ));
        
        // Then add the error message
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
        
        // Focus the textarea after image generation is complete
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100);
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
        
        // Make API request with the image using retry mechanism
        const data = await fetchJsonWithRetry<ChatResponse>('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, {
              role: 'user',
              content: input || 'What do you see in this image?'
            }],
            model: selectedModel || '@cf/meta/llama-4-scout-17b-16e-instruct',
          }),
          maxRetries: 3,
          initialDelay: 1000,
          backoffFactor: 1.5,
          shouldRetry: (response) => response.status >= 500 || !response.ok,
          shouldRetryOnError: (error) => {
            return error.name === 'TypeError' || error.message.includes('network') || error.message.includes('connection');
          },
          onRetry: (retryCount, delay, error) => {
            console.log(`Retrying chat with image (${retryCount}/3) after ${delay}ms delay...`);
            // Show retry status in UI if needed
          }
        });
        
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
        
        // Focus the textarea after submission
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100);
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
      // Use retry mechanism for regular chat messages
      const data = await fetchJsonWithRetry<ChatResponse>('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model: selectedModel || '@cf/meta/llama-4-scout-17b-16e-instruct',
        }),
        maxRetries: 3,
        initialDelay: 1000,
        backoffFactor: 1.5,
        shouldRetry: (response) => response.status >= 500 || !response.ok,
        shouldRetryOnError: (error) => {
          return error.name === 'TypeError' || error.message.includes('network') || error.message.includes('connection');
        },
        onRetry: (retryCount, delay, error) => {
          console.log(`Retrying chat (${retryCount}/3) after ${delay}ms delay...`);
          // Show retry status to the user
          setStatusLED('waiting');
          // We could update a message here to show retry status if desired
        }
      });
        
      setMessages(msgs => [
        ...msgs,
        {
          id: data.id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || 'Sorry, I encountered an error processing your request.',
        },
      ]);
    } catch (error) {
      setError(true);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
      
      // Focus the textarea after submission
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
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
                    placeholder="Message..."
                    rows={1}
                    className={`flex-1 p-2 min-w-0 bg-transparent resize-none outline-none min-h-[44px] max-h-[200px] text-base placeholder-neutral-500 overflow-y-auto whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-neutral-50' : 'text-neutral-900'}`}
                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <ModelSelector />
                    <button
                      type="button"
                      onClick={handleSubmit}
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
    <div className={`relative flex flex-col min-h-screen w-screen overflow-x-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-[#171717] text-neutral-50' : 'bg-[#f7f7f7] text-neutral-900'}`}>
      {/* Top right controls: theme toggle, export options, and status LED */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <div className="relative group">
          <button
            aria-label="Export chat"
            className="bg-transparent p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none"
            title="Export chat"
          >
            <Download className="w-5 h-5" style={{ color: theme === 'dark' ? '#fff' : '#6b7280' }} />
          </button>
          
          {/* Dropdown menu for export options */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-50 scale-0 group-hover:scale-100 origin-top-right transition-transform duration-150 ease-in-out">
            <div className="py-1">
              <button
                onClick={() => {
                  // Copy entire chat to clipboard with error handling
                  const chatText = messages
                    .filter(msg => msg.role !== 'system')
                    .map(msg => `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
                    .join('\n\n');
                  
                  // Use a fallback approach for clipboard operations
                  const copyToClipboard = async (text: string) => {
                    try {
                      // Try the modern Clipboard API first
                      await navigator.clipboard.writeText(text);
                      return true;
                    } catch (err) {
                      // If Clipboard API fails, try the older execCommand approach
                      try {
                        const textArea = document.createElement('textarea');
                        textArea.value = text;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        const success = document.execCommand('copy');
                        document.body.removeChild(textArea);
                        return success;
                      } catch (execErr) {
                        console.error('Fallback clipboard method failed:', execErr);
                        return false;
                      }
                    }
                  };
                  
                  // Attempt to copy and handle the result
                  copyToClipboard(chatText).then(success => {
                    if (success) {
                      setCopiedChat(true);
                      setTimeout(() => setCopiedChat(false), 2000);
                    } else {
                      alert('Unable to copy to clipboard. Your browser may be blocking this feature.');
                    }
                  }).catch(err => {
                    console.error('Failed to copy chat:', err);
                    alert('Unable to copy to clipboard. Your browser may be blocking this feature.');
                  });
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                {copiedChat ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedChat ? 'Copied!' : 'Copy to clipboard'}
              </button>
              
              <button
                onClick={() => {
                  // Print chat as PDF
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    const chatHtml = `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Chat Export</title>
                        <style>
                          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                          .message { margin-bottom: 20px; padding: 15px; border-radius: 10px; }
                          .user { background-color: #f0f0f0; margin-left: 50px; }
                          .assistant { background-color: #f9f9f9; margin-right: 50px; }
                          h4 { margin-top: 0; color: #555; }
                          .timestamp { color: #888; font-size: 12px; margin-top: 5px; }
                        </style>
                      </head>
                      <body>
                        <h2>Chat Export - ${new Date().toLocaleString()}</h2>
                        ${messages
                          .filter(msg => msg.role !== 'system')
                          .map(msg => `
                            <div class="message ${msg.role}">
                              <h4>${msg.role === 'user' ? 'You' : 'Assistant'}</h4>
                              <div>${msg.content.replace(/\n/g, '<br>')}</div>
                            </div>
                          `).join('')}
                      </body>
                      </html>
                    `;
                    printWindow.document.write(chatHtml);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                    }, 500);
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print to PDF
              </button>
              
              <button
                onClick={() => {
                  // Create mailto link with chat content
                  const subject = encodeURIComponent('Chat Export');
                  const chatText = messages
                    .filter(msg => msg.role !== 'system')
                    .map(msg => `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
                    .join('\n\n');
                  const body = encodeURIComponent(chatText);
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email as PDF
              </button>
            </div>
          </div>
        </div>
        
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
      <div className="flex-1 flex flex-col items-center" style={{ width: 'calc(100vw - 60px)', marginLeft: '60px', zIndex: 0 }}>
        <div className="w-full max-w-[800px] mx-auto px-4 pb-32 md:pb-24">
          <div className="flex flex-col space-y-3 py-4 px-2" id="message-container">
            <AnimatePresence initial={false}>
              {messages.map((message, idx) => (
                message.role !== 'system' && (
                  <motion.div
                    key={message.id}
                    className="flex items-start"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* No user avatar - more minimal look */}
                    <div className="flex-1 max-w-full">
                      <div className={`relative rounded-2xl p-5 text-base transition-colors duration-300 ${
                        message.role === 'assistant'
                          ? theme === 'dark'
                            ? 'bg-[#1c1c1c] text-neutral-100 w-full'
                            : 'bg-white text-neutral-900 border border-neutral-200 w-full'
                          : theme === 'dark'
                            ? 'bg-[#232323] text-white w-[85%] ml-auto' /* User messages aligned to right */
                            : 'bg-[#f3f3f3] text-neutral-900 border border-neutral-200 w-[85%] ml-auto' /* User messages aligned to right */
                      }`}>
                        {/* Copy button for assistant messages */}
                        {message.role === 'assistant' && (
                          <button 
                            onClick={() => {
                              // Copy message content to clipboard with error handling
                              try {
                                // Use a fallback approach for clipboard operations
                                const copyToClipboard = async (text: string) => {
                                  try {
                                    // Try the modern Clipboard API first
                                    await navigator.clipboard.writeText(text);
                                    return true;
                                  } catch (err) {
                                    // If Clipboard API fails, try the older execCommand approach
                                    try {
                                      const textArea = document.createElement('textarea');
                                      textArea.value = text;
                                      textArea.style.position = 'fixed';
                                      textArea.style.left = '-999999px';
                                      textArea.style.top = '-999999px';
                                      document.body.appendChild(textArea);
                                      textArea.focus();
                                      textArea.select();
                                      const success = document.execCommand('copy');
                                      document.body.removeChild(textArea);
                                      return success;
                                    } catch (execErr) {
                                      console.error('Fallback clipboard method failed:', execErr);
                                      return false;
                                    }
                                  }
                                };
                                
                                // Attempt to copy and handle the result
                                copyToClipboard(message.content).then(success => {
                                  if (success) {
                                    // Set copied state for this message
                                    setCopiedMessageId(message.id);
                                    // Reset after 2 seconds
                                    setTimeout(() => setCopiedMessageId(null), 2000);
                                  } else {
                                    // Show a notification that copying failed
                                    alert('Unable to copy to clipboard. Your browser may be blocking this feature.');
                                  }
                                });
                              } catch (err) {
                                console.error('Copy operation failed:', err);
                                alert('Unable to copy to clipboard. Your browser may be blocking this feature.');
                              }
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full opacity-50 hover:opacity-100 transition-opacity bg-gray-100 dark:bg-gray-800"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {message.isGenerating ? (
                          <div className="flex flex-col items-center justify-center p-4">
                            <div className="relative w-16 h-16 mb-4">
                              <div className="absolute inset-0 border-4 border-t-[#f97316] border-r-[#f97316] border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-medium">Generating...</p>
                              <p className="text-sm opacity-70 mt-1">Creating your image, please wait</p>
                            </div>
                          </div>
                        ) : (
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
                        )}
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

      {/* Input area at the bottom - desktop version */}
      <div className={`fixed bottom-0 left-0 right-0 hidden md:block transition-colors duration-300 ${theme === 'dark' ? 'bg-[#171717]' : 'bg-[#f7f7f7]'}`} style={{ width: 'calc(100vw - 60px)', marginLeft: '60px', zIndex: 10 }}>
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
                <ModelSelector />
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
      
      {/* Mobile floating action button island */}
      <div className="fixed bottom-6 right-6 hidden sm:flex md:hidden z-50">
        <button
          onClick={() => {
            // Show the mobile input modal
            const mobileInputArea = document.getElementById('mobile-input-area');
            if (mobileInputArea) {
              mobileInputArea.classList.remove('hidden');
              mobileInputArea.classList.add('flex');
              setTimeout(() => {
                textareaRef.current?.focus();
              }, 100);
            }
          }}
          className={`rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-colors ${theme === 'dark' ? 'bg-[#f97316]' : 'bg-orange-500'}`}
        >
          <Plus className="w-8 h-8 text-white" />
        </button>
      </div>
      
      {/* Mobile slide-up input area */}
      <div id="mobile-input-area" className="fixed bottom-0 left-0 right-0 hidden sm:hidden md:hidden z-50 transition-all duration-300 transform bg-black bg-opacity-50">
        <div className={`w-full p-4 rounded-t-xl shadow-lg transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1c1c1c]' : 'bg-white'}`}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto"></div>
              <button 
                type="button" 
                className="absolute right-4 top-4 text-gray-500"
                onClick={() => {
                  const mobileInputArea = document.getElementById('mobile-input-area');
                  if (mobileInputArea) {
                    mobileInputArea.classList.add('hidden');
                    mobileInputArea.classList.remove('flex');
                  }
                }}
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
                  handleSubmit(e);
                  
                  // Close the mobile input area after sending
                  const mobileInputArea = document.getElementById('mobile-input-area');
                  if (mobileInputArea) {
                    mobileInputArea.classList.add('hidden');
                    mobileInputArea.classList.remove('flex');
                  }
                }
              }}
              placeholder="Message..."
              rows={3}
              className="w-full p-3 bg-transparent resize-none outline-none min-h-[80px] max-h-[200px] text-base placeholder-neutral-500 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-300 dark:border-gray-700"
              style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
              disabled={isLoading}
            />
            
            <div className="flex items-center justify-between mt-3">
              <ModelSelector />
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
