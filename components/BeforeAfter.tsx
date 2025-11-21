import React, { useState, useRef, useEffect } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface BeforeAfterProps {
  beforeImage: string;
  afterImage: string;
}

const BeforeAfter: React.FC<BeforeAfterProps> = ({ beforeImage, afterImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // e.stopPropagation(); // Removed to allow scrolling
    setIsDragging(true);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e instanceof MouseEvent ? e.clientX : e.clientX) - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden rounded-lg cursor-col-resize group bg-slate-900 touch-pan-y"
      onMouseDown={handleMouseDown}
    >
      {/* After Image (Background) */}
      <img src={afterImage} alt="After" className="absolute inset-0 w-full h-full object-contain" />

      {/* Before Image (Foreground clipped) */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-white/50"
        style={{ width: `${sliderPosition}%` }}
      >
        <img src={beforeImage} alt="Before" className="absolute inset-0 w-full h-full max-w-none object-contain" style={{ width: containerRef.current?.offsetWidth }} />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-transparent cursor-col-resize flex items-center justify-center"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-900 transform scale-0 group-hover:scale-100 transition-transform">
          <MoveHorizontal size={16} />
        </div>
      </div>

      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10">Original</div>
      <div className="absolute top-2 right-2 bg-indigo-600/80 text-white text-xs px-2 py-1 rounded z-10">Render</div>
    </div>
  );
};

export default BeforeAfter;