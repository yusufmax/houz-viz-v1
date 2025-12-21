import React from 'react';
import { Package, Sun, Image as ImageIcon, Target, ChevronUp, ChevronDown, Cpu, Palette, Layers, Box, Camera } from 'lucide-react';
import { SuperModeSettings, SuperAtmosphere } from '../types';

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
                    <Package size={14} className="text-indigo-400" />
                    Advanced Marketing Controls
                </span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isOpen && (
                <div className="space-y-8 animate-in slide-in-from-top-2 duration-200">

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Cpu size={12} className="text-slate-500" /> AI Rendering Model
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'gemini-2.5-flash', label: 'Flash (Fast)', desc: 'Standard quality' },
                                { id: 'gemini-3-pro-image-preview', label: 'Pro (HQ)', desc: 'Highest detail' }
                            ].map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => updateSetting('model', model.id)}
                                    className={`flex flex-col items-start p-2 rounded-lg border transition-all ${settings.model === model.id || (!settings.model && model.id === 'gemini-2.5-flash')
                                            ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                >
                                    <span className={`text-[10px] font-bold uppercase ${settings.model === model.id ? 'text-indigo-200' : 'text-slate-400'}`}>{model.label}</span>
                                    <span className="text-[8px] text-slate-500">{model.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Category */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Package size={12} className="text-slate-500" /> Product Category
                        </h3>
                        <input
                            type="text"
                            value={settings.productCategory}
                            onChange={(e) => updateSetting('productCategory', e.target.value)}
                            placeholder="e.g. Luxury Watch, Sports Shoe, Perfume Bottle"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                        />
                    </div>

                    {/* Lighting Presets Grid */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Sun size={12} className="text-slate-500" /> Lighting Presets
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
                                <Layers size={10} /> Ground Material
                            </label>
                            <input
                                type="text"
                                value={settings.groundMaterial || ''}
                                onChange={(e) => updateSetting('groundMaterial', e.target.value)}
                                placeholder="e.g. Polished Marble, Brushed Metal, Oak Wood"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                <Box size={10} /> Environment Props
                            </label>
                            <input
                                type="text"
                                value={settings.environmentProps || ''}
                                onChange={(e) => updateSetting('environmentProps', e.target.value)}
                                placeholder="e.g. Floating leaves, Water splashes, Smoke"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    {/* Camera Angles Selection */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Camera size={12} className="text-slate-500" /> Marketing Angle
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'Hero shot (45 degree)', label: 'Hero Shot', desc: 'Standard Profile' },
                                { id: 'Macro-detail close-up', label: 'Macro Detail', desc: 'Texture Focus' },
                                { id: 'Top-down flat lay', label: 'Flat Lay', desc: 'Overhead view' },
                                { id: 'Low-angle high-profile', label: 'Power Shot', desc: 'Worm-eye view' }
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

                    {/* Focus Mode (Legacy keeping for now but could merge) */}
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
