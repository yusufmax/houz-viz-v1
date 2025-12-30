import React from 'react';
import { Upload, ChevronDown, ChevronUp, Palette, Sofa, Layers, Grid, ShoppingBag } from 'lucide-react';
import ImageUpload from './ImageUpload';
import FurnitureSource from './FurnitureSource';
import { InteriorSettings } from '../types';

interface InteriorCustomizationProps {
    settings: InteriorSettings;
    onChange: (settings: InteriorSettings) => void;
}

const InteriorCustomization: React.FC<InteriorCustomizationProps> = ({ settings, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(true);
    const [showSourcing, setShowSourcing] = React.useState(false);

    const updateSetting = (category: keyof InteriorSettings, field: 'type' | 'style' | 'value' | 'image', value: string | null) => {
        onChange({
            ...settings,
            [category]: {
                ...settings[category],
                [field]: value
            }
        });
    };

    return (
        <div className="border-t border-slate-800 pt-4 mt-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 uppercase hover:text-white transition-colors mb-4"
            >
                <span className="flex items-center gap-2">
                    <Sofa size={14} className="text-indigo-400" />
                    Interior Details
                </span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isOpen && (
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">

                    {/* Flooring */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Grid size={12} className="text-slate-500" /> Flooring
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={settings.flooring.type}
                                onChange={(e) => updateSetting('flooring', 'type', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
                            >
                                <option value="">Select Material</option>
                                <option value="Hardwood">Hardwood</option>
                                <option value="Marble">Marble</option>
                                <option value="Polished Concrete">Concrete</option>
                                <option value="Carpet">Carpet</option>
                                <option value="Tile">Tile</option>
                            </select>
                        </div>
                        {/* Flooring Image Upload - Small wrapper */}
                        <div className="w-full">
                            <ImageUpload
                                selectedImage={settings.flooring.image || null}
                                onImageSelected={(img) => updateSetting('flooring', 'image', img)}
                                label="Upload Texture (Opt)"
                                compact={true}
                            />
                        </div>
                    </div>

                    {/* Furniture */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                                <Sofa size={12} className="text-slate-500" /> Furniture Style
                            </h3>
                            <button
                                onClick={() => setShowSourcing(!showSourcing)}
                                className={`text-[10px] font-medium flex items-center gap-1 px-2 py-1 rounded transition-colors ${showSourcing
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                    }`}
                            >
                                <ShoppingBag size={10} />
                                {showSourcing ? 'Hide Sourcing' : 'Source from Brand'}
                            </button>
                        </div>

                        {showSourcing ? (
                            <div className="animate-in zoom-in-95 duration-200">
                                <FurnitureSource
                                    onSelect={(imageUrl) => {
                                        updateSetting('furniture', 'image', imageUrl);
                                        setShowSourcing(false);
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                <select
                                    value={settings.furniture.style}
                                    onChange={(e) => updateSetting('furniture', 'style', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Style</option>
                                    <option value="Modern Contemporary">Modern</option>
                                    <option value="Minimalist">Minimalist</option>
                                    <option value="Mid-Century Modern">Mid-Century</option>
                                    <option value="Industrial">Industrial</option>
                                    <option value="Scandinavian">Scandinavian</option>
                                    <option value="Classic Traditional">Classic</option>
                                    <option value="Art Deco">Art Deco</option>
                                </select>
                                <div className="w-full">
                                    <ImageUpload
                                        selectedImage={settings.furniture.image || null}
                                        onImageSelected={(img) => updateSetting('furniture', 'image', img)}
                                        label="Reference Image (Opt)"
                                        compact={true}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Primary Color */}
                        <div>
                            <h3 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                                <Palette size={12} className="text-slate-500" /> Primary
                            </h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={settings.primaryColor.value /* Handle potential empty/invalid hex */}
                                    onChange={(e) => updateSetting('primaryColor', 'value', e.target.value)}
                                    className="h-8 w-8 rounded cursor-pointer bg-transparent border-none p-0"
                                />
                                <span className="text-[10px] text-slate-500 uppercase">{settings.primaryColor.value || 'None'}</span>
                            </div>
                            <div className="w-full mt-2">
                                <ImageUpload
                                    selectedImage={settings.primaryColor.image || null}
                                    onImageSelected={(img) => updateSetting('primaryColor', 'image', img)}
                                    label="Ref"
                                    compact={true}
                                />
                            </div>
                        </div>

                        {/* Wall Color */}
                        <div>
                            <h3 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                                <Layers size={12} className="text-slate-500" /> Wall
                            </h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={settings.wallColor.value}
                                    onChange={(e) => updateSetting('wallColor', 'value', e.target.value)}
                                    className="h-8 w-8 rounded cursor-pointer bg-transparent border-none p-0"
                                />
                                <span className="text-[10px] text-slate-500 uppercase">{settings.wallColor.value || 'None'}</span>
                            </div>
                            <div className="w-full mt-2">
                                <ImageUpload
                                    selectedImage={settings.wallColor.image || null}
                                    onImageSelected={(img) => updateSetting('wallColor', 'image', img)}
                                    label="Ref"
                                    compact={true}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default InteriorCustomization;
