import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (base64: string | null) => void;
  selectedImage: string | null;
  label?: string;
  compact?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, selectedImage, label = "Upload Image", compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onImageSelected(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [onImageSelected]);

  if (selectedImage) {
    return (
      <div className={`relative group w-full ${compact ? 'h-32' : 'h-full'} rounded-lg overflow-hidden border border-slate-600 bg-slate-900`}>
        <img src={selectedImage} alt="Selected" className="w-full h-full object-contain" />
        <button 
          onClick={() => onImageSelected(null)}
          className="absolute top-2 right-2 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full ${compact ? 'h-32' : 'h-full min-h-[200px]'} 
        border-2 border-dashed rounded-lg transition-all cursor-pointer
        ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
        {compact ? <Upload size={24} className="mb-2" /> : <ImageIcon size={48} className="mb-4 opacity-50" />}
        <p className={`text-sm font-medium ${compact ? 'text-xs' : ''}`}>{label}</p>
        {!compact && <p className="text-xs text-slate-500 mt-2">SVG, PNG, JPG</p>}
      </div>
    </div>
  );
};

export default ImageUpload;