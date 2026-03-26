import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadImage, deleteImage } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  productId: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ images, onChange, productId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const path = `products/${productId}/${fileName}`;
      const url = await uploadImage(file, path);
      onChange([...images, url]);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRemove = async (url: string) => {
    try {
      // Extract path from URL if needed, but for simplicity we'll just remove from state
      // In a real app, you'd want to delete from Storage too.
      // Firebase Storage URLs are complex to parse back to paths easily without a helper.
      // For now, we'll just update the state.
      onChange(images.filter((img) => img !== url));
    } catch (err) {
      console.error('Remove error:', err);
      setError('Failed to remove image.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Product Images
        </h3>
        <label className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors
          ${isUploading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'}
        `}>
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          {isUploading ? 'Uploading...' : 'Upload Image'}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <AnimatePresence>
          {images.map((url, index) => (
            <motion.div
              key={url}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800"
            >
              <img
                src={url}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {images.length === 0 && !isUploading && (
          <div className="col-span-full py-8 border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-600">
            <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">No images uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
