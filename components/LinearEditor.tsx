
import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Image as ImageIcon, Download, Maximize2,
  Zap, Cloud, Camera, LayoutTemplate, Loader2,
  Users, Car, Wind, Building2, Trees, Wand2, Palette, Pencil, Sun, Moon, CloudRain, CloudFog, Snowflake, Eye, CloudLightning, Flower, Leaf, ThermometerSun, History as HistoryIcon, ChevronRight, Trash2, Upload, FileJson, Flame, Lightbulb, Coffee, Aperture, Lock, Sparkles, Layers, Film
} from 'lucide-react';
import ImageUpload from './ImageUpload';
import BeforeAfter from './BeforeAfter';
import DrawEditor from './DrawEditor';
import FullScreenPreview from './FullScreenPreview';
import BatchImageUpload from './BatchImageUpload';
import BatchResults from './BatchResults';
import { AspectRatio, RenderStyle, Atmosphere, CameraAngle, GenerationSettings, SceneElements, HistoryItem, KlingModel, VideoGenerationSettings, VideoQuota } from '../types';
import { generateImage, editImage, enhancePrompt, upscaleImage } from '../services/geminiService';
import { upscaleImageReplicate } from '../services/replicateService';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../contexts/AuthProvider';
import { quotaService } from '../services/quotaService';
import { videoQuotaService } from '../services/videoQuotaService';
import { useAgentic } from '../contexts/AgenticContext';
import { fetchUserReferenceImages, ReferenceImage } from '../services/referenceImageService';

const STYLE_LIBRARY = [
  // Living Complex / House
  { name: 'Modern Villa', url: 'https://images.unsplash.com/photo-1600596542815-3ad196bb8700?w=200&q=80' },
  { name: 'Luxury Apt', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=80' },
  { name: 'Townhouse', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&q=80' },
  // Commercial
  { name: 'Office Tower', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&q=80' },
  { name: 'Retail Store', url: 'https://images.unsplash.com/photo-1564069114553-7215e1ff1890?w=200&q=80' },
  { name: 'Museum', url: 'https://images.unsplash.com/photo-1503594384566-461fe158e797?w=200&q=80' },
  // Cultural Styles
  { name: 'Pan Arabic', url: 'https://images.unsplash.com/photo-1544211210-082b71d0630c?w=200&q=80' },
  { name: 'Asian Zen', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=200&q=80' },
  { name: 'Mediterranean', url: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=200&q=80' },
  { name: 'Brutalist', url: 'https://images.unsplash.com/photo-1534237710431-e2fc698436d0?w=200&q=80' }
];

interface LinearEditorProps {
  showInstructions?: boolean;
}

const GuideTooltip = ({ text, className, side = 'left' }: { text: string, className?: string, side?: 'left' | 'right' | 'top' | 'bottom' }) => {
  const { t } = useLanguage();
  return (
    <div className={`absolute z-50 bg-indigo-600/90 backdrop-blur text-white text-xs p-3 rounded-lg shadow-xl border border-indigo-400 max-w-[220px] animate-pulse ${className}`}>
      {side === 'left' && <div className="absolute top-1/2 -left-1 w-2 h-2 bg-indigo-600/90 transform -translate-y-1/2 rotate-45 border-l border-b border-indigo-400"></div>}
      {side === 'right' && <div className="absolute top-1/2 -right-1 w-2 h-2 bg-indigo-600/90 transform -translate-y-1/2 rotate-45 border-r border-t border-indigo-400"></div>}
      {side === 'top' && <div className="absolute -top-1 left-1/2 w-2 h-2 bg-indigo-600/90 transform -translate-x-1/2 rotate-45 border-l border-t border-indigo-400"></div>}
      {side === 'bottom' && <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-indigo-600/90 transform -translate-x-1/2 rotate-45 border-r border-b border-indigo-400"></div>}
      <span className="font-semibold block mb-1">{t('tip')}:</span>
      {text}
    </div>
  );
};

const LinearEditor: React.FC<LinearEditorProps> = ({ showInstructions }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { setToolExecutor } = useAgentic();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);

  // Video Generation
  const [videoSettings, setVideoSettings] = useState<VideoGenerationSettings>({
    model: KlingModel.V2_5_Turbo,
    duration: 5,
    aspectRatio: '16:9',
    prompt: ''
  });
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoQuota, setVideoQuota] = useState<VideoQuota | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Reference Images: Use custom or fallback to defaults
  const [customReferenceImages, setCustomReferenceImages] = useState<ReferenceImage[]>([]);
  const styleLibrary = customReferenceImages.length > 0
    ? customReferenceImages.map(ref => ({ name: ref.name, url: ref.image_url }))
    : STYLE_LIBRARY;

  // Drawing
  const [drawingTarget, setDrawingTarget] = useState<'source' | 'result' | null>(null);

  // Settings
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<RenderStyle>(RenderStyle.None);
  const [atmosphere, setAtmosphere] = useState<Atmosphere[]>([]);
  const [camera, setCamera] = useState<CameraAngle>(CameraAngle.Default);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('Original');
  const [sceneElements, setSceneElements] = useState<SceneElements>({
    people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: false
  });
  const [model, setModel] = useState<string>('gemini-2.5-flash-image');
  const [resolution, setResolution] = useState<string>('4K');

  // Quota state
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchImages, setBatchImages] = useState<string[]>([]);
  const [batchResults, setBatchResults] = useState<Array<{ input: string, output: string | null, index: number }>>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [showBatchResults, setShowBatchResults] = useState(false);

  // Fullscreen
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Setup tool executor for Agentic Mode
  useEffect(() => {
    setToolExecutor((toolName: string, args: any) => {
      console.log(`🔧 Executing tool: ${toolName}`, args);

      switch (toolName) {
        case 'selectStyle':
          if (args.style && Object.values(RenderStyle).includes(args.style)) {
            setStyle(args.style as RenderStyle);
            console.log(`✅ Style changed to: ${args.style}`);
          }
          break;

        case 'setAtmosphere':
          if (args.atmospheres && Array.isArray(args.atmospheres)) {
            const validAtmospheres = args.atmospheres
              .filter((atm: string) => Object.values(Atmosphere).includes(atm as Atmosphere))
              .slice(0, 3); // Max 3 atmospheres
            if (validAtmospheres.length > 0) {
              setAtmosphere(validAtmospheres as Atmosphere[]);
              console.log(`✅ Atmospheres changed to: ${validAtmospheres.join(', ')}`);
            }
          }
          break;

        case 'setCameraAngle':
          if (args.angle && Object.values(CameraAngle).includes(args.angle)) {
            setCamera(args.angle as CameraAngle);
            console.log(`✅ Camera angle changed to: ${args.angle}`);
          }
          break;

        case 'setModel':
          if (args.model) {
            setModel(args.model);
            console.log(`✅ Model changed to: ${args.model}`);
          }
          break;

        case 'setResolution':
          if (args.resolution) {
            setResolution(args.resolution);
            console.log(`✅ Resolution changed to: ${args.resolution}`);
          }
          break;

        case 'setAspectRatio':
          if (args.aspectRatio) {
            setAspectRatio(args.aspectRatio);
            console.log(`✅ Aspect ratio changed to: ${args.aspectRatio}`);
          }
          break;

        case 'toggleSceneElement':
          if (args.element && typeof args.enabled === 'boolean') {
            setSceneElements(prev => ({
              ...prev,
              [args.element]: args.enabled
            }));
            console.log(`✅ Scene element ${args.element} ${args.enabled ? 'enabled' : 'disabled'}`);
          }
          break;

        case 'setSceneElements':
          if (args.elements && typeof args.elements === 'object') {
            setSceneElements(prev => ({
              ...prev,
              ...args.elements
            }));
            const changed = Object.entries(args.elements)
              .map(([key, val]) => `${key}: ${val ? 'on' : 'off'}`)
              .join(', ');
            console.log(`✅ Scene elements updated: ${changed}`);
          }
          break;

        case 'generateImage':
          if (args.prompt && sourceImage) {
            setPrompt(args.prompt);
            // Trigger generation after a short delay to let prompt update
            setTimeout(() => handleGenerate(), 100);
            console.log(`✅ Generating image with prompt: ${args.prompt}`);
          }
          break;

        case 'navigateToMode':
          console.log(`ℹ️ Navigate to ${args.mode} mode - not implemented in Linear Editor`);
          break;

        default:
          console.warn(`⚠️ Unknown tool: ${toolName}`);
      }
    });
  }, [sourceImage, setToolExecutor, setStyle, setAtmosphere, setCamera, setModel, setResolution, setAspectRatio, setSceneElements, setPrompt]);

  // Load history and custom reference images on mount
  useEffect(() => {
    const saved = localStorage.getItem('arch_genius_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { }
    }

    // Fetch user's custom reference images
    if (user) {
      fetchUserReferenceImages(user.id).then(refs => {
        setCustomReferenceImages(refs);
      }).catch(err => {
        console.error('Failed to load custom reference images:', err);
      });
    }
  }, [user]);

  // Load video quota
  useEffect(() => {
    if (user) {
      videoQuotaService.getUserVideoQuota(user.id).then(quota => {
        setVideoQuota(quota);
      }).catch(err => {
        console.error('Failed to load video quota:', err);
      });
    }
  }, [user]);

  const saveToHistory = (url: string, usedPrompt: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      url,
      prompt: usedPrompt,
      timestamp: Date.now(),
      style
    };

    // Adaptive Storage Saving
    const trySave = (items: HistoryItem[]) => {
      try {
        const str = JSON.stringify(items);
        localStorage.setItem('arch_genius_history', str);
        setHistory(items);
      } catch (e) {
        if (items.length > 1) {
          // Remove the last item (oldest) and try again
          trySave(items.slice(0, items.length - 1));
        } else {
          console.error("Storage full, could not save history.");
          setHistory(items);
        }
      }
    };

    trySave([newItem, ...history].slice(0, 10));
  };

  const clearHistory = () => {
    if (confirm("Clear all generation history? Make sure to Export first!")) {
      setHistory([]);
      localStorage.removeItem('arch_genius_history');
    }
  };

  const exportHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "arch_genius_history.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          const merged = [...imported, ...history];
          setHistory(merged);
          // Try to save merged, if fail, just show in UI
          try {
            localStorage.setItem('arch_genius_history', JSON.stringify(merged.slice(0, 10)));
          } catch (err) {
            alert("Imported history displayed but LocalStorage is full. Export to save permanently.");
          }
        }
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const toggleElement = (key: keyof SceneElements) => {
    setSceneElements(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAtmosphere = (val: Atmosphere) => {
    setAtmosphere(prev => {
      if (val === Atmosphere.None) return [Atmosphere.None];

      const isSelected = prev.includes(val);
      let newSelection = [...prev];

      if (isSelected) {
        newSelection = newSelection.filter(a => a !== val);
      } else {
        newSelection = newSelection.filter(a => a !== Atmosphere.None);
        if (newSelection.length >= 3) newSelection.shift();
        newSelection.push(val);
      }

      if (newSelection.length === 0) return [Atmosphere.None];
      return newSelection;
    });
  };

  const handleEnhancePrompt = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt);
      setPrompt(enhanced);
    } catch (error) {
      console.error("Failed to enhance prompt", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const loadQuota = async () => {
    if (!user) return;
    const q = await quotaService.getUserQuota(user.id);
    if (q) {
      setQuota({ used: q.used, limit: q.quota });
    }
  };

  useEffect(() => {
    if (user) {
      loadQuota();
    }
  }, [user]);

  const executeGeneration = async (overrideSource?: string, settingsOverride?: Partial<GenerationSettings>) => {
    if (!user) {
      alert("Please sign in to generate images.");
      return;
    }

    // Check Quota
    const canGenerate = await quotaService.checkQuota(user.id);
    if (!canGenerate) {
      alert("🚫 Quota Exceeded! You have used all your generation credits. Please contact support or wait for a reset.");
      return;
    }

    const src = overrideSource || sourceImage;
    if (!prompt && !src && !styleReferenceImage && !settingsOverride?.prompt) {
      alert("Please provide at least a text prompt, an image, or a style reference.");
      return;
    }

    setIsGenerating(true);
    const settings: GenerationSettings = {
      prompt: prompt || "High quality architecture render",
      style,
      atmosphere,
      camera,
      aspectRatio,
      sceneElements,
      styleReferenceImage,
      model,
      resolution,
      ...settingsOverride
    };

    try {
      let resultUrl = '';
      if (src || styleReferenceImage) {
        resultUrl = await editImage(src, settings);
      } else {
        resultUrl = await generateImage(settings);
      }

      // Increment Quota on Success
      await quotaService.incrementUsage(user.id);
      loadQuota(); // Refresh UI

      setResultImage(resultUrl);
      saveToHistory(resultUrl, settings.prompt);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const processBatch = async () => {
    if (!user) {
      alert("Please sign in to generate images.");
      return;
    }

    if (batchImages.length === 0) {
      alert("Please upload images first.");
      return;
    }

    // Check quota
    const requiredCredits = batchImages.length;
    const quotaData = await quotaService.getUserQuota(user.id);

    if (!quotaData || (quotaData.quota - quotaData.used) < requiredCredits) {
      const remaining = quotaData ? (quotaData.quota - quotaData.used) : 0;
      alert(`🚫 Not enough credits! Need ${requiredCredits}, have ${remaining}.\n\nPlease upgrade your plan or contact support.`);
      return;
    }

    // Confirm with user
    const confirmed = window.confirm(
      `This batch will process ${batchImages.length} image${batchImages.length > 1 ? 's' : ''} and use ${requiredCredits} credit${requiredCredits > 1 ? 's' : ''}.\n\nContinue?`
    );

    if (!confirmed) return;

    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: batchImages.length });
    const results: Array<{ input: string, output: string | null, index: number }> = [];

    const settings: GenerationSettings = {
      prompt: prompt || "High quality architecture render",
      style,
      atmosphere,
      camera,
      aspectRatio,
      sceneElements,
      styleReferenceImage,
      model,
      resolution
    };

    for (let i = 0; i < batchImages.length; i++) {
      setBatchProgress({ current: i + 1, total: batchImages.length });

      try {
        const result = await editImage(batchImages[i], settings);
        results.push({ input: batchImages[i], output: result, index: i });
        await quotaService.incrementUsage(user.id);
      } catch (error) {
        console.error(`Failed to process image ${i + 1}:`, error);
        results.push({ input: batchImages[i], output: null, index: i });
      }
    }

    setBatchResults(results);
    setIsBatchProcessing(false);
    setShowBatchResults(true);
    loadQuota(); // Refresh quota display
  };

  const handleGenerate = () => executeGeneration();

  const handleGenerateVideo = async () => {
    if (!resultImage || !user) {
      alert('Please generate an image first and sign in');
      return;
    }

    try {
      setIsGeneratingVideo(true);

      // Check quota
      const canGenerate = await videoQuotaService.canGenerateVideo(user.id);
      if (!canGenerate) {
        alert('Video quota exceeded. Please upgrade or wait for monthly reset.');
        setIsGeneratingVideo(false);
        return;
      }

      // Call Netlify function to generate video
      const response = await fetch('/.netlify/functions/kling-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          image: resultImage,
          model: videoSettings.model,
          duration: videoSettings.duration,
          aspectRatio: videoSettings.aspectRatio,
          prompt: videoSettings.prompt,
          cfgScale: videoSettings.cfgScale || 0.5
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start video generation');
      }

      const { task_id } = await response.json();
      setVideoTaskId(task_id);

      // Increment usage
      await videoQuotaService.incrementVideoUsage(user.id);

      // Refresh quota
      const updatedQuota = await videoQuotaService.getUserVideoQuota(user.id);
      setVideoQuota(updatedQuota);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const pollResponse = await fetch('/.netlify/functions/kling-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'poll',
              task_id
            })
          });

          if (!pollResponse.ok) {
            throw new Error('Failed to check video status');
          }

          const status = await pollResponse.json();

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setGeneratedVideoUrl(status.video_url);
            setIsGeneratingVideo(false);
            setVideoTaskId(null);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            alert('Video generation failed: ' + (status.error_message || 'Unknown error'));
            setIsGeneratingVideo(false);
            setVideoTaskId(null);
          }
        } catch (error: any) {
          console.error('Polling error:', error);
          clearInterval(pollInterval);
          setIsGeneratingVideo(false);
          setVideoTaskId(null);
        }
      }, 5000); // Poll every 5 seconds

    } catch (error: any) {
      console.error('Video generation error:', error);
      alert('Failed to generate video: ' + error.message);
      setIsGeneratingVideo(false);
    }
  };

  const handleUpscale = async () => {
    if (!resultImage) return;
    setIsUpscaling(true);
    try {
      // Use Recraft Crisp Upscale via Replicate
      const upscaled = await upscaleImageReplicate(resultImage);
      setResultImage(upscaled);
      saveToHistory(upscaled, "Upscaled: " + prompt);
    } catch (e: any) {
      console.error("Upscale failed", e);
      alert(`Upscale failed: ${e.message}`);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleDrawSave = (newImage: string) => {
    if (drawingTarget === 'source') {
      setSourceImage(newImage);
    } else if (drawingTarget === 'result') {
      setSourceImage(newImage);
      setResultImage(null);
    }
    setDrawingTarget(null);
  };

  const handleDrawRender = (newImage: string, editPrompt?: string, refImage?: string | null, ratio?: AspectRatio) => {
    setSourceImage(newImage);
    if (drawingTarget === 'result') {
      setResultImage(null);
    }
    if (editPrompt) setPrompt(editPrompt);
    if (refImage) setStyleReferenceImage(refImage);
    if (ratio) setAspectRatio(ratio);
    executeGeneration(newImage);
  };

  const convertUrlToBase64 = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => setStyleReferenceImage(reader.result as string);
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Failed to load style image");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 pb-safe relative overflow-y-auto lg:overflow-hidden">


      {/* Full Screen Preview */}
      <FullScreenPreview
        image={previewImage}
        beforeImage={previewImage === resultImage ? (sourceImage || undefined) : undefined}
        onClose={() => setPreviewImage(null)}
      />

      {/* Draw Editor Modal */}
      {drawingTarget && (
        <DrawEditor
          initialImage={drawingTarget === 'source' ? sourceImage : resultImage}
          onSave={handleDrawSave}
          onRender={handleDrawRender}
          onClose={() => setDrawingTarget(null)}
        />
      )}

      {/* History Sidebar */}
      <div className={`absolute left-0 top-4 bottom-4 bg-slate-900/95 border-r border-slate-700 z-30 transition-all duration-300 flex flex-col ${showHistory ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}`}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-200 flex items-center gap-2"><HistoryIcon size={16} /> {t('history')}</h3>
          <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-800 rounded"><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center justify-around p-2 border-b border-slate-800 bg-slate-950/50">
          <button onClick={exportHistory} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex flex-col items-center">
            <Download size={12} /> {t('export')}
          </button>
          <label className="text-[10px] text-emerald-400 hover:text-emerald-300 flex flex-col items-center cursor-pointer">
            <Upload size={12} /> {t('import')}
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={importHistory} />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {history.length === 0 && <div className="text-slate-500 text-xs text-center py-4">No history yet</div>}
          {history.map(item => (
            <div key={item.id} className="bg-slate-800 rounded border border-slate-700 overflow-hidden group relative">
              <img src={item.url} alt="History" className="w-full h-32 object-cover" />
              <div className="p-2">
                <p className="text-[10px] text-slate-400 line-clamp-2">{item.prompt}</p>
                <p className="text-[9px] text-slate-600 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
              </div>
              <button
                onClick={() => { setSourceImage(item.url); setShowHistory(false); }}
                className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {t('load')}
              </button>
            </div>
          ))}
        </div>
        {history.length > 0 && (
          <div className="p-2 border-t border-slate-700">
            <button onClick={clearHistory} className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:bg-red-900/20 p-2 rounded">
              <Trash2 size={14} /> {t('clear')} {t('history')}
            </button>
          </div>
        )}
      </div>

      {/* History Toggle */}
      {!showHistory && (
        <button
          onClick={() => setShowHistory(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-slate-800 border border-l-0 border-slate-700 p-2 rounded-r-lg z-20 hover:bg-indigo-600 transition-colors shadow-lg"
          title={t('history')}
        >
          <HistoryIcon size={20} className="text-white" />
        </button>
      )}

      {/* COLUMN 1: SOURCE */}
      <div className="w-full lg:w-1/4 flex flex-col gap-4 min-h-[300px] ml-0 transition-all relative h-auto lg:h-full min-h-0 shrink-0 lg:shrink">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 flex-1 flex flex-col relative">
          {showInstructions && <GuideTooltip text={t('guideSource')} className="top-2 right-2 left-auto" side="bottom" />}

          <div className="flex items-center justify-between mb-4 text-indigo-400 font-semibold">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} />
              <h2>{t('source')}</h2>
            </div>
            <div className="flex gap-1">
              {sourceImage && (
                <button
                  onClick={() => setPreviewImage(sourceImage)}
                  className="p-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  title={t('fullScreen')}
                >
                  <Eye size={12} />
                </button>
              )}
              {sourceImage && (
                <button
                  onClick={() => setDrawingTarget('source')}
                  className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
                >
                  <Pencil size={12} /> {t('drawEdit')}
                </button>
              )}
            </div>
          </div>

          {/* Batch Mode Toggle */}
          <div className="mb-4">
            <button
              onClick={() => {
                setBatchMode(!batchMode);
                if (batchMode) {
                  setBatchImages([]);
                  setBatchResults([]);
                }
              }}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${batchMode
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
              <Layers size={16} />
              {batchMode ? 'Batch Mode Active' : 'Enable Batch Mode'}
            </button>
            {batchMode && (
              <p className="text-xs text-slate-400 mt-2 text-center">
                Upload up to 10 images to process with same settings
              </p>
            )}
          </div>

          {/* Conditional: Batch or Single Upload */}
          {batchMode ? (
            <div className="space-y-4">
              <BatchImageUpload
                onImagesSelected={setBatchImages}
                maxImages={10}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-[200px]">
                <ImageUpload
                  selectedImage={sourceImage}
                  onImageSelected={setSourceImage}
                  label={t('dropSketch')}
                />
              </div>

              {!sourceImage && (
                <button
                  onClick={() => setDrawingTarget('source')}
                  className="mt-4 w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm hover:text-indigo-400 hover:border-indigo-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil size={14} /> {t('startBlank')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* COLUMN 2: CONTROLS */}
      <div className="w-full lg:w-1/4 flex flex-col gap-4 relative h-auto lg:h-full min-h-0 shrink-0 lg:shrink">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 h-auto lg:h-full lg:overflow-y-auto custom-scrollbar relative">
          {showInstructions && <GuideTooltip text={t('guideStyles')} className="top-4 right-4" side="right" />}

          <div className="flex items-center gap-2 mb-6 text-indigo-400 font-semibold">
            <Settings size={18} />
            <h2>{t('controls')}</h2>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="space-y-2 relative">
              {showInstructions && <GuideTooltip text={t('guidePrompt')} className="-top-12 left-0" side="top" />}
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-400 uppercase">{t('instructionsLabel')}</label>
                <button
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing || !prompt}
                  className="text-[10px] flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                >
                  <Wand2 size={10} /> {isEnhancing ? t('enhancing') : t('enhance')}
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('instructionsPlaceholder')}
                className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                <Zap size={14} /> Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 text-slate-300"
              >
                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
                <option value="gemini-3-pro-image-preview">Gemini 3 Pro (High Quality)</option>
              </select>
            </div>

            {/* Resolution Selection (Gemini 3 Pro Only) */}
            {model === 'gemini-3-pro-image-preview' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                  <Maximize2 size={14} /> Resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['1K', '2K', '4K'].map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`px-2 py-2 text-xs rounded border transition-all ${resolution === res
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Style Reference & Library */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                <Palette size={14} /> {t('styleRef')}
              </label>
              <ImageUpload
                selectedImage={styleReferenceImage}
                onImageSelected={setStyleReferenceImage}
                label={t('uploadStyleRef')}
                compact
              />
              {/* Style Library Grid */}
              <div className="grid grid-cols-5 gap-1 mt-2">
                {styleLibrary.map((style, idx) => (
                  <button
                    key={idx}
                    onClick={() => convertUrlToBase64(style.url)}
                    className="relative aspect-square rounded overflow-hidden border border-slate-700 hover:border-indigo-500 group"
                    title={style.name}
                  >
                    <img src={style.url} alt={style.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-center text-white p-1 transition-opacity">
                      {style.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Preset */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                <Zap size={14} /> {t('stylePreset')}
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as RenderStyle)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 text-slate-300"
              >
                <option value={RenderStyle.None}>{t('None')}</option>
                <optgroup label="General">
                  <option value={RenderStyle.Photorealistic}>{t(RenderStyle.Photorealistic as any)}</option>
                  <option value={RenderStyle.cinematic}>{t(RenderStyle.cinematic as any)}</option>
                </optgroup>
                <optgroup label="Architectural Styles">
                  <option value={RenderStyle.Modernist}>{t(RenderStyle.Modernist as any)}</option>
                  <option value={RenderStyle.Minimalist}>{t(RenderStyle.Minimalist as any)}</option>
                  <option value={RenderStyle.Brutalism}>{t(RenderStyle.Brutalism as any)}</option>
                  <option value={RenderStyle.Bauhaus}>{t(RenderStyle.Bauhaus as any)}</option>
                  <option value={RenderStyle.Colonial}>{t(RenderStyle.Colonial as any)}</option>
                  <option value={RenderStyle.Rustic}>{t(RenderStyle.Rustic as any)}</option>
                  <option value={RenderStyle.Parametric}>{t(RenderStyle.Parametric as any)}</option>
                  <option value={RenderStyle.IndustrialLoft}>{t(RenderStyle.IndustrialLoft as any)}</option>
                </optgroup>
                <optgroup label="Cultural">
                  <option value={RenderStyle.PanArabic}>{t(RenderStyle.PanArabic as any)}</option>
                  <option value={RenderStyle.Asian}>{t(RenderStyle.Asian as any)}</option>
                  <option value={RenderStyle.Scandic}>{t(RenderStyle.Scandic as any)}</option>
                  <option value={RenderStyle.Tropical}>{t(RenderStyle.Tropical as any)}</option>
                </optgroup>
                <optgroup label="Interior: Home">
                  <option value={RenderStyle.HomeScandi}>{t(RenderStyle.HomeScandi as any)}</option>
                  <option value={RenderStyle.HomeJapandi}>{t(RenderStyle.HomeJapandi as any)}</option>
                  <option value={RenderStyle.HomeBoho}>{t(RenderStyle.HomeBoho as any)}</option>
                  <option value={RenderStyle.HomeIndustrial}>{t(RenderStyle.HomeIndustrial as any)}</option>
                  <option value={RenderStyle.HomeLuxury}>{t(RenderStyle.HomeLuxury as any)}</option>
                  <option value={RenderStyle.HomeMidCentury}>{t(RenderStyle.HomeMidCentury as any)}</option>
                  <option value={RenderStyle.HomeCoastal}>{t(RenderStyle.HomeCoastal as any)}</option>
                  <option value={RenderStyle.HomeFarmhouse}>{t(RenderStyle.HomeFarmhouse as any)}</option>
                  <option value={RenderStyle.HomeWabiSabi}>{t(RenderStyle.HomeWabiSabi as any)}</option>
                  <option value={RenderStyle.HomeMaximalist}>{t(RenderStyle.HomeMaximalist as any)}</option>
                  <option value={RenderStyle.HomeArtDeco}>{t(RenderStyle.HomeArtDeco as any)}</option>
                  <option value={RenderStyle.HomeClassic}>{t(RenderStyle.HomeClassic as any)}</option>
                </optgroup>
                <optgroup label="Interior: Office">
                  <option value={RenderStyle.OfficeOpenPlan}>{t(RenderStyle.OfficeOpenPlan as any)}</option>
                  <option value={RenderStyle.OfficeExecutive}>{t(RenderStyle.OfficeExecutive as any)}</option>
                  <option value={RenderStyle.OfficeCreative}>{t(RenderStyle.OfficeCreative as any)}</option>
                  <option value={RenderStyle.OfficeTech}>{t(RenderStyle.OfficeTech as any)}</option>
                  <option value={RenderStyle.OfficeBiophilic}>{t(RenderStyle.OfficeBiophilic as any)}</option>
                </optgroup>
                <optgroup label="Interior: Retail">
                  <option value={RenderStyle.RetailBoutique}>{t(RenderStyle.RetailBoutique as any)}</option>
                  <option value={RenderStyle.RetailShowroom}>{t(RenderStyle.RetailShowroom as any)}</option>
                  <option value={RenderStyle.RetailMall}>{t(RenderStyle.RetailMall as any)}</option>
                  <option value={RenderStyle.RetailMinimal}>{t(RenderStyle.RetailMinimal as any)}</option>
                </optgroup>
                <optgroup label="Interior: Hospitality">
                  <option value={RenderStyle.HospHotelLobby}>{t(RenderStyle.HospHotelLobby as any)}</option>
                  <option value={RenderStyle.HospRestaurant}>{t(RenderStyle.HospRestaurant as any)}</option>
                  <option value={RenderStyle.HospCafe}>{t(RenderStyle.HospCafe as any)}</option>
                  <option value={RenderStyle.HospBar}>{t(RenderStyle.HospBar as any)}</option>
                </optgroup>
                <optgroup label="Interior: Sales Office">
                  <option value={RenderStyle.SalesRealEstate}>{t(RenderStyle.SalesRealEstate as any)}</option>
                  <option value={RenderStyle.SalesReception}>{t(RenderStyle.SalesReception as any)}</option>
                  <option value={RenderStyle.SalesGallery}>{t(RenderStyle.SalesGallery as any)}</option>
                </optgroup>
                <optgroup label="Exterior">
                  <option value={RenderStyle.Biophilic}>{t(RenderStyle.Biophilic as any)}</option>
                  <option value={RenderStyle.GlassFacade}>{t(RenderStyle.GlassFacade as any)}</option>
                  <option value={RenderStyle.Sustainable}>{t(RenderStyle.Sustainable as any)}</option>
                  <option value={RenderStyle.Cottage}>{t(RenderStyle.Cottage as any)}</option>
                  <option value={RenderStyle.Alpine}>{t(RenderStyle.Alpine as any)}</option>
                  <option value={RenderStyle.DesertModern}>{t(RenderStyle.DesertModern as any)}</option>
                </optgroup>
                <optgroup label="Techniques">
                  <option value={RenderStyle.Sketch}>{t(RenderStyle.Sketch as any)}</option>
                  <option value={RenderStyle.Watercolor}>{t(RenderStyle.Watercolor as any)}</option>
                  <option value={RenderStyle.Blueprint}>{t(RenderStyle.Blueprint as any)}</option>
                </optgroup>
              </select>
            </div>

            {/* Atmosphere Preview Grid */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                <Cloud size={14} /> {t('atmosphere')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: Atmosphere.None, icon: <Cloud size={14} />, label: 'None', color: 'bg-slate-800' },
                  { val: Atmosphere.Sunny, icon: <Sun size={14} />, label: 'atmSunny', color: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
                  { val: Atmosphere.Sunset, icon: <Sun size={14} />, label: 'atmSunset', color: 'bg-orange-500/20 text-orange-300 border-orange-500/50' },
                  { val: Atmosphere.Night, icon: <Moon size={14} />, label: 'atmNight', color: 'bg-indigo-900/40 text-indigo-300 border-indigo-500/50' },
                  { val: Atmosphere.Foggy, icon: <CloudFog size={14} />, label: 'atmFog', color: 'bg-slate-500/20 text-slate-300 border-slate-500/50' },
                  { val: Atmosphere.Rainy, icon: <CloudRain size={14} />, label: 'atmRain', color: 'bg-blue-900/40 text-blue-300 border-blue-500/50' },
                  { val: Atmosphere.Snowy, icon: <Snowflake size={14} />, label: 'atmSnow', color: 'bg-white/10 text-white border-white/30' },
                  { val: Atmosphere.Stormy, icon: <CloudLightning size={14} />, label: 'atmStorm', color: 'bg-indigo-950 text-indigo-200 border-indigo-700' },
                  { val: Atmosphere.Misty, icon: <CloudFog size={14} />, label: 'atmMist', color: 'bg-teal-900/30 text-teal-200 border-teal-700' },
                  // Interior
                  { val: Atmosphere.WarmTungsten, icon: <Lightbulb size={14} />, label: 'atmWarm', color: 'bg-orange-900/30 text-orange-200 border-orange-700' },
                  { val: Atmosphere.NaturalLight, icon: <Sun size={14} />, label: 'atmNatural', color: 'bg-blue-100/20 text-blue-100 border-blue-200/30' },
                  { val: Atmosphere.Studio, icon: <Aperture size={14} />, label: 'atmStudio', color: 'bg-slate-700 text-slate-200 border-slate-500' },
                  { val: Atmosphere.Candlelight, icon: <Flame size={14} />, label: 'atmCozy', color: 'bg-red-900/30 text-red-200 border-red-700' },
                  // Seasons
                  { val: Atmosphere.Spring, icon: <Flower size={14} />, label: 'atmSpring', color: 'bg-pink-500/20 text-pink-300 border-pink-500/50' },
                  { val: Atmosphere.Summer, icon: <ThermometerSun size={14} />, label: 'atmSummer', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' },
                  { val: Atmosphere.Autumn, icon: <Leaf size={14} />, label: 'atmAutumn', color: 'bg-red-500/20 text-red-300 border-red-500/50' },
                  { val: Atmosphere.Winter, icon: <Snowflake size={14} />, label: 'atmWinter', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' },

                ].map(opt => {
                  const isSelected = atmosphere.includes(opt.val);
                  return (
                    <button
                      key={opt.val}
                      onClick={() => toggleAtmosphere(opt.val)}
                      className={`flex flex-col items-center justify-center p-2 rounded border text-xs transition-all ${isSelected
                        ? `${opt.color} border-opacity-100 ring-1 ring-offset-1 ring-offset-slate-900`
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                      {opt.icon}
                      <span className="mt-1 text-[10px] text-center leading-none">{t(opt.label as any)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Camera Angle */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                <Camera size={14} /> {t('camera')}
              </label>
              <select
                value={camera}
                onChange={(e) => setCamera(e.target.value as CameraAngle)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 text-slate-300"
              >
                {Object.values(CameraAngle).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Scene Elements */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase">{t('sceneElements')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => toggleElement('people')} className={`flex items-center gap-2 p-2 rounded border text-xs transition-all ${sceneElements.people ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Users size={14} /> {t('people')}
                </button>
                <button onClick={() => toggleElement('cars')} className={`flex items-center gap-2 p-2 rounded border text-xs transition-all ${sceneElements.cars ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Car size={14} /> {t('cars')}
                </button>
                <button onClick={() => toggleElement('vegetation')} className={`flex items-center gap-2 p-2 rounded border text-xs transition-all ${sceneElements.vegetation ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Trees size={14} /> {t('greenery')}
                </button>
                <button onClick={() => toggleElement('clouds')} className={`flex items-center gap-2 p-2 rounded border text-xs transition-all ${sceneElements.clouds ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Cloud size={14} /> {t('clouds')}
                </button>
                <button onClick={() => toggleElement('city')} className={`flex items-center gap-2 p-2 rounded border text-xs transition-all ${sceneElements.city ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Building2 size={14} /> {t('city')}
                </button>
                <button onClick={() => toggleElement('motionBlur')} className={`flex items-center gap-2 p-2 rounded border text-xs transition-all ${sceneElements.motionBlur ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Wind size={14} /> {t('motionBlur')}
                </button>
                <button onClick={() => toggleElement('enhanceFacade')} className={`col-span-2 flex items-center justify-center gap-2 p-2 rounded border text-xs transition-all ${sceneElements.enhanceFacade ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Zap size={14} /> {t('enhanceFacade')}
                </button>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                <LayoutTemplate size={14} /> {t('aspectRatio')}
              </label>
              <div className="grid grid-cols-3 gap-1">
                {['Original', '1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio as AspectRatio)}
                    className={`px-2 py-2 text-xs rounded border transition-all ${aspectRatio === ratio
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              {showInstructions && <GuideTooltip text={t('guideGenerate')} className="-top-14 left-0 w-full max-w-none" side="bottom" />}

              {/* Generate Button */}
              <button
                onClick={() => batchMode ? processBatch() : handleGenerate()}
                disabled={batchMode ? (isBatchProcessing || batchImages.length === 0) : (isGenerating || (!sourceImage && !prompt))}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${(batchMode ? (isBatchProcessing || batchImages.length === 0) : (isGenerating || (!sourceImage && !prompt)))
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white shadow-indigo-500/20'
                  }`}
              >
                {batchMode ? (
                  isBatchProcessing ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Processing {batchProgress.current}/{batchProgress.total}...
                    </>
                  ) : (
                    <>
                      <Layers size={24} />
                      Generate Batch {batchImages.length > 0 ? `(${batchImages.length})` : ''}
                    </>
                  )
                ) : (
                  isGenerating ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      {t('generating')}
                    </>
                  ) : (
                    <>
                      <Zap size={24} fill="currentColor" />
                      {t('generate')}
                    </>
                  )
                )}
              </button>

              {/* Video Generation Section */}
              {!batchMode && resultImage && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Film size={16} />
                    Generate Video
                  </h3>

                  {/* Video Quota Display */}
                  {videoQuota && (
                    <div className="mb-3 p-2 bg-slate-800 rounded text-xs">
                      <span className="text-slate-400">Video Credits: </span>
                      <span className="text-white font-semibold">
                        {videoQuota.quota - videoQuota.used} / {videoQuota.quota}
                      </span>
                    </div>
                  )}

                  {/* Model Selection */}
                  <div className="mb-3">
                    <label className="block text-xs text-slate-400 mb-1">Model</label>
                    <select
                      value={videoSettings.model}
                      onChange={(e) => setVideoSettings({ ...videoSettings, model: e.target.value as KlingModel })}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded text-sm border border-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value={KlingModel.V2_5_Turbo}>Kling 2.5 Turbo (Faster)</option>
                      <option value={KlingModel.V2_1}>Kling 2.1 (Higher Quality)</option>
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="mb-3">
                    <label className="block text-xs text-slate-400 mb-1">Duration</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setVideoSettings({ ...videoSettings, duration: 5 })}
                        className={`flex-1 py-2 rounded text-sm transition-colors ${videoSettings.duration === 5 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        5 seconds
                      </button>
                      <button
                        onClick={() => setVideoSettings({ ...videoSettings, duration: 10 })}
                        className={`flex-1 py-2 rounded text-sm transition-colors ${videoSettings.duration === 10 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        10 seconds
                      </button>
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="mb-3">
                    <label className="block text-xs text-slate-400 mb-1">Aspect Ratio</label>
                    <select
                      value={videoSettings.aspectRatio}
                      onChange={(e) => setVideoSettings({ ...videoSettings, aspectRatio: e.target.value as any })}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded text-sm border border-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:3">4:3 (Classic)</option>
                      <option value="3:4">3:4 (Portrait Classic)</option>
                    </select>
                  </div>

                  {/* Prompt */}
                  <div className="mb-3">
                    <label className="block text-xs text-slate-400 mb-1">Prompt (Optional)</label>
                    <textarea
                      value={videoSettings.prompt}
                      onChange={(e) => setVideoSettings({ ...videoSettings, prompt: e.target.value })}
                      placeholder="Describe the motion or scene..."
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded text-sm resize-none border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      rows={3}
                      maxLength={2500}
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      {videoSettings.prompt.length} / 2500
                    </div>
                  </div>

                  {/* Generate Video Button */}
                  <button
                    onClick={handleGenerateVideo}
                    disabled={!resultImage || isGeneratingVideo || (videoQuota && videoQuota.used >= videoQuota.quota)}
                    className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${!resultImage || isGeneratingVideo || (videoQuota && videoQuota.used >= videoQuota.quota)
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                      }`}
                  >
                    {isGeneratingVideo ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Generating Video...
                      </>
                    ) : (
                      <>
                        <Film size={18} />
                        Generate Video
                      </>
                    )}
                  </button>

                  {/* Generated Video Display */}
                  {generatedVideoUrl && (
                    <div className="mt-4">
                      <video
                        src={generatedVideoUrl}
                        controls
                        className="w-full rounded-lg border border-slate-700"
                      />
                      <button
                        onClick={() => window.open(generatedVideoUrl, '_blank')}
                        className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded text-sm flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        Download Video
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 3: RESULT */}
      <div className="w-full lg:w-2/4 flex flex-col gap-4 min-h-[300px] h-auto lg:h-full min-h-0 shrink-0 lg:shrink">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 flex-1 flex flex-col relative">
          {showInstructions && <GuideTooltip text={t('guideResult')} className="top-16 left-1/2" side="top" />}

          <div className="flex items-center justify-between mb-4 text-indigo-400 font-semibold relative">
            <div className="flex items-center gap-2">
              <Maximize2 size={18} />
              <h2>{t('result')}</h2>
            </div>

            <div className="flex items-center gap-2 relative">
              {showInstructions && resultImage && <GuideTooltip text={t('guideTools')} className="-bottom-16 right-0" side="top" />}
              {resultImage && (
                <button
                  onClick={() => setPreviewImage(resultImage)}
                  className="p-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  title={t('fullScreen')}
                >
                  <Eye size={14} />
                </button>
              )}
              {resultImage && (
                <button
                  onClick={handleUpscale}
                  disabled={isUpscaling}
                  className="flex items-center gap-2 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                >
                  {isUpscaling ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} {t('upscale')}
                </button>
              )}
              {resultImage && (
                <button
                  onClick={() => setDrawingTarget('result')}
                  className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  <Pencil size={14} /> {t('edit')}
                </button>
              )}
              {resultImage && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(resultImage);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `arch-render-${Date.now()}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (err: any) {
                      console.error("Download failed", err);
                      alert(`Download failed: ${err.message}`);
                    }
                  }}
                  className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  <Download size={14} /> {t('download')}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden relative flex flex-col">
            {batchMode ? (
              batchResults.length > 0 || isBatchProcessing ? (
                <BatchResults
                  results={batchResults}
                  onClose={() => {
                    setBatchResults([]);
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center">
                  <Layers size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Batch results will appear here</p>
                  <p className="text-xs text-slate-500 mt-1">Upload images and click Generate Batch</p>
                </div>
              )
            ) : (
              isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 animate-pulse">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-mono">{t('simulating')}</p>
                  {sceneElements.enhanceFacade && <p className="text-xs text-slate-500 mt-2">{t('enhanceFacade')}...</p>}
                </div>
              ) : resultImage ? (
                sourceImage ? (
                  <BeforeAfter beforeImage={sourceImage} afterImage={resultImage} />
                ) : (
                  <img src={resultImage} alt="Result" className="w-full h-full object-contain" />
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center">
                  <ImageIcon size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Generations will appear here</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinearEditor;
