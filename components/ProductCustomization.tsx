import React from 'react';
import { Package, Sun, Image as ImageIcon, Target, ChevronUp, ChevronDown, Cpu, Palette, Layers, Box, Camera, Grid, Sparkles, Sliders } from 'lucide-react';
import { SuperModeSettings, SuperAtmosphere, CameraLens } from '../types';

interface ProductCustomizationProps {
    settings: SuperModeSettings;
    onChange: (settings: SuperModeSettings) => void;
}

const LIGHTING_PREVIEWS: Record<SuperAtmosphere, string> = {
    [SuperAtmosphere.None]: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&q=80',
    [SuperAtmosphere.StudioSoftbox]: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=500&q=80',
    [SuperAtmosphere.DramaticShadows]: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&q=80',
    [SuperAtmosphere.NeonCyber]: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80',
    [SuperAtmosphere.GoldenHour]: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=500&q=80',
    [SuperAtmosphere.HardLight]: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80',
    [SuperAtmosphere.SoftDiffused]: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=500&q=80',
    [SuperAtmosphere.Vibrant]: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80'
};

const ProductCustomization: React.FC<ProductCustomizationProps> = ({ settings, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(true);

    const updateSetting = (field: keyof SuperModeSettings, value: any) => {
        onChange({
            ...settings,
            [field]: value
        });
    };

    return (
        <div className="border-t border-slate-800 pt-4 mt-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-sm font-bold text-slate-300 uppercase hover:text-white transition-colors mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800"
            >
                <span className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-400" />
                    Advanced Marketing Suite
                </span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {isOpen && (
                <div className="space-y-8 animate-in slide-in-from-top-2 duration-200">

                    {/* Automation Tools */}
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 space-y-5">
                        <h3 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-2 tracking-wider">
                            <Sparkles size={14} /> AI Automation Tools
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => updateSetting('generateMultiAngle', !settings.generateMultiAngle)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${settings.generateMultiAngle
                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <Camera size={20} />
                                <div className="text-center">
                                    <span className="text-xs font-bold block uppercase tracking-tight">4 SHOTS</span>
                                    <span className="text-[10px] font-medium opacity-60">Multi-Angle Sequence</span>
                                </div>
                            </button>
                            <button
                                onClick={() => updateSetting('isMoodboard', !settings.isMoodboard)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${settings.isMoodboard
                                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/20'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <Grid size={20} />
                                <div className="text-center">
                                    <span className="text-xs font-bold block uppercase tracking-tight">MOODBOARD</span>
                                    <span className="text-[10px] font-medium opacity-60">Concept Grid</span>
                                </div>
                            </button>
                        </div>

                        {settings.generateMultiAngle && (
                            <div className="space-y-4 pt-5 border-t border-indigo-500/30">
                                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                                    <Sparkles size={12} />
                                    <label className="text-[10px] font-black uppercase tracking-[0.1em]">Multi-Shot Sequence</label>
                                </div>
                                <p className="text-[11px] text-indigo-300/80 leading-relaxed italic bg-indigo-500/5 px-3 py-2.5 rounded-xl border border-indigo-500/10">
                                    Note: Selected angles below override the single shot perspective. Pick exactly 4 for best results.
                                </p>
                                <div className="grid grid-cols-2 gap-2.5 mt-3">
                                    {[
                                        'Hero shot (45 degree)',
                                        'Eye-level catalog shot',
                                        'Side profile view',
                                        'Top-down flat lay',
                                        'Low-angle high-profile',
                                        'Artistic Dutch tilt',
                                        'Macro-detail close-up'
                                    ].map((angle) => {
                                        const isSelected = settings.multiAngleSelection?.includes(angle);
                                        return (
                                            <button
                                                key={angle}
                                                onClick={() => {
                                                    const current = settings.multiAngleSelection || [];
                                                    if (isSelected) {
                                                        updateSetting('multiAngleSelection', current.filter(a => a !== angle));
                                                    } else {
                                                        updateSetting('multiAngleSelection', [...current, angle].slice(-4));
                                                    }
                                                }}
                                                className={`px-3 py-2 text-[11px] font-bold rounded-lg border transition-all flex justify-between items-center ${isSelected
                                                    ? 'bg-indigo-500 border-indigo-400 text-white shadow-sm'
                                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-indigo-500/40 hover:text-slate-300'
                                                    }`}
                                            >
                                                <span className="truncate pr-1">{angle.split(' (')[0]}</span>
                                                {isSelected && <Sparkles size={10} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Cpu size={16} className="text-slate-500" /> Rendering Intelligence
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'gemini-2.5-flash', label: 'Flash (Fast)', desc: 'Standard photorealism' },
                                { id: 'gemini-3-pro-image-preview', label: 'Pro (Ultra)', desc: 'Extreme detail & quality' }
                            ].map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => updateSetting('model', model.id)}
                                    className={`flex flex-col items-start p-3 rounded-xl border transition-all ${settings.model === model.id || (!settings.model && model.id === 'gemini-2.5-flash')
                                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                >
                                    <span className={`text-xs font-bold uppercase tracking-tight ${settings.model === model.id ? 'text-white' : 'text-slate-300'}`}>{model.label}</span>
                                    <span className={`text-[10px] mt-1 ${settings.model === model.id ? 'text-indigo-100/70' : 'text-slate-600'}`}>{model.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Category Selector */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Package size={16} className="text-slate-500" /> Subject Category
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {['Watch', 'Sneakers', 'Bottle', 'Bag', 'Gadget', 'Furniture'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => updateSetting('productCategory', cat)}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg border uppercase tracking-wider transition-all ${settings.productCategory === cat
                                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={settings.productCategory}
                            onChange={(e) => updateSetting('productCategory', e.target.value)}
                            placeholder="Custom category (e.g. Mechanical Keyboard)"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 ring-offset-2 ring-offset-slate-950 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600 transition-all font-medium"
                        />
                    </div>

                    {/* Lighting Presets Grid */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Sun size={16} className="text-slate-500" /> Lighting Mood
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                            {Object.entries(LIGHTING_PREVIEWS).map(([a, img]) => (
                                <button
                                    key={a}
                                    onClick={() => updateSetting('lighting', a as SuperAtmosphere)}
                                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${settings.lighting === a ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-600 shadow-xl'
                                        }`}
                                    title={a}
                                >
                                    <img src={img} alt={a} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className={`absolute inset-0 bg-black/60 flex items-center justify-center p-2 transition-opacity ${settings.lighting === a ? 'opacity-100 flex ring-2 ring-inset ring-indigo-500' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <span className="text-[11px] font-black text-white text-center leading-tight uppercase tracking-tight">{a.split(':').pop()}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Granular Light Controls */}
                    <div className="grid grid-cols-2 gap-6 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50">
                        <div className="space-y-3">
                            <label className="text-[11px] uppercase font-black text-slate-500 flex items-center gap-1.5 tracking-widest">
                                <Sun size={12} /> Intensity
                            </label>
                            <div className="flex gap-1.5">
                                {(['Soft', 'Balanced', 'Hard'] as const).map((i) => (
                                    <button
                                        key={i}
                                        onClick={() => updateSetting('lightingIntensity', i)}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${settings.lightingIntensity === i ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                                            }`}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] uppercase font-black text-slate-500 flex items-center gap-1.5 tracking-widest">
                                <Palette size={12} /> Light Tint
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={settings.lightingColor || '#ffffff'}
                                    onChange={(e) => updateSetting('lightingColor', e.target.value)}
                                    className="h-10 w-16 rounded-lg cursor-pointer bg-slate-900 border border-slate-700 p-1"
                                />
                                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{settings.lightingColor || '#FFFFFF'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Background / Environment Details */}
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                <Layers size={14} className="text-slate-500" /> Branding/Ground Material
                            </label>
                            <input
                                type="text"
                                value={settings.groundMaterial || ''}
                                onChange={(e) => updateSetting('groundMaterial', e.target.value)}
                                placeholder="Surface texture (e.g. Polished Oak, Raw Concrete)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                <Box size={14} className="text-slate-500" /> Active Scene Extras
                            </label>
                            <input
                                type="text"
                                value={settings.environmentProps || ''}
                                onChange={(e) => updateSetting('environmentProps', e.target.value)}
                                placeholder="Extras (e.g. Cinematic fog, Floating digital particles)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Camera Angles Selection */}
                    {!settings.generateMultiAngle && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <Camera size={16} className="text-slate-500" /> Shot Perspective
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'Hero shot (45 degree)', label: 'Hero Shot', desc: 'Standard Profile' },
                                    { id: 'Eye-level catalog shot', label: 'Eye-level', desc: 'Commercial Packshot' },
                                    { id: 'Side profile view', label: 'Side Profile', desc: 'Form & Silhouette' },
                                    { id: 'Top-down flat lay', label: 'Flat Lay', desc: 'Overhead view' },
                                    { id: 'Low-angle high-profile', label: 'Power Shot', desc: 'Dynamic Perspective' },
                                    { id: 'Artistic Dutch tilt', label: 'Artistic Tilt', desc: 'Creative Angle' },
                                    { id: 'Macro-detail close-up', label: 'Macro Detail', desc: 'Texture & Materials' }
                                ].map((angle) => (
                                    <button
                                        key={angle.id}
                                        onClick={() => updateSetting('cameraAngle', angle.id)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${settings.cameraAngle === angle.id
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600'
                                            }`}
                                    >
                                        <span className="text-[11px] font-black uppercase tracking-wider">{angle.label}</span>
                                        <span className={`text-[9px] mt-1 font-medium ${settings.cameraAngle === angle.id ? 'text-indigo-100/80' : 'text-slate-500'}`}>{angle.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Advanced Optics: Lens & Aperture */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase flex items-center gap-2 tracking-[0.15em]">
                            <Box size={14} className="text-indigo-500" /> Optics & Virtual Rig
                        </h3>

                        {/* Lens Selection */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Optical Lens Palette</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(CameraLens).map(([key, value]) => (
                                    <button
                                        key={key}
                                        onClick={() => updateSetting('lens', value)}
                                        className={`px-3 py-2.5 text-xs font-bold rounded-lg border transition-all flex justify-between items-center ${settings.lens === value
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                                            }`}
                                    >
                                        <span>{value.split(' ')[0]}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${settings.lens === value ? 'bg-indigo-400/30 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                            {value.includes('(') ? value.split('(')[1].split(')')[0] : value.split(' ').slice(1).join(' ')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Aperture */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aperture</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {['f/1.8', 'f/2.8', 'f/8', 'f/16'].map(ap => (
                                        <button
                                            key={ap}
                                            onClick={() => updateSetting('aperture', ap)}
                                            className={`py-2 text-xs font-black rounded-lg border transition-all ${settings.aperture === ap
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                                                }`}
                                            title={ap === 'f/1.8' ? 'Shallow Bokeh' : ap === 'f/16' ? 'Deep Focus' : ''}
                                        >
                                            {ap}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Shutter Speed */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Motion / Shutter</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { id: 'Frozen Motion', label: 'Freeze' },
                                        { id: 'Motion Blur', label: 'Blur' },
                                        { id: 'Long Exposure', label: 'Long' },
                                        { id: 'Natural', label: 'Auto' }
                                    ].map(ss => (
                                        <button
                                            key={ss.id}
                                            onClick={() => updateSetting('shutterSpeed', ss.id)}
                                            className={`py-2 text-xs font-black rounded-lg border transition-all ${settings.shutterSpeed === ss.id
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                                                }`}
                                        >
                                            {ss.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Focus Mode */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Target size={16} className="text-slate-500" /> AI Subject Precision
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {(['Object', 'Context', 'Detail'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => updateSetting('focus', f)}
                                    className={`px-3 py-3 text-xs uppercase font-black tracking-widest rounded-xl border transition-all ${settings.focus === f
                                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductCustomization;
