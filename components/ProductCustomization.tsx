import React from 'react';
import { Package, Sun, Image as ImageIcon, Target, ChevronUp, ChevronDown, Cpu, Palette, Layers, Box, Camera, Grid, Sparkles, Sliders, Zap, Video } from 'lucide-react';
import { SuperModeSettings, SuperAtmosphere, CameraLens } from '../types';

interface ProductCustomizationProps {
    settings: SuperModeSettings;
    onChange: (settings: SuperModeSettings) => void;
}

const LIGHTING_BY_LOCATION: Record<string, { id: string; label: string; url: string }[]> = {
    Studio: [
        { id: 'Studio:Softbox', label: 'Softbox', url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=200&q=80' },
        { id: 'Studio:RingLight', label: 'Ring Light', url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=200&q=80' },
        { id: 'Studio:HighKey', label: 'High Key', url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=200&q=80' },
        { id: 'Studio:Dramatic', label: 'Dramatic', url: 'https://images.unsplash.com/photo-1470790376778-a9fbc86d70e2?w=200&q=80' },
    ],
    Interior: [
        { id: 'Interior:Ambient', label: 'Ambient', url: 'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=200&q=80' },
        { id: 'Interior:Lamp', label: 'Warm Lamp', url: 'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=200&q=80' },
        { id: 'Interior:Window', label: 'Window Side', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&q=80' },
        { id: 'Interior:Neon', label: 'Neon Glow', url: 'https://images.unsplash.com/photo-1550747528-cdb45925b3f7?w=200&q=80' },
    ],
    Exterior: [
        { id: 'Exterior:GoldenHour', label: 'Golden Hour', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=200&q=80' },
        { id: 'Exterior:Sunset', label: 'Sunset', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=200&q=80' },
        { id: 'Exterior:Overcast', label: 'Overcast', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=200&q=80' },
        { id: 'Exterior:Moonlight', label: 'Moonlight', url: 'https://images.unsplash.com/photo-1472552947727-b40348702bb7?w=200&q=80' },
    ]
};

const RGB_PRESETS = [
    { color: '#FFFFFF', name: 'White' },
    { color: '#FFD700', name: 'Gold' },
    { color: '#FF4500', name: 'Warm' },
    { color: '#00BFFF', name: 'Cool' },
    { color: '#FF007F', name: 'Neon' },
    { color: '#32CD32', name: 'Lime' }
];

const ProductCustomization: React.FC<ProductCustomizationProps> = ({ settings, onChange }) => {
    const [sections, setSections] = React.useState({
        automation: true,
        environment: false,
        camera: false
    });

    const toggleSection = (section: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const updateSetting = (field: keyof SuperModeSettings, value: any) => {
        onChange({
            ...settings,
            [field]: value
        });
    };

    return (
        <div className="space-y-4 pt-4 border-t border-slate-800">

            {/* Section 1: AI Intelligence & Automation */}
            <div className="bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden">
                <button
                    onClick={() => toggleSection('automation')}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Zap size={16} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">AI & Automation</span>
                    </div>
                    {sections.automation ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {sections.automation && (
                    <div className="p-5 pt-0 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        {/* Model Selector */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Cpu size={12} /> Model Selection
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'gemini-2.5-flash', label: 'Flash (Fast)', desc: 'Standard' },
                                    { id: 'gemini-3-pro-image-preview', label: 'Pro (Ultra)', desc: 'Max Detail' }
                                ].map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => updateSetting('model', model.id)}
                                        className={`flex flex-col items-start p-3 rounded-xl border transition-all ${settings.model === model.id || (!settings.model && model.id === 'gemini-3-pro-image-preview')
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                            }`}
                                    >
                                        <span className={`text-xs font-bold uppercase tracking-tight ${settings.model === model.id ? 'text-white' : 'text-slate-300'}`}>{model.label}</span>
                                        <span className={`text-[9px] mt-0.5 ${settings.model === model.id ? 'text-indigo-100/70' : 'text-slate-600'}`}>{model.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Batch & Moodboard */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    const nextValue = !settings.generateMultiAngle;
                                    updateSetting('generateMultiAngle', nextValue);
                                    if (nextValue && !settings.multiAngleSelection) {
                                        updateSetting('multiAngleSelection', ['Profile', 'Front', 'Macro', 'Cinematic']);
                                    }
                                }}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${settings.generateMultiAngle
                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <Camera size={16} />
                                <span className="text-[10px] font-black uppercase">4 Shots</span>
                            </button>
                            <button
                                onClick={() => updateSetting('isMoodboard', !settings.isMoodboard)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${settings.isMoodboard
                                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <Grid size={16} />
                                <span className="text-[10px] font-black uppercase">Moodboard</span>
                            </button>
                        </div>

                        {/* Shot Selector (Visible when 4 Shots is active) */}
                        {settings.generateMultiAngle && (
                            <div className="space-y-3 p-3 bg-slate-950 rounded-xl border border-indigo-500/30 animate-in slide-in-from-top-2">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center justify-between">
                                    <span>Shot Preview (Select 4)</span>
                                    <span className="text-slate-600">{(settings.multiAngleSelection?.length || 0)} / 4</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Profile', 'Front', 'Macro', 'Cinematic', 'Lifestyle', 'Top-down', 'Side', 'Diagonal', 'Eye-level'].map(shot => {
                                        const isSelected = settings.multiAngleSelection?.includes(shot);
                                        return (
                                            <button
                                                key={shot}
                                                onClick={() => {
                                                    const current = settings.multiAngleSelection || [];
                                                    const nextSelection = isSelected
                                                        ? current.filter(s => s !== shot)
                                                        : current.length < 4 ? [...current, shot] : current;
                                                    updateSetting('multiAngleSelection', nextSelection);
                                                }}
                                                className={`px-2 py-1.5 text-[8px] font-bold rounded-md border transition-all ${isSelected
                                                    ? 'bg-indigo-500 border-indigo-400 text-white'
                                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                                                    }`}
                                            >
                                                {shot}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Section 2: Environment & Lighting */}
            <div className="bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden">
                <button
                    onClick={() => toggleSection('environment')}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Sun size={16} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">Environment & Setup</span>
                    </div>
                    {sections.environment ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {sections.environment && (
                    <div className="p-5 pt-0 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        {/* Subject Category */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject Classification</label>
                            <div className="flex flex-wrap gap-2">
                                {['Watch', 'Sneakers', 'Bottle', 'Bag', 'Gadget', 'Furniture'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => updateSetting('productCategory', cat)}
                                        className={`px-3 py-2 text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all ${settings.productCategory === cat
                                            ? 'bg-indigo-600 border-indigo-400 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Lighting Presets (Dynamic) */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Lighting Presets</span>
                                <span className="text-indigo-400 text-[9px]">{settings.location || 'Studio'} Selection</span>
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {(LIGHTING_BY_LOCATION[settings.location || 'Studio'] || LIGHTING_BY_LOCATION.Studio).map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => updateSetting('lighting', p.id)}
                                        className={`group relative aspect-square rounded-lg overflow-hidden border transition-all ${settings.lighting === p.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-600'
                                            }`}
                                        title={p.label}
                                    >
                                        <img src={p.url} alt={p.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center p-1 transition-opacity ${settings.lighting === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            <span className="text-[8px] font-black text-white text-center leading-tight uppercase tracking-tighter">{p.label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* RGB Lighting Selector */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Palette size={12} className="text-indigo-400" /> RGB Light Color
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 flex gap-2">
                                    {RGB_PRESETS.map((p) => (
                                        <button
                                            key={p.color}
                                            onClick={() => updateSetting('lightingColor', p.color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${settings.lightingColor === p.color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110'
                                                }`}
                                            style={{ backgroundColor: p.color }}
                                            title={p.name}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                                    <input
                                        type="color"
                                        value={settings.lightingColor || '#FFFFFF'}
                                        onChange={(e) => updateSetting('lightingColor', e.target.value)}
                                        className="w-5 h-5 bg-transparent border-none cursor-pointer"
                                    />
                                    <span className="text-[9px] font-mono text-slate-500 uppercase">{settings.lightingColor || '#FFFFFF'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Lighting Intensity */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={12} className="text-yellow-400" /> Light Intensity
                            </label>
                            <div className="flex gap-2">
                                {['Soft', 'Balanced', 'Hard'].map(int => (
                                    <button
                                        key={int}
                                        onClick={() => updateSetting('lightingIntensity', int)}
                                        className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border uppercase tracking-widest transition-all ${settings.lightingIntensity === int || (!settings.lightingIntensity && int === 'Balanced')
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                                            }`}
                                    >
                                        {int}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Surface & Props */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Layers size={12} /> Surface Material
                                </label>
                                <input
                                    type="text"
                                    value={settings.groundMaterial || ''}
                                    onChange={(e) => updateSetting('groundMaterial', e.target.value)}
                                    placeholder="Polished Marble, Wood, etc."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Box size={12} /> Active Props
                                </label>
                                <input
                                    type="text"
                                    value={settings.environmentProps || ''}
                                    onChange={(e) => updateSetting('environmentProps', e.target.value)}
                                    placeholder="Dust, Water splashes, Dry ice..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 3: Camera & Perspective */}
            <div className="bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden">
                <button
                    onClick={() => toggleSection('camera')}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Camera size={16} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">Optics & Vision</span>
                    </div>
                    {sections.camera ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {sections.camera && (
                    <div className="p-5 pt-0 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        {/* Perspective Selection */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shot Perspective</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'Hero shot (45 degree)', label: 'Hero' },
                                    { id: 'Eye-level catalog shot', label: 'Eye-Level' },
                                    { id: 'Side profile view', label: 'Profile' },
                                    { id: 'Top-down flat lay', label: 'Flat Lay' },
                                    { id: 'Macro-detail close-up', label: 'Macro' }
                                ].map((angle) => (
                                    <button
                                        key={angle.id}
                                        onClick={() => updateSetting('cameraAngle', angle.id)}
                                        className={`px-3 py-2 text-[10px] font-bold rounded-lg border transition-all ${settings.cameraAngle === angle.id
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                                            }`}
                                    >
                                        {angle.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Lens Palette */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lens Dynamics</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(CameraLens).map(([key, value]) => (
                                    <button
                                        key={key}
                                        onClick={() => updateSetting('lens', value)}
                                        className={`px-3 py-2 text-[10px] font-bold rounded-lg border transition-all flex justify-between items-center ${settings.lens === value
                                            ? 'bg-indigo-600 border-indigo-400 text-white'
                                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                                            }`}
                                    >
                                        <span>{value.split(' ')[0]}</span>
                                        <span className={`text-[8px] px-1 rounded ${settings.lens === value ? 'bg-indigo-400/30' : 'bg-slate-800'}`}>
                                            {value.includes('(') ? value.split('(')[1].split(')')[0] : 'STD'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Digital Rig Controls */}
                        <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-slate-800">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Aperture</label>
                                <select
                                    value={settings.aperture || 'f/2.8'}
                                    onChange={(e) => updateSetting('aperture', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-[10px] text-slate-300 outline-none"
                                >
                                    {['f/1.8', 'f/2.8', 'f/8', 'f/16'].map(ap => <option key={ap} value={ap}>{ap}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Precision</label>
                                <div className="flex gap-1">
                                    {(['Object', 'Context', 'Detail'] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => updateSetting('focus', f)}
                                            className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded transition-all ${settings.focus === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                                        >
                                            {f[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCustomization;
