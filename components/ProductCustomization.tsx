import React from 'react';
import { Package, Sun, Image as ImageIcon, Target, ChevronUp, ChevronDown, Cpu, Palette, Layers, Box, Camera, Grid, Sparkles, Sliders, Zap, Video } from 'lucide-react';
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
                                        className={`flex flex-col items-start p-3 rounded-xl border transition-all ${settings.model === model.id || (!settings.model && model.id === 'gemini-2.5-flash')
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
                                onClick={() => updateSetting('generateMultiAngle', !settings.generateMultiAngle)}
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

                        {/* Lighting Presets */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lighting Presets</label>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(LIGHTING_PREVIEWS).map(([a, img]) => (
                                    <button
                                        key={a}
                                        onClick={() => updateSetting('lighting', a as SuperAtmosphere)}
                                        className={`group relative aspect-square rounded-lg overflow-hidden border transition-all ${settings.lighting === a ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-600'
                                            }`}
                                        title={a}
                                    >
                                        <img src={img} alt={a} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center p-1 transition-opacity ${settings.lighting === a ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            <span className="text-[8px] font-black text-white text-center leading-tight uppercase tracking-tighter">{a.split(':').pop()}</span>
                                        </div>
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
