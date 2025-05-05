import React, { useState } from 'react';
import { Download, Copy, Printer, Mail, Check } from 'lucide-react';

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ExportMenuProps {
  messages: Message[];
  theme: 'light' | 'dark';
}

const ExportMenu: React.FC<ExportMenuProps> = ({ messages, theme }) => {
  const [copiedChat, setCopiedChat] = useState(false);

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

  const handleCopyChat = () => {
    // Copy entire chat to clipboard with error handling
    const chatText = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
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
  };

  const handlePrintToPDF = () => {
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
  };

  const handleEmailAsPDF = () => {
    // Create mailto link with chat content
    const subject = encodeURIComponent('Chat Export');
    const chatText = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    const body = encodeURIComponent(chatText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
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
            onClick={handleCopyChat}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {copiedChat ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedChat ? 'Copied!' : 'Copy to clipboard'}
          </button>
          
          <button
            onClick={handlePrintToPDF}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print to PDF
          </button>
          
          <button
            onClick={handleEmailAsPDF}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Email as PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportMenu;
