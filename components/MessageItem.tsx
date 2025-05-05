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
  );
};

export default MessageItem;
