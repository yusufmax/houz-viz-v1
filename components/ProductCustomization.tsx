import React from 'react';
import { Package, Sun, Image as ImageIcon, Target, ChevronUp, ChevronDown } from 'lucide-react';
import { SuperModeSettings, SuperAtmosphere } from '../types';

interface ProductCustomizationProps {
    settings: SuperModeSettings;
    onChange: (settings: SuperModeSettings) => void;
}

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
                    Product Marketing Details
                </span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isOpen && (
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
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

                    {/* Lighting Setup */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Sun size={12} className="text-slate-500" /> Lighting Setup
                        </h3>
                        <select
                            value={settings.lighting}
                            onChange={(e) => updateSetting('lighting', e.target.value as SuperAtmosphere)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
                        >
                            {Object.entries(SuperAtmosphere).map(([key, value]) => (
                                <option key={key} value={value}>{value}</option>
                            ))}
                        </select>
                    </div>

                    {/* Background / Scene */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <ImageIcon size={12} className="text-slate-500" /> Background / Environment
                        </h3>
                        <textarea
                            value={settings.background}
                            onChange={(e) => updateSetting('background', e.target.value)}
                            placeholder="Describe the background scene (e.g. Marble surface with blurred boutique interior)"
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 placeholder:text-slate-600 resize-none"
                        />
                    </div>

                    {/* Focus Mode */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-300 flex items-center gap-2">
                            <Target size={12} className="text-slate-500" /> Focus Mode
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {(['Object', 'Context', 'Detail'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => updateSetting('focus', f)}
                                    className={`px-2 py-2 text-[10px] uppercase font-bold rounded border transition-all ${settings.focus === f
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
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
