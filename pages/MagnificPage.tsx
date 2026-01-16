import React, { useState, useRef } from 'react';
import { Upload, Download, ArrowLeft, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import FreepikSettings from '../components/FreepikSettings';
import { upscaleImageFreepik } from '../services/freepikService';
import { FreepikMagnificSettings } from '../types';

const MagnificPage: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [settings, setSettings] = useState<FreepikMagnificSettings>({
        scale_factor: '2x',
        optimized_for: 'standard',
        creativity: 0,
        definition: 0,
        resemblance: 0,
        intricacy: 0,
        engine: 'automatic'
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setImage(event.target.result as string);
                    setResult(null); // Reset result on new upload
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setImage(event.target.result as string);
                    setResult(null);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const runUpscale = async () => {
        if (!image) return;

        setIsUpscaling(true);
        try {
            const upscaledUrl = await upscaleImageFreepik(image, settings);
            setResult(upscaledUrl);
        } catch (error) {
            console.error(error);
            alert('Upscaling failed. Please check console for details.');
        } finally {
            setIsUpscaling(false);
        }
    };

    const downloadImage = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `magnific-upscale-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex flex-col">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                            <Sparkles className="text-amber-500" />
                            Magnific Upscaler
                        </h1>
                        <p className="text-slate-400 text-sm">Enhance your custom images with AI details</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-0">
                {/* Left: Editor/Preview Area */}
                <div className="lg:col-span-2 flex flex-col gap-4 min-h-[500px]">
                    <div
                        className="flex-1 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden group transition-all hover:border-slate-700"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        {image ? (
                            <div className="relative w-full h-full flex gap-1 p-4">
                                {/* Original */}
                                <div className={`relative flex-1 rounded-xl overflow-hidden bg-slate-950 flex flex-col ${result ? 'border-r border-slate-800' : ''}`}>
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-bold uppercase z-10">Original</div>
                                    <img src={image} className="w-full h-full object-contain" alt="Original" />
                                    <button
                                        onClick={() => setImage(null)}
                                        className="absolute bottom-4 right-4 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {/* Result */}
                                {result && (
                                    <div className="relative flex-1 rounded-xl overflow-hidden bg-slate-950 flex flex-col">
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500/90 text-black backdrop-blur rounded text-[10px] font-bold uppercase z-10">Upscaled</div>
                                        <img src={result} className="w-full h-full object-contain" alt="Upscaled" />
                                        <button
                                            onClick={() => downloadImage(result)}
                                            className="absolute bottom-4 right-4 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg flex items-center gap-2 font-bold text-xs"
                                        >
                                            <Download size={14} /> Download
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className="text-center cursor-pointer p-12"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500 group-hover:scale-110 transition-transform">
                                    <Upload size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Upload Image</h3>
                                <p className="text-slate-500 text-sm mb-6">Drag & drop or click to browse</p>
                                <button className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                                    Select File
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Right: Settings */}
                <div className="flex justify-center">
                    <div className="w-full max-w-sm sticky top-24">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1">
                            <FreepikSettings
                                settings={settings}
                                onChange={setSettings}
                                onClose={() => { }} // No close action needed here as it's static
                                onUpscale={runUpscale}
                                isUpscaling={isUpscaling}
                            />
                            {/* Override the absolute positioning styles of the component for this page if necessary, or wrap it properly */}
                        </div>
                        <div className="mt-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-500">
                            <h4 className="font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <ImageIcon size={12} />
                                Tips
                            </h4>
                            <ul className="space-y-1 list-disc pl-4">
                                <li>Use "Creativity" to add new details.</li>
                                <li>Use "Resemblance" to keep the original identity.</li>
                                <li>"Illusio" engine is best for artistic styles.</li>
                                <li>"Sharpy" helps with photorealism.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MagnificPage;
