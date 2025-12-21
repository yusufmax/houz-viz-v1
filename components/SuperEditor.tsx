import React, { useState, useEffect, useRef } from 'react';
import {
    Zap,
    Image as ImageIcon,
    Maximize2,
    Download,
    Loader2,
    Trash2,
    History,
    ChevronDown,
    ChevronUp,
    LayoutTemplate,
    Pencil,
    Maximize,
    Package,
    Mic,
    MicOff,
    Sun,
    Layout,
    Layers,
    Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import { useLanguage } from '../LanguageContext';
import {
    RenderStyle,
    Atmosphere,
    CameraAngle,
    AspectRatio,
    SceneElements,
    GenerationSettings,
    SuperRenderStyle,
    SuperAtmosphere,
    SuperModeSettings
} from '../types';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as quotaService from '../services/quotaService';
import ImageUpload from './ImageUpload';
import ProductCustomization from './ProductCustomization';
import BeforeAfter from './BeforeAfter';
import FullScreenPreview from './FullScreenPreview';
import DrawEditor from './DrawEditor';
import BatchImageUpload from './BatchImageUpload';
import BatchResults from './BatchResults';
import { RealtimeService } from '../services/realtimeService';
import { AudioManager } from '../services/audioManager';

const STYLE_PREVIEWS: Record<SuperRenderStyle, string> = {
    [SuperRenderStyle.None]: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&q=80',
    [SuperRenderStyle.Minimalist]: 'https://images.unsplash.com/photo-1544117518-30df578eeaf6?w=500&q=80',
    [SuperRenderStyle.Lifestyle]: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
    [SuperRenderStyle.Luxury]: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    [SuperRenderStyle.Action]: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80',
    [SuperRenderStyle.Cinematic]: 'https://images.unsplash.com/photo-1491633582673-4916538e1b9b?w=500&q=80',
    [SuperRenderStyle.FlatLay]: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=500&q=80',
    [SuperRenderStyle.Macro]: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'
};

const SuperEditor: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();

    // Basic State
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState<SuperRenderStyle>(SuperRenderStyle.Minimalist);
    const [atmosphere, setAtmosphere] = useState<SuperAtmosphere[]>([SuperAtmosphere.StudioSoftbox]);
    const [camera, setCamera] = useState<CameraAngle>(CameraAngle.Default);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('Original');
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUpscaling, setIsUpscaling] = useState(false);

    // Super Mode Specific
    const [superSettings, setSuperSettings] = useState<SuperModeSettings>({
        productCategory: '',
        lighting: SuperAtmosphere.StudioSoftbox,
        background: '',
        focus: 'Object',
        model: 'gemini-2.5-flash',
        lightingIntensity: 'Balanced',
        lightingColor: '#ffffff',
        groundMaterial: '',
        environmentProps: '',
        cameraAngle: 'Hero shot (45 degree)'
    });

    // UI State
    const [showStyles, setShowStyles] = useState(true);
    const [previewImage, setPreviewImage] = useState('');
    const [drawingTarget, setDrawingTarget] = useState<'source' | 'result' | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    // Refs
    const realtimeServiceRef = useRef<RealtimeService | null>(null);
    const audioManagerRef = useRef<AudioManager | null>(null);

    useEffect(() => {
        if (user) {
            loadHistory();
            loadQuota();
        }
    }, [user]);

    const loadQuota = async () => {
        if (!user) return;
        const q = await quotaService.getUserQuota(user.id);
        if (q) setQuota({ used: q.used, limit: q.quota });
    };

    const loadHistory = async () => {
        if (!user) return;
        try {
            const items = await historyService.getHistory(user.id);
            setHistory(items);
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    const handleGenerate = async () => {
        if (!user) {
            alert("Sign in required");
            return;
        }
        if (!sourceImage && !prompt) {
            alert("Provide a product image or prompt");
            return;
        }

        setIsGenerating(true);
        try {
            const settings: GenerationSettings = {
                prompt: prompt || `High-end product photography of ${superSettings.productCategory || 'product'}`,
                style: style as any,
                atmosphere: atmosphere as any,
                camera,
                aspectRatio,
                sceneElements: {
                    people: false,
                    cars: false,
                    clouds: false,
                    vegetation: false,
                    city: false,
                    motionBlur: false,
                    enhanceFacade: false
                },
                model: superSettings.model || 'gemini-2.5-flash',
                superMode: superSettings
            };

            const result = sourceImage
                ? await geminiService.editImage(sourceImage, settings)
                : await geminiService.generateImage(settings);

            setResultImage(result);

            // Save to history
            await historyService.saveToHistory(user.id, result, settings.prompt, style as any);
            loadHistory();
            loadQuota();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleAtmosphere = (val: SuperAtmosphere) => {
        setAtmosphere(prev => {
            if (val === SuperAtmosphere.None) return [SuperAtmosphere.None];
            const isSelected = prev.includes(val);
            let newSelection = isSelected ? prev.filter(a => a !== val) : [...prev.filter(a => a !== SuperAtmosphere.None), val];
            if (newSelection.length > 2) newSelection.shift();
            return newSelection.length === 0 ? [SuperAtmosphere.None] : newSelection;
        });
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-slate-950 text-slate-100 overflow-hidden">
            {/* COLUMN 1: CONTROLS (50%) */}
            <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-800 p-4 lg:p-6 overflow-y-auto overscroll-contain pb-24 lg:pb-6 scrollbar-thin scrollbar-thumb-slate-700">
                <div className="max-w-3xl mx-auto w-full space-y-8">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <Package className="text-indigo-400" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Super Mode: Marketing AI</h1>
                                <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Product Photography & Campaigns</p>
                            </div>
                        </div>
                        {quota && (
                            <div className="bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
                                <Zap size={12} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-xs font-bold">{quota.limit - quota.used} Credits</span>
                            </div>
                        )}
                    </div>

                    {/* Product Source */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-semibold uppercase text-xs">
                            <ImageIcon size={16} />
                            <span>Product Image</span>
                        </div>
                        <div className="h-48">
                            <ImageUpload
                                selectedImage={sourceImage}
                                onImageSelected={setSourceImage}
                                label="Upload Raw Product"
                            />
                        </div>
                    </section>

                    {/* Main Controls */}
                    <section className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles size={14} className="text-indigo-400" /> Style Preset
                                </label>
                                <button onClick={() => setShowStyles(!showStyles)} className="text-slate-500 hover:text-white">
                                    {showStyles ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>

                            {showStyles && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {Object.entries(STYLE_PREVIEWS).map(([s, img]) => (
                                        <button
                                            key={s}
                                            onClick={() => setStyle(s as SuperRenderStyle)}
                                            className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${style === s ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-800 hover:border-slate-600'
                                                }`}
                                        >
                                            <img src={img} alt={s} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 transition-opacity ${style === s ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <span className="text-[9px] font-bold text-white uppercase truncate">{s === 'None' ? 'Raw' : s}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Prompt Input */}
                        <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Layout size={14} className="text-indigo-400" /> Campaign Prompt
                                </label>
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the mood, storytelling, or specific marketing angle..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-indigo-500 h-24 resize-none transition-all"
                            />
                        </div>


                        {/* Advanced Product Controls */}
                        <ProductCustomization settings={superSettings} onChange={setSuperSettings} />

                        {/* Aspect Ratio */}
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2"><LayoutTemplate size={14} /> Aspect Ratio</label>
                            <div className="grid grid-cols-3 gap-1">
                                {['Original', '1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => (
                                    <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`px-2 py-2 text-xs rounded border transition-all ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{ratio}</button>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="pt-6">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`w-full py-6 rounded-xl font-bold text-xl shadow-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 ${isGenerating
                                    ? 'bg-slate-700 text-slate-400'
                                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white shadow-indigo-500/40 ring-1 ring-white/10'
                                    }`}
                            >
                                {isGenerating ? <><Loader2 size={24} className="animate-spin" />Rendering...</> : <><Zap size={24} fill="currentColor" />Generate Campaign</>}
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* COLUMN 2: RESULT (50%) */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4 p-4 lg:p-6 bg-slate-950">
                <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl flex-1 flex flex-col relative overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                            <Maximize2 size={18} />
                            <h2>Final Visualization</h2>
                        </div>
                        {resultImage && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreviewImage(resultImage)}
                                    className="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
                                >
                                    <Maximize size={14} />
                                </button>
                                <button
                                    onClick={async () => {
                                        const response = await fetch(resultImage);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `product-campaign-${Date.now()}.png`;
                                        link.click();
                                    }}
                                    className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors"
                                >
                                    <Download size={14} /> Download
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden relative group">
                        {isGenerating ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400 bg-slate-950/80 z-10">
                                <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-mono tracking-widest text-indigo-300">COMPUTING MARKETERS VISION...</p>
                            </div>
                        ) : resultImage ? (
                            sourceImage ? (
                                <BeforeAfter beforeImage={sourceImage} afterImage={resultImage} />
                            ) : (
                                <img src={resultImage} alt="Result" className="w-full h-full object-contain" />
                            )
                        ) : (
                            <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-700 text-center animate-pulse">
                                <ImageIcon size={64} className="mx-auto mb-4 opacity-10" />
                                <p className="text-lg font-medium opacity-20">Creative assets will appear here</p>
                                <p className="text-xs opacity-10 mt-2">Upload a product and set the mood to begin</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {previewImage && <FullScreenPreview imageUrl={previewImage} onClose={() => setPreviewImage('')} />}
        </div>
    );
};

export default SuperEditor;
