import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X, FileText } from 'lucide-react';
import PdfPageSelector from './PdfPageSelector';
import { useDesignMode } from '../contexts/DesignModeContext';

interface ImageUploadProps {
  onImageSelected: (base64: string | null) => void;
  selectedImage: string | null;
  label?: string;
  compact?: boolean;
  acceptVideo?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, selectedImage, label = "Upload Image", compact = false, acceptVideo = false }) => {
  const { isApple } = useDesignMode();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (file.type === 'application/pdf') {
      setPdfFile(file);
      // Reset input value to allow re-selecting same file if cancelled
      return;
    }

    if (file.type.startsWith('video/')) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected(reader.result as string);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        alert("Failed to read video file.");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    setIsProcessing(true);
    try {
      // Handle Image
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Calculate new dimensions (max 1920px on longest side)
          const maxSize = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          // Set canvas size and draw compressed image
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression (0.85 quality for JPEG)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          onImageSelected(compressedBase64);
          setIsProcessing(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process file. Please try again.");
      setIsProcessing(false);
    }
  };

  const handlePdfSelect = (base64: string) => {
    onImageSelected(base64);
    setPdfFile(null);
  };

  const handlePdfCancel = () => {
    setPdfFile(null);
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
    const isVideo = selectedImage.startsWith('data:video/');
    return (
      <div className={`relative group w-full ${compact ? 'h-32' : 'h-full'} rounded-lg overflow-hidden border border-slate-600 bg-slate-900`}>
        {isVideo ? (
          <video src={selectedImage} className="w-full h-full object-contain" controls />
        ) : (
          <img src={selectedImage} alt="Selected" className="w-full h-full object-contain" />
        )}
        <button
          onClick={() => onImageSelected(null)}
          className="absolute top-2 right-2 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <>
      {pdfFile && (
        <PdfPageSelector
          file={pdfFile}
          onSelect={handlePdfSelect}
          onCancel={handlePdfCancel}
        />
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full ${compact ? 'h-32' : 'flex-1 min-h-[200px]'} 
          border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
            isApple
              ? (isDragging ? 'border-blue-500 bg-blue-50/80 shadow-md' : 'border-slate-200 hover:border-blue-400 bg-white/70 hover:bg-white shadow-sm')
              : (isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50')
          }`}
      >
        <input
          type="file"
          accept={acceptVideo ? "image/*,application/pdf,video/*" : "image/*,application/pdf"}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        <div className={`flex flex-col items-center justify-center pt-5 pb-6 ${isApple ? 'text-slate-600' : 'text-slate-400'}`}>
          {isProcessing ? (
            <div className="animate-pulse flex flex-col items-center">
              <div className={`h-8 w-8 border-2 ${isApple ? 'border-blue-600' : 'border-indigo-500'} border-t-transparent rounded-full animate-spin mb-2`}></div>
              <span className="text-xs">Processing...</span>
            </div>
          ) : (
            <>
              {compact ? <Upload size={24} className="mb-2" /> : <ImageIcon size={48} className={`mb-4 ${isApple ? 'text-slate-400 stroke-[1.5]' : 'opacity-50'}`} />}
              <p className={`text-sm font-semibold ${compact ? 'text-xs' : ''} ${isApple ? 'text-slate-700' : ''}`}>{label}</p>
              {!compact && <p className={`text-xs ${isApple ? 'text-slate-400' : 'text-slate-500'} mt-2`}>{acceptVideo ? "Images, Videos, or PDF" : "Images or PDF"}</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ImageUpload;