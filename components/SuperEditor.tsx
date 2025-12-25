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
    Sparkles,
    Users,
    UserCircle
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
    SuperModeSettings,
    CameraLens
} from '../types';
import * as geminiService from '../services/geminiService';
import { historyService } from '../services/historyService';
import { quotaService } from '../services/quotaService';
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
    [SuperRenderStyle.Macro]: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    [SuperRenderStyle.OnHand]: 'https://images.unsplash.com/photo-1589118949245-7d38baf380d6?w=500&q=80',
    [SuperRenderStyle.Everyday]: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=500&q=80',
    [SuperRenderStyle.InAction]: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80',
    [SuperRenderStyle.SurrealViz]: 'https://images.unsplash.com/photo-1550684847-75bdda21cc95?w=500&q=80'
};

const PRESET_MODELS = [
    { id: 'm1', url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&q=80', label: 'Female Studio' },
    { id: 'm2', url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80', label: 'Female Lifestyle' },
    { id: 'm3', url: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=500&q=80', label: 'Male Casual' },
    { id: 'm4', url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=500&q=80', label: 'Male Suit' },
    { id: 'm5', url: 'https://images.unsplash.com/photo-1529139513066-b209b4a995a4?w=500&q=80', label: 'Editorial' },
    { id: 'm6', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80', label: 'Minimalist' }
];

const SuperEditor: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();

    // Basic State
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState<SuperRenderStyle>(SuperRenderStyle.Minimalist);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('Original');
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [batchResults, setBatchResults] = useState<any[]>([]);
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
        cameraAngle: 'Hero shot (45 degree)',
        lens: CameraLens.Portrait,
        isMoodboard: false,
        generateMultiAngle: false,
        isVirtualTryOn: false,
        garmentImage: null,
        modelGen: {
            age: '20s',
            skinTone: 'Natural',
            nationality: 'Any',
            pose: 'Standing, facing camera'
        }
    });

    // UI State
    const [showStyles, setShowStyles] = useState(true);
    const [showModelGen, setShowModelGen] = useState(false);
    const [isGeneratingModel, setIsGeneratingModel] = useState(false);
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

    const handleGenerateModel = async () => {
        if (!user) return;
        setIsGeneratingModel(true);
        try {
            const result = await geminiService.generateCustomModel(superSettings.modelGen!);
            setSourceImage(result);
            setShowModelGen(false);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Model generation failed");
        } finally {
            setIsGeneratingModel(false);
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
            setBatchResults([]);

            const settings: GenerationSettings = {
                prompt: prompt || `High-end product photography of ${superSettings.productCategory || 'product'}`,
                style: style as any,
                atmosphere: [],
                camera: CameraAngle.Default,
                aspectRatio,
                styleReferenceImage: styleReferenceImage,
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

            let result = '';

            if (superSettings.generateMultiAngle) {
                // Batch Generation for 4 angles
                const angles = superSettings.multiAngleSelection && superSettings.multiAngleSelection.length > 0
                    ? superSettings.multiAngleSelection
                    : ['Profile shot', 'Front shot', 'Perspective view', 'Macro detail'];

                const batchPromises = angles.map(angle => {
                    const batchSettings = {
                        ...settings,
                        superMode: {
                            ...superSettings,
                            cameraAngle: angle,
                            generateMultiAngle: false
                        }
                    };
                    return sourceImage
                        ? geminiService.editImage(sourceImage, batchSettings)
                        : geminiService.generateImage(batchSettings);
                });

                const results = await Promise.all(batchPromises);
                setBatchResults(results.map((r, i) => ({ input: sourceImage || '', output: r, index: i })));
                result = results[0];
                setResultImage(result);
            } else {
                result = sourceImage
                    ? await geminiService.editImage(sourceImage, settings)
                    : await geminiService.generateImage(settings);

                setResultImage(result);
            }

            // Save to history
            await historyService.addToHistory(user.id, {
                id: Date.now().toString(),
                url: result,
                prompt: settings.prompt,
                style: style as any,
                timestamp: Date.now(),
                metadata: {
                    model: settings.model,
                    aspectRatio: settings.aspectRatio,
                    superMode: true
                }
            });
            loadHistory();
            loadQuota();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Generation failed");
        } finally {
            setIsGenerating(false);
        }
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
                                <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase tracking-tight">Marketing AI</h1>
                                <p className="text-[11px] text-indigo-400 font-black tracking-[0.2em] uppercase opacity-80">Campaign Engine</p>
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-indigo-400 font-semibold uppercase text-xs">
                                <ImageIcon size={16} />
                                <span>{superSettings.isVirtualTryOn ? 'Model & Outfit' : 'Product Image'}</span>
                            </div>
                            <button
                                onClick={() => setSuperSettings(prev => ({ ...prev, isVirtualTryOn: !prev.isVirtualTryOn }))}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${superSettings.isVirtualTryOn
                                    ? 'bg-indigo-600 border-indigo-400 text-white'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <Sparkles size={12} />
                                {superSettings.isVirtualTryOn ? 'Virtual Try-On: ON' : 'Try-On Mode'}
                            </button>
                        </div>

                        <div className={`grid gap-4 transition-all ${superSettings.isVirtualTryOn ? 'grid-cols-2 h-44' : 'grid-cols-1 h-48'}`}>
                            <div className="relative">
                                <ImageUpload
                                    selectedImage={sourceImage}
                                    onImageSelected={setSourceImage}
                                    label={superSettings.isVirtualTryOn ? "Upload Model Image" : "Upload Raw Product"}
                                />
                                {superSettings.isVirtualTryOn && <div className="absolute top-2 left-2 px-2 py-0.5 bg-indigo-600/80 backdrop-blur rounded text-[8px] font-bold uppercase">Base Model</div>}
                            </div>

                            {superSettings.isVirtualTryOn && (
                                <div className="relative animate-in slide-in-from-right-4 duration-300">
                                    <ImageUpload
                                        selectedImage={superSettings.garmentImage || null}
                                        onImageSelected={(img) => setSuperSettings(prev => ({ ...prev, garmentImage: img }))}
                                        label="Upload Clothing"
                                    />
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600/80 backdrop-blur rounded text-[8px] font-bold uppercase">Garment</div>
                                </div>
                            )}
                        </div>

                        {superSettings.isVirtualTryOn && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Users size={12} className="text-indigo-400" /> Quick Model Library
                                    </label>
                                    <span className="text-[9px] text-slate-600 font-medium">Select a preset to begin</span>
                                </div>
                                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
                                    {PRESET_MODELS.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSourceImage(m.url)}
                                            className={`flex-shrink-0 group relative w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${sourceImage === m.url ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-600'
                                                }`}
                                        >
                                            <img src={m.url} alt={m.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className={`absolute inset-0 bg-indigo-600/20 border-2 border-indigo-500 transition-opacity ${sourceImage === m.url ? 'opacity-100' : 'opacity-0'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {superSettings.isVirtualTryOn && (
                            <div className="space-y-4 pt-2">
                                <button
                                    onClick={() => setShowModelGen(!showModelGen)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${showModelGen ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                >
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                                        <UserCircle size={14} /> AI Model Generator
                                    </div>
                                    <Sparkles size={14} className={showModelGen ? 'animate-pulse' : ''} />
                                </button>

                                {showModelGen && (
                                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-5 animate-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Nationality</label>
                                                <select
                                                    value={superSettings.modelGen?.nationality}
                                                    onChange={(e) => setSuperSettings(prev => ({ ...prev, modelGen: { ...prev.modelGen, nationality: e.target.value } }))}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
                                                >
                                                    <option>Any</option>
                                                    <option>European</option>
                                                    <option>Asian</option>
                                                    <option>African</option>
                                                    <option>Middle Eastern</option>
                                                    <option>Latin American</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Age Group</label>
                                                <select
                                                    value={superSettings.modelGen?.age}
                                                    onChange={(e) => setSuperSettings(prev => ({ ...prev, modelGen: { ...prev.modelGen, age: e.target.value } }))}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
                                                >
                                                    <option>Teen</option>
                                                    <option>20s</option>
                                                    <option>30s</option>
                                                    <option>40s</option>
                                                    <option>Senior</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Skin Tone</label>
                                                <select
                                                    value={superSettings.modelGen?.skinTone}
                                                    onChange={(e) => setSuperSettings(prev => ({ ...prev, modelGen: { ...prev.modelGen, skinTone: e.target.value } }))}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
                                                >
                                                    <option>Fair</option>
                                                    <option>Tan</option>
                                                    <option>Dark</option>
                                                    <option>Golden</option>
                                                    <option>Natural</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Pose</label>
                                                <select
                                                    value={superSettings.modelGen?.pose}
                                                    onChange={(e) => setSuperSettings(prev => ({ ...prev, modelGen: { ...prev.modelGen, pose: e.target.value } }))}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
                                                >
                                                    <option>Standing, facing camera</option>
                                                    <option>Side profile</option>
                                                    <option>Seated</option>
                                                    <option>Dynamic motion</option>
                                                    <option>Fashion walk</option>
                                                </select>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleGenerateModel}
                                            disabled={isGeneratingModel}
                                            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:bg-slate-800 disabled:text-slate-600"
                                        >
                                            {isGeneratingModel ? (
                                                <><Loader2 size={16} className="animate-spin" /> Materializing...</>
                                            ) : (
                                                <><Sparkles size={16} /> Generate & Use Model</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {superSettings.isVirtualTryOn && (
                            <p className="text-[10px] text-slate-500 italic bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                                Tip: For best results, use a model facing forward and clear flat-lay or worn images of clothes.
                            </p>
                        )}
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
                                                <span className="text-[11px] font-black text-white uppercase truncate tracking-wider">{s === 'None' ? 'Raw Style' : s}</span>
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
                                {sourceImage && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const suggestion = await geminiService.analyzeProductImage(sourceImage);
                                                setPrompt(suggestion);
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }}
                                        className="text-[11px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-all bg-indigo-500/5 px-2 py-0.5 rounded-full border border-indigo-500/10"
                                    >
                                        <Sparkles size={12} /> Suggester
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the scene setup, lighting atmosphere, or specific marketing angle..."
                                className="w-full bg-slate-950 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-indigo-500 h-28 resize-none transition-all placeholder:text-slate-700"
                            />
                        </div>

                        {/* Brand Style Reference */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-400 font-semibold uppercase text-xs">
                                <ImageIcon size={16} />
                                <span>Brand Style Reference</span>
                            </div>
                            <div className="h-40">
                                <ImageUpload
                                    selectedImage={styleReferenceImage}
                                    onImageSelected={(img) => setStyleReferenceImage(img)}
                                    label="Upload Brand Style Guidelines"
                                />
                            </div>
                        </section>


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
                                {isGenerating ? <><Loader2 size={24} className="animate-spin" />Building Visuals...</> : <><Zap size={24} fill="currentColor" />Generate Campaign</>}
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* COLUMN 2: RESULT (50%) */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4 p-4 lg:p-6 bg-slate-950">
                <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl flex-1 flex flex-col relative overflow-hidden">
                    {batchResults.length > 0 ? (
                        <BatchResults results={batchResults} onClose={() => setBatchResults([])} />
                    ) : (
                        <>
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                                    <Maximize2 size={18} />
                                    <h2>Final Visualization</h2>
                                    {superSettings.isMoodboard && <span className="text-[11px] font-black bg-purple-600 text-white px-3 py-1 rounded-full animate-pulse tracking-wider">MOODBOARD</span>}
                                    {superSettings.generateMultiAngle && <span className="text-[11px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full animate-pulse tracking-wider">BATCH GENERATION</span>}
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
                        </>
                    )}
                </div>

                {previewImage && <FullScreenPreview image={previewImage} onClose={() => setPreviewImage('')} />}
            </div>
        </div>
    );
};

export default SuperEditor;
