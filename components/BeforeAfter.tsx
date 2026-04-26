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
    e.stopPropagation();
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

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touchX = e instanceof TouchEvent ? e.touches[0].clientX : e.touches[0].clientX;
    const x = touchX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden rounded-lg cursor-col-resize group bg-slate-900 touch-pan-y"
      onMouseDown={handleMouseDown}
    >
      {/* After Image (Background) */}
      <img src={afterImage} alt="After" className="absolute inset-0 w-full h-full object-contain" draggable={false} />

      {/* Before Image (Foreground clipped) */}
      <img 
        src={beforeImage} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-contain" 
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }} 
        draggable={false} 
      />

      {/* Divider Line */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10 pointer-events-none" 
        style={{ left: `calc(${sliderPosition}% - 1px)` }} 
      />

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-10 cursor-col-resize flex items-center justify-center -ml-5 z-20"
        style={{ left: `${sliderPosition}%` }}
        onTouchStart={handleTouchStart}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-900 transform scale-0 group-hover:scale-100 transition-transform">
          <MoveHorizontal size={16} />
        </div>
      </div>

      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">Original</div>
      <div className="absolute top-2 right-2 bg-indigo-600/80 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">Render</div>
    </div>
  );
};

export default BeforeAfter;