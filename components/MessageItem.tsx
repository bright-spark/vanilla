import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';

interface MessageItemProps {
  message: {
    id: string;
    role: string;
    content: string;
    isGenerating?: boolean;
  };
  theme: 'light' | 'dark';
  copiedMessageId: string | null;
  setCopiedMessageId: (id: string | null) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  theme, 
  copiedMessageId, 
  setCopiedMessageId 
}) => {
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

  const handleCopy = () => {
    try {
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
  };

  if (message.role === 'system') return null;

  return (
    <motion.div
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
              onClick={handleCopy}
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
                  
                  // State to track image loading status
                  const [isLoading, setIsLoading] = React.useState(true);
                  const [hasError, setHasError] = React.useState(false);
                  const [imgSrc, setImgSrc] = React.useState(props.src);
                  
                  // Function to handle image load errors
                  const handleImageError = () => {
                    console.error(`Failed to load image: ${imgSrc}`);
                    setHasError(true);
                    setIsLoading(false);
                    
                    // Try to fix the URL if it's from RedBuilder API
                    if (imgSrc.includes('api.redbuilder.io')) {
                      // Extract the filename from the URL
                      const urlParts = imgSrc.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      
                      // Use a more reliable URL format
                      const newSrc = `https://multi.redbuilder.io/generations/${filename}`;
                      console.log(`Trying alternative URL: ${newSrc}`);
                      setImgSrc(newSrc);
                      setHasError(false);
                    }
                  };
                  
                  return (
                    <>
                      {isLoading && (
                        <div className="flex items-center justify-center w-full h-[200px] bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
                          <div className="animate-pulse flex space-x-2">
                            <div className="h-3 w-3 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                            <div className="h-3 w-3 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                            <div className="h-3 w-3 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                          </div>
                        </div>
                      )}
                      {hasError && (
                        <div className="flex flex-col items-center justify-center w-full h-[200px] bg-gray-100 dark:bg-gray-800 rounded-lg my-2 p-4">
                          <span className="text-red-500 dark:text-red-400 font-medium mb-2">Image load error</span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm text-center">
                            Unable to load image from URL:<br/>
                            <code className="text-xs break-all">{imgSrc}</code>
                          </span>
                        </div>
                      )}
                      <img
                        {...props}
                        src={imgSrc}
                        className={`max-w-full rounded-lg my-2 max-h-[300px] object-contain ${isLoading ? 'hidden' : ''} ${hasError ? 'hidden' : ''}`}
                        alt={props.alt || 'Generated image'}
                        onLoad={() => setIsLoading(false)}
                        onError={handleImageError}
                      />
                    </>
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
  );
};

export default MessageItem;
