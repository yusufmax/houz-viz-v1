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
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 uppercase hover:text-white transition-colors mb-4"
            >
                <span className="flex items-center gap-2">
                    <Sliders size={14} className="text-indigo-400" />
                    Advanced Marketing Suite
                </span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isOpen && (
                <div className="space-y-8 animate-in slide-in-from-top-2 duration-200">

                    {/* Automation Tools */}
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-4">
                        <h3 className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-2">
                            <Sparkles size={12} /> AI Automation Tools
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => updateSetting('generateMultiAngle', !settings.generateMultiAngle)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${settings.generateMultiAngle
                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <Camera size={18} />
                                <div className="text-center">
                                    <span className="text-[10px] font-bold block">4 SHOTS</span>
                                    <span className="text-[8px] opacity-60">Multi-Angle</span>
                                </div>
                            </button>
                            <button
                                onClick={() => updateSetting('isMoodboard', !settings.isMoodboard)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${settings.isMoodboard
                                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <Grid size={18} />
                                <div className="text-center">
                                    <span className="text-[10px] font-bold block">MOODBOARD</span>
                                    <span className="text-[8px] opacity-60">Concept Grid</span>
                                </div>
                            </button>
                        </div>

                        {settings.generateMultiAngle && (
                            <div className="space-y-3 pt-4 border-t border-indigo-500/20">
                                <div className="flex items-center gap-2 text-indigo-300/80 mb-1">
                                    <Sparkles size={10} />
                                    <label className="text-[9px] font-bold uppercase tracking-widest">Multi-Shot Sequence</label>
                                </div>
                                <p className="text-[8px] text-indigo-400/60 leading-tight italic bg-indigo-500/5 px-2 py-1.5 rounded-lg border border-indigo-500/10">
                                    Quick Note: When "4 Shots" is active, the angles selected below will override the single shot perspective.
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
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
                                                className={`px-2 py-1.5 text-[8px] font-bold rounded border transition-all flex justify-between items-center ${isSelected
                                                    ? 'bg-indigo-500 border-indigo-400 text-white'
                                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-indigo-500/30'
                                                    }`}
                                            >
                                                <span className="truncate pr-1">{angle.split(' (')[0]}</span>
                                                {isSelected && <Sparkles size={8} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Cpu size={12} className="text-slate-500" /> Rendering Intelligence
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'gemini-2.5-flash', label: 'Flash (Fast)', desc: 'Standard production' },
                                { id: 'gemini-3-pro-image-preview', label: 'Pro (Ultra)', desc: 'Photorealistic detail' }
                            ].map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => updateSetting('model', model.id)}
                                    className={`flex flex-col items-start p-2 rounded-lg border transition-all ${settings.model === model.id || (!settings.model && model.id === 'gemini-2.5-flash')
                                        ? 'bg-indigo-900/40 border-indigo-500 ring-1 ring-indigo-500'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                >
                                    <span className={`text-[10px] font-bold uppercase ${settings.model === model.id ? 'text-indigo-200' : 'text-slate-400'}`}>{model.label}</span>
                                    <span className="text-[8px] text-slate-500">{model.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Category Selector */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Package size={12} className="text-slate-500" /> Focus Subject
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {['Watch', 'Sneakers', 'Bottle', 'Bag', 'Gadget', 'Furniture'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => updateSetting('productCategory', cat)}
                                    className={`px-2 py-1 text-[9px] font-bold rounded-md border uppercase transition-all ${settings.productCategory === cat
                                        ? 'bg-indigo-600 border-indigo-400 text-white'
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
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
                            placeholder="Custom category..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                        />
                    </div>

                    {/* Lighting Presets Grid */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Sun size={12} className="text-slate-500" /> Lighting Mood
                        </h3>
                        <div className="grid grid-cols-4 gap-2">
                            {Object.entries(LIGHTING_PREVIEWS).map(([a, img]) => (
                                <button
                                    key={a}
                                    onClick={() => updateSetting('lighting', a as SuperAtmosphere)}
                                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${settings.lighting === a ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-600'
                                        }`}
                                    title={a}
                                >
                                    <img src={img} alt={a} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className={`absolute inset-0 bg-black/60 flex items-center justify-center p-1 transition-opacity ${settings.lighting === a ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <span className="text-[8px] font-bold text-white text-center leading-tight uppercase">{a.split(':').pop()}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Granular Light Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Sun size={10} /> Intensity
                            </label>
                            <div className="flex gap-1">
                                {(['Soft', 'Balanced', 'Hard'] as const).map((i) => (
                                    <button
                                        key={i}
                                        onClick={() => updateSetting('lightingIntensity', i)}
                                        className={`flex-1 py-1.5 text-[9px] rounded border transition-all ${settings.lightingIntensity === i ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
                                            }`}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Palette size={10} /> Light Tint
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={settings.lightingColor || '#ffffff'}
                                    onChange={(e) => updateSetting('lightingColor', e.target.value)}
                                    className="h-7 w-12 rounded cursor-pointer bg-slate-900 border border-slate-800 p-0.5"
                                />
                                <span className="text-[9px] font-mono text-slate-500 uppercase">{settings.lightingColor || '#FFFFFF'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Background / Environment Details */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Layers size={10} /> Branding/Ground
                            </label>
                            <input
                                type="text"
                                value={settings.groundMaterial || ''}
                                onChange={(e) => updateSetting('groundMaterial', e.target.value)}
                                placeholder="Surface texture (e.g. Oak, Concrete)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Box size={10} /> Scene Extras
                            </label>
                            <input
                                type="text"
                                value={settings.environmentProps || ''}
                                onChange={(e) => updateSetting('environmentProps', e.target.value)}
                                placeholder="Extras (e.g. Smoke, Floating leaves)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    {/* Camera Angles Selection */}
                    {!settings.generateMultiAngle && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                                <Camera size={12} className="text-slate-500" /> Shot Perspective
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'Hero shot (45 degree)', label: 'Hero Shot', desc: 'Standard Profile' },
                                    { id: 'Eye-level catalog shot', label: 'Eye-level', desc: 'Commercial Catalog' },
                                    { id: 'Side profile view', label: 'Side Profile', desc: 'Form & Silhouette' },
                                    { id: 'Top-down flat lay', label: 'Flat Lay', desc: 'Overhead view' },
                                    { id: 'Low-angle high-profile', label: 'Power Shot', desc: 'Worm-eye view' },
                                    { id: 'Artistic Dutch tilt', label: 'Artistic Tilt', desc: 'Dynamic Angle' },
                                    { id: 'Macro-detail close-up', label: 'Macro Detail', desc: 'Texture Focus' }
                                ].map((angle) => (
                                    <button
                                        key={angle.id}
                                        onClick={() => updateSetting('cameraAngle', angle.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${settings.cameraAngle === angle.id
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                                            }`}
                                    >
                                        <span className="text-[10px] font-bold uppercase">{angle.label}</span>
                                        <span className={`text-[8px] mt-1 ${settings.cameraAngle === angle.id ? 'text-indigo-100' : 'text-slate-600'}`}>{angle.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Advanced Optics: Lens & Aperture */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-5">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 tracking-wider">
                            <Box size={12} /> Advanced Optics & Rig
                        </h3>

                        {/* Lens Selection */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Optical Lens (Focal Length)</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {Object.entries(CameraLens).map(([key, value]) => (
                                    <button
                                        key={key}
                                        onClick={() => updateSetting('lens', value)}
                                        className={`px-2 py-1.5 text-[9px] font-bold rounded border transition-all flex justify-between items-center ${settings.lens === value
                                            ? 'bg-indigo-600 border-indigo-400 text-white'
                                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
                                            }`}
                                    >
                                        <span>{value.split(' ')[0]}</span>
                                        <span className="text-[7px] opacity-40 uppercase tracking-tighter">
                                            {value.includes('(') ? value.split('(')[1].split(')')[0] : ''}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Aperture */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Aperture (Depth of Field)</label>
                                <div className="flex flex-wrap gap-1">
                                    {['f/1.8', 'f/2.8', 'f/8', 'f/16'].map(ap => (
                                        <button
                                            key={ap}
                                            onClick={() => updateSetting('aperture', ap)}
                                            className={`flex-1 py-1 text-[8px] font-bold rounded border transition-all ${settings.aperture === ap
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                                                }`}
                                            title={ap === 'f/1.8' ? 'Shallow Bokeh' : ap === 'f/16' ? 'Deep Focus' : ''}
                                        >
                                            {ap}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Shutter Speed */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Motion (Shutter)</label>
                                <div className="grid grid-cols-2 gap-1">
                                    {[
                                        { id: 'Frozen Motion', label: 'Freeze' },
                                        { id: 'Motion Blur', label: 'Blur' },
                                        { id: 'Long Exposure', label: 'Long' },
                                        { id: 'Natural', label: 'Auto' }
                                    ].map(ss => (
                                        <button
                                            key={ss.id}
                                            onClick={() => updateSetting('shutterSpeed', ss.id)}
                                            className={`py-1 text-[8px] font-bold rounded border transition-all ${settings.shutterSpeed === ss.id
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
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
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Target size={12} className="text-slate-500" /> AI Hero Focus
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {(['Object', 'Context', 'Detail'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => updateSetting('focus', f)}
                                    className={`px-2 py-2 text-[10px] uppercase font-bold rounded border transition-all ${settings.focus === f
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
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
