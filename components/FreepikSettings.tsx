import React from 'react';
import { Settings, Sliders, Target, Zap, Sparkles } from 'lucide-react';
import { FreepikMagnificSettings, FreepikScaleFactor, FreepikStyle, FreepikEngine } from '../types';

interface FreepikSettingsProps {
    settings: FreepikMagnificSettings;
    onChange: (settings: FreepikMagnificSettings) => void;
    onClose: () => void;
}

const FreepikSettings: React.FC<FreepikSettingsProps> = ({ settings, onChange, onClose }) => {
    const handleChange = (key: keyof FreepikMagnificSettings, value: any) => {
        onChange({ ...settings, [key]: value });
    };

    const SCALE_OPTIONS: FreepikScaleFactor[] = ['2x', '4x', '8x', '16x'];
    const ENGINE_OPTIONS: { value: FreepikEngine, label: string }[] = [
        { value: 'automatic', label: 'Automatic' },
        { value: 'illusio', label: 'Illusio (Soft/Artistic)' },
        { value: 'sharpy', label: 'Sharpy (Realistic/Crisp)' },
        { value: 'sparkle', label: 'Sparkle (Dynamic/Punchy)' },
        { value: 'magnific_2_0', label: 'Magnific 2.0' }
    ];
    const STYLE_OPTIONS: { value: FreepikStyle, label: string }[] = [
        { value: 'standard', label: 'Standard' },
        { value: 'soft_portraits', label: 'Soft Portraits' },
        { value: 'hard_portraits', label: 'Hard Portraits' },
        { value: 'art_n_illustration', label: 'Art & Illustration' },
        { value: 'videogame_assets', label: 'Videogame Assets' },
        { value: 'nature_n_landscapes', label: 'Nature & Landscapes' },
        { value: 'films_n_photography', label: 'Films & Photography' },
        { value: '3d_renders', label: '3D Renders' },
        { value: 'science_fiction_n_horror', label: 'Sci-Fi & Horror' }
    ];

    return (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl">
            <div className="p-3 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <span className="text-[11px] font-black text-slate-200 uppercase tracking-widest">Magnific Config</span>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white text-xs">✕</button>
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                {/* Scale Factor */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Target size={10} /> Scale Factor
                    </label>
                    <div className="flex gap-1">
                        {SCALE_OPTIONS.map(s => (
                            <button
                                key={s}
                                onClick={() => handleChange('scale_factor', s)}
                                className={`flex-1 py-1 text-[10px] font-bold rounded ${settings.scale_factor === s ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Engine */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Zap size={10} /> Model Engine
                    </label>
                    <select
                        value={settings.engine}
                        onChange={(e) => handleChange('engine', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-slate-200 outline-none focus:border-amber-500"
                    >
                        {ENGINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                {/* Style */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Sliders size={10} /> Optimization
                    </label>
                    <select
                        value={settings.optimized_for}
                        onChange={(e) => handleChange('optimized_for', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-slate-200 outline-none focus:border-amber-500"
                    >
                        {STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                {/* Numeric Sliders */}
                {[
                    { key: 'creativity', label: 'Creativity', color: 'text-purple-400' },
                    { key: 'definition', label: 'Definition', color: 'text-blue-400' },
                    { key: 'resemblance', label: 'Resemblance', color: 'text-emerald-400' },
                    { key: 'intricacy', label: 'Intricacy', color: 'text-pink-400' }
                ].map(slider => (
                    <div className="space-y-1.5" key={slider.key}>
                        <div className="flex justify-between items-center">
                            <label className={`text-[10px] font-bold uppercase ${slider.color}`}>{slider.label}</label>
                            <span className="text-[10px] font-mono text-slate-400">{(settings as any)[slider.key]}</span>
                        </div>
                        <input
                            type="range"
                            min="-10"
                            max="10"
                            step="1"
                            value={(settings as any)[slider.key]}
                            onChange={(e) => handleChange(slider.key as any, parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FreepikSettings;
