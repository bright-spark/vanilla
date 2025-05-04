'use client';

import { useState, useRef } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (imageUrl: string) => void;
}

export function ImageUpload({ onImageSelected }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the image
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error uploading image');
      }

      const data = await response.json();
      
      // Check if the response contains an image URL
      if (data.data && data.data[0] && data.data[0].url) {
        onImageSelected(data.data[0].url);
      } else if (data.url) {
        onImageSelected(data.url);
      } else {
        throw new Error('No image URL in response');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      setError(error.message || 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="rounded-lg bg-[#1c1c1c] hover:bg-[#2c2c2c] transition-colors p-3 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        style={{ minWidth: 44, minHeight: 44 }}
        title="Upload image"
      >
        <ImageIcon className="w-5 h-5 text-white" />
      </button>

      {isUploading && (
        <div className="absolute -top-10 left-0 bg-[#2c2c2c] text-white px-3 py-1 rounded-md text-sm">
          Uploading...
        </div>
      )}

      {error && (
        <div className="absolute -top-10 left-0 bg-red-600 text-white px-3 py-1 rounded-md text-sm">
          {error}
        </div>
      )}

      {preview && (
        <div className="absolute -top-32 left-0 w-28 h-28 bg-[#2c2c2c] rounded-md overflow-hidden">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={clearPreview}
            className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
