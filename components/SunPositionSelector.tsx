import React, { useRef, useEffect, useState } from 'react';
import { Sun, RotateCw } from 'lucide-react';

interface SunPositionSelectorProps {
    value: number; // 0-360, default typically 135 or similar if null
    onChange: (angle: number) => void;
}

const SunPositionSelector: React.FC<SunPositionSelectorProps> = ({ value, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleInteraction = (e: MouseEvent | TouchEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;

        // Calculate angle in degrees
        // atan2(y, x) gives radians. 0 is drag right (East).
        // specific mapping: we want 0 to be Top (North).
        // standard atan2: 0 = right, 90 = down, 180 = left, -90 = up.

        // Let's standard: 
        // 0 deg = North (Top)
        // 90 deg = East (Right) 
        // 180 deg = South (Bottom)
        // 270 deg = West (Left)

        // atan2(dx, -dy) should give 0 at top?
        // atan2(0, -1) -> 0? Wait.
        // x=0, y=-1 (Top). atan2(0, -1)?? No, usually atan2(y, x).
        // atan2(-1, 0) = -PI/2 = -90 deg.

        let angleRad = Math.atan2(deltaY, deltaX);
        let angleDeg = angleRad * (180 / Math.PI);

        // Convert to 0-360 where 0 is North (Top)
        // current: 0 = Right (East).
        // Target: 0 = Top.
        // So we add 90 degrees.
        angleDeg += 90;

        if (angleDeg < 0) angleDeg += 360;

        onChange(Math.round(angleDeg));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        // Cast to native event for shared handler logic if needed, or just call directly
        // But handleInteraction expects global MouseEvent for coordinates
        // Actually react event has clientX too.

        // Just triggering the set state, actual move handled by window listener
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) handleInteraction(e);
        };
        const onMouseUp = () => {
            setIsDragging(false);
        };
        const onTouchMove = (e: TouchEvent) => {
            if (isDragging) handleInteraction(e);
        };

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onMouseUp);
        };
    }, [isDragging]);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Sun size={12} className="text-yellow-500" />
                Sun Position
            </div>

            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onTouchStart={() => setIsDragging(true)}
                className="w-24 h-24 rounded-full border-2 border-slate-700 bg-slate-900 relative cursor-pointer hover:border-indigo-500/50 transition-colors shadow-inner"
            >
                {/* Compass Markers */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-600 pointer-events-none">N</div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-600 pointer-events-none">S</div>
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-600 pointer-events-none">W</div>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-600 pointer-events-none">E</div>

                {/* Center Point */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-slate-600 rounded-full"></div>

                {/* Sun Indicator */}
                <div
                    className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 flex items-center justify-center top-1/2 left-1/2 -ml-2 -mt-2"
                    style={{
                        transform: `rotate(${value - 90}deg) translate(36px) rotate(-${value - 90}deg)`
                    }}
                >
                    <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50"></div>
                </div>

                {/* Ray/Line Indicator */}
                <div
                    className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-transparent to-yellow-500/50 origin-left pointer-events-none"
                    style={{
                        transform: `rotate(${value - 90}deg)`
                    }}
                ></div>

            </div>

            <div className="text-xs font-mono text-indigo-400 font-bold">
                {value}°
            </div>
        </div>
    );
};

export default SunPositionSelector;
