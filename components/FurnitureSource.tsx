import React, { useState } from 'react';
import { Search, Globe, Package, Loader2, Check, ExternalLink } from 'lucide-react';
import { FURNITURE_BRANDS, fetchFurnitureByCode, FurnitureItem } from '../services/furnitureService';

interface FurnitureSourceProps {
    onSelect: (imageUrl: string) => void;
}

const FurnitureSource: React.FC<FurnitureSourceProps> = ({ onSelect }) => {
    const [selectedBrand, setSelectedBrand] = useState(FURNITURE_BRANDS[0].name);
    const [articleCode, setArticleCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<FurnitureItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!articleCode.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const items = await fetchFurnitureByCode(selectedBrand, articleCode);
            setResults(items);
            if (items.length === 0) {
                setError('No items found with this code. Try another or check the website.');
            }
        } catch (err) {
            setError('Failed to fetch data. Brand website might be blocking requests.');
        } finally {
            setLoading(false);
        }
    };

    const currentBrand = FURNITURE_BRANDS.find(b => b.name === selectedBrand);

    return (
        <div className="space-y-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
                <Globe size={14} className="text-indigo-400" />
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Furniture Sourcing</h4>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {/* Brand Selection */}
                <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-medium ml-1">Select Brand</label>
                    <div className="grid grid-cols-3 gap-1">
                        {FURNITURE_BRANDS.map((brand) => (
                            <button
                                key={brand.name}
                                onClick={() => setSelectedBrand(brand.name)}
                                className={`px-2 py-1.5 text-[10px] rounded-md border transition-all ${selectedBrand === brand.name
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                {brand.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Article Code Input */}
                <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-medium ml-1">Article Code / Product Name</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                            <input
                                type="text"
                                value={articleCode}
                                onChange={(e) => setArticleCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="e.g. KAR-01 or Sofa Name"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading || !articleCode.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center min-w-[40px]"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        </button>
                    </div>
                </div>
                {/* Direct URL Fallback */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <label className="text-[10px] text-slate-500 uppercase font-medium ml-1">Or Paste Direct Image URL</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val.startsWith('http')) onSelect(val);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Hint / External Link */}
            {currentBrand && (
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-slate-500 italic">Finding items on {currentBrand.name}...</span>
                    <a
                        href={currentBrand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                        Visit Website <ExternalLink size={10} />
                    </a>
                </div>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {results.map((item) => (
                        <div
                            key={item.id}
                            className="group relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer"
                            onClick={() => onSelect(item.image)}
                        >
                            <img src={item.image} alt={item.name} className="w-full h-24 object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                    <Check size={10} /> Select
                                </span>
                            </div>
                            <div className="p-1.5 bg-slate-800/90">
                                <p className="text-[9px] text-slate-300 truncate font-medium">{item.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-2">
                    <p className="text-[10px] text-red-400 text-center">{error}</p>
                </div>
            )}
        </div>
    );
};

export default FurnitureSource;
