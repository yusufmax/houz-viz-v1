
import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import BeforeAfter from './BeforeAfter';

interface FullScreenPreviewProps {
  image: string | null;
  beforeImage?: string;
  onClose: () => void;
}

const FullScreenPreview: React.FC<FullScreenPreviewProps> = ({ image, beforeImage, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur flex flex-col animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-slate-400 font-medium">Preview</h3>
        <div className="flex items-center gap-4">
          <a 
            href={image} 
            download="render-full.png" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Download size={16} /> Download
          </a>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-hidden p-4 flex items-center justify-center">
        {beforeImage ? (
             <div className="w-full h-full max-w-6xl">
                <BeforeAfter beforeImage={beforeImage} afterImage={image} />
             </div>
        ) : (
             <img 
                src={image} 
                alt="Full Screen Preview" 
                className="max-w-full max-h-full object-contain shadow-2xl shadow-black rounded-sm" 
             />
        )}
      </div>
    </div>
  );
};

export default FullScreenPreview;
