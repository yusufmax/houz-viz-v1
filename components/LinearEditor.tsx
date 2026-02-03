import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Settings, Image as ImageIcon, Download, Maximize2, Maximize, Save,
  X, ChevronDown, ChevronRight, Palette, Sun, Cloud, Users, Car, Trees,
  Building2, Wind, Zap, Loader2, Pencil, Pen, Lock, LayoutTemplate, Grid,
  CloudRain, CloudFog, Snowflake, Eye, CloudLightning, Flower, Leaf, ThermometerSun, History as HistoryIcon, Trash2, Upload, FileJson, Flame, Lightbulb, Coffee, Aperture, Sparkles, Layers, Film, Wand2, Mic, MicOff, Moon, CheckCircle2
} from 'lucide-react';
import ImageUpload from './ImageUpload';
import BeforeAfter from './BeforeAfter';
import DrawEditor from './DrawEditor';
import FullScreenPreview from './FullScreenPreview';
import BatchImageUpload from './BatchImageUpload';
import BatchResults from './BatchResults';
import InteriorCustomization from './InteriorCustomization';
import { AspectRatio, RenderStyle, Atmosphere, CameraAngle, GenerationSettings, SceneElements, HistoryItem, KlingModel, VideoGenerationSettings, VideoQuota, InteriorSettings, CameraLens, Tag, FreepikMagnificSettings } from '../types';
import {
  generateImage, editImage,
  enhancePrompt
} from '../services/geminiService';
import { upscaleImageReplicate } from '../services/replicateService';
import { upscaleImageFreepik } from '../services/freepikService';
import FreepikSettings from './FreepikSettings';
import { RealtimeService } from '../services/realtimeService';
import { AudioManager } from '../services/audioManager';
import { useNavigate } from 'react-router-dom';
import { getHouzaiFilename } from '../utils/filenameUtils';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../contexts/AuthProvider';
import { quotaService } from '../services/quotaService';
import { videoQuotaService } from '../services/videoQuotaService';
import { historyService } from '../services/historyService';
import { useSearchParams } from 'react-router-dom';
// import { useAgentic } from '../contexts/AgenticContext';
import { fetchUserReferenceImages, ReferenceImage } from '../services/referenceImageService';
import { supabase } from '../lib/supabaseClient';
import { promptTemplateService, PromptTemplate } from '../services/promptTemplateService';
import SunPositionSelector from './SunPositionSelector';

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

const STYLE_PREVIEWS: Partial<Record<RenderStyle, string>> = {
  // General
  [RenderStyle.Photorealistic]: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=200&q=80',
  [RenderStyle.PanArabic]: 'https://images.unsplash.com/photo-1544211210-082b71d0630c?w=200&q=80',
  [RenderStyle.Asian]: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=200&q=80',
  [RenderStyle.Scandic]: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&q=80',
  [RenderStyle.Tropical]: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=200&q=80',
  [RenderStyle.cinematic]: 'https://images.unsplash.com/photo-1493246507139-91e8bef99c02?w=200&q=80',
  [RenderStyle.Sketch]: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&q=80',
  [RenderStyle.Watercolor]: 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=200&q=80',
  [RenderStyle.Blueprint]: 'https://images.unsplash.com/photo-1503387762-592dea58ef23?w=200&q=80',
  [RenderStyle.PencilDrawing]: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&q=80',
  [RenderStyle.Chalk]: 'https://images.unsplash.com/photo-1511250269035-188b030fc497?w=200&q=80',
  [RenderStyle.Cyberpunk]: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&q=80',

  // Office Building
  [RenderStyle.OfficeGlass]: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&q=80',
  [RenderStyle.OfficeACM]: 'https://images.unsplash.com/photo-1564069114553-7215e1ff1890?w=200&q=80',
  [RenderStyle.OfficeNeoclassic]: 'https://images.unsplash.com/photo-1503594384566-461fe158e797?w=200&q=80',
  [RenderStyle.OfficeConcrete]: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=200&q=80',
  [RenderStyle.OfficeBrick]: 'https://images.unsplash.com/photo-1551000624-9b8eb6a2468f?w=200&q=80',

  // Mixed Use
  [RenderStyle.MixedGlassSteel]: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&q=80',
  [RenderStyle.MixedBrickLoft]: 'https://images.unsplash.com/photo-1534237710431-e2fc698436d0?w=200&q=80',
  [RenderStyle.MixedNeoclassic]: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=200&q=80',
  [RenderStyle.MixedModern]: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&q=80',
  [RenderStyle.MixedFuturistic]: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&q=80',

  // Apartment
  [RenderStyle.AptModern]: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=80',
  [RenderStyle.AptNeoclassic]: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=200&q=80',
  [RenderStyle.AptBrick]: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=200&q=80',
  [RenderStyle.AptMinimal]: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=200&q=80',
  [RenderStyle.AptHiTech]: 'https://images.unsplash.com/photo-1564069114553-7215e1ff1890?w=200&q=80',

  // Home
  [RenderStyle.HomeModern]: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&q=80',
  [RenderStyle.HomeNeoclassic]: 'https://images.unsplash.com/photo-1600596542815-3ad196bb8700?w=200&q=80',
  [RenderStyle.HomeHiTech]: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=80',
  [RenderStyle.HomeMinimal]: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=200&q=80',
  [RenderStyle.HomeClassic]: 'https://images.unsplash.com/photo-1500315331616-db4f707c24d1?w=200&q=80',

  // Exterior Additional
  [RenderStyle.Modernist]: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&q=80',
  [RenderStyle.Minimalist]: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=200&q=80',
  [RenderStyle.Brutalism]: 'https://images.unsplash.com/photo-1534237710431-e2fc698436d0?w=200&q=80',
  [RenderStyle.Bauhaus]: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&q=80',
  [RenderStyle.Rustic]: 'https://images.unsplash.com/photo-1500315331616-db4f707c24d1?w=200&q=80',
  [RenderStyle.GlassFacade]: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&q=80',
  [RenderStyle.Alpine]: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&q=80',
  [RenderStyle.Cottage]: 'https://images.unsplash.com/photo-1500315331616-db4f707c24d1?w=200&q=80',
  [RenderStyle.Sustainable]: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=200&q=80',
  [RenderStyle.Colonial]: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&q=80',
  [RenderStyle.Parametric]: 'https://images.unsplash.com/photo-1503387762-592dea58ef23?w=200&q=80',
  [RenderStyle.IndustrialLoft]: 'https://images.unsplash.com/photo-1531835551805-16d864c8d311?w=200&q=80',
  [RenderStyle.Biophilic]: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&q=80',
  [RenderStyle.DesertModern]: 'https://images.unsplash.com/photo-1551000624-9b8eb6a2468f?w=200&q=80',

  // Interior
  [RenderStyle.HomeScandi]: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&q=80',
  [RenderStyle.HomeJapandi]: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=200&q=80',
  [RenderStyle.HomeBoho]: 'https://images.unsplash.com/photo-1615876234886-fd9a39faa97f?w=200&q=80',
  [RenderStyle.HomeIndustrial]: 'https://images.unsplash.com/photo-1505691938895-1758d7eaa511?w=200&q=80',
  [RenderStyle.HomeLuxury]: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=200&q=80',
  [RenderStyle.HomeMidCentury]: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5ea?w=200&q=80',
  [RenderStyle.HomeCoastal]: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=200&q=80',
  [RenderStyle.HomeFarmhouse]: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5ea?w=200&q=80',
  [RenderStyle.HomeWabiSabi]: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=200&q=80',
  [RenderStyle.HomeMaximalist]: 'https://images.unsplash.com/photo-1615876234886-fd9a39faa97f?w=200&q=80',
  [RenderStyle.HomeArtDeco]: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=200&q=80',

  // Office Interior
  [RenderStyle.OfficeOpenPlan]: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=200&q=80',
  [RenderStyle.OfficeExecutive]: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80',
  [RenderStyle.OfficeCreative]: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=200&q=80',
  [RenderStyle.OfficeTech]: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80',
  [RenderStyle.OfficeBiophilic]: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&q=80',

  // Retail
  [RenderStyle.RetailBoutique]: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=200&q=80',
  [RenderStyle.RetailShowroom]: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&q=80',
  [RenderStyle.RetailMall]: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=200&q=80',
  [RenderStyle.RetailMinimal]: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&q=80',

  // Hospitality
  [RenderStyle.HospHotelLobby]: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=80',
  [RenderStyle.HospRestaurant]: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80',
  [RenderStyle.HospCafe]: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&q=80',
  [RenderStyle.HospBar]: 'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=200&q=80',

  // Sales
  [RenderStyle.SalesRealEstate]: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80',
  [RenderStyle.SalesReception]: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80',
  [RenderStyle.SalesGallery]: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80',
};

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


type EditorMode = 'exterior' | 'interior' | 'general';

const STYLE_CATEGORIES: Record<EditorMode, RenderStyle[]> = {
  general: [
    RenderStyle.Photorealistic, RenderStyle.cinematic,
    RenderStyle.PanArabic, RenderStyle.Asian, RenderStyle.Scandic, RenderStyle.Tropical,
    RenderStyle.Sketch, RenderStyle.Watercolor, RenderStyle.Blueprint, RenderStyle.PencilDrawing, RenderStyle.Chalk, RenderStyle.Cyberpunk
  ],
  exterior: [
    RenderStyle.Modernist, RenderStyle.Minimalist, RenderStyle.Brutalism, RenderStyle.Bauhaus,
    RenderStyle.Colonial, RenderStyle.Rustic, RenderStyle.Parametric, RenderStyle.IndustrialLoft,
    RenderStyle.PanArabic, RenderStyle.Asian, RenderStyle.Scandic, RenderStyle.Tropical,
    RenderStyle.Biophilic, RenderStyle.GlassFacade, RenderStyle.Sustainable, RenderStyle.Cottage, RenderStyle.Alpine, RenderStyle.DesertModern,
    RenderStyle.Sketch
  ],
  interior: [
    RenderStyle.HomeScandi, RenderStyle.HomeJapandi, RenderStyle.HomeBoho, RenderStyle.HomeIndustrial,
    RenderStyle.HomeLuxury, RenderStyle.HomeMidCentury, RenderStyle.HomeCoastal, RenderStyle.HomeFarmhouse,
    RenderStyle.HomeWabiSabi, RenderStyle.HomeMaximalist, RenderStyle.HomeArtDeco, RenderStyle.HomeClassic,
    RenderStyle.OfficeOpenPlan, RenderStyle.OfficeExecutive, RenderStyle.OfficeCreative, RenderStyle.OfficeTech, RenderStyle.OfficeBiophilic,
    RenderStyle.RetailBoutique, RenderStyle.RetailShowroom, RenderStyle.RetailMall, RenderStyle.RetailMinimal,
    RenderStyle.HospHotelLobby, RenderStyle.HospRestaurant, RenderStyle.HospCafe, RenderStyle.HospBar,
    RenderStyle.SalesRealEstate, RenderStyle.SalesReception, RenderStyle.SalesGallery,
    RenderStyle.Sketch
  ]
};

const ALL_ATMOSPHERES: Atmosphere[] = [
  Atmosphere.None,
  Atmosphere.Sunny, Atmosphere.Sunset, Atmosphere.Night,
  Atmosphere.Foggy, Atmosphere.Rainy, Atmosphere.Snowy, Atmosphere.Overcast,
  Atmosphere.Dawn, Atmosphere.Stormy, Atmosphere.Misty,
  Atmosphere.Cyber,
  Atmosphere.WarmTungsten, Atmosphere.NaturalLight, Atmosphere.Studio, Atmosphere.Candlelight,
  Atmosphere.Spring, Atmosphere.Summer, Atmosphere.Autumn, Atmosphere.Winter
];

const CAMERA_CONFIGS = [
  { val: CameraAngle.Default, icon: <LayoutTemplate size={14} />, label: 'Default' },
  { val: CameraAngle.EyeLevel, icon: <Users size={14} />, label: 'Eye Level' },
  { val: CameraAngle.LowAngle, icon: <ChevronDown size={14} />, label: 'HeroShot' },
  { val: CameraAngle.WormEyeView, icon: <ChevronDown size={14} className="rotate-180" />, label: 'Worm Eye' },
  { val: CameraAngle.BirdEyeView, icon: <Maximize size={14} />, label: 'Bird Eye' },
  { val: CameraAngle.Drone, icon: <Cloud size={14} />, label: 'Aerial' },
  { val: CameraAngle.StreetLevel, icon: <Car size={14} />, label: 'Street' },
  { val: CameraAngle.ThreeQuarterView, icon: <Layers size={14} />, label: '3/4 View' },
  { val: CameraAngle.FacadeView, icon: <Building2 size={14} />, label: 'Facade' },
  { val: CameraAngle.InteriorWide, icon: <Maximize2 size={14} />, label: 'Int. Wide' },
  { val: CameraAngle.ExteriorWide, icon: <ImageIcon size={14} />, label: 'Ext. Wide' },
];

const LENS_CONFIGS = [
  { val: CameraLens.UltraWide, label: '14mm (Ultra)', desc: 'Dramatic' },
  { val: CameraLens.Wide, label: '24mm (Wide)', desc: 'Context' },
  { val: CameraLens.Standard, label: '50mm (Mid)', desc: 'Human' },
  { val: CameraLens.Portrait, label: '85mm (Prime)', desc: 'Focus' },
  { val: CameraLens.Telephoto, label: '200mm (Zoom)', desc: 'Detail' },
];



const LinearEditor: React.FC<LinearEditorProps> = ({ showInstructions }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  // const { setToolExecutor } = useAgentic();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);

  const [editorMode, setEditorMode] = useState<EditorMode>('exterior'); // Default to exterior
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [multiResults, setMultiResults] = useState<{ url: string; settings: GenerationSettings }[]>([]);
  const [generationCount, setGenerationCount] = useState<number>(1);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const realtimeServiceRef = useRef<RealtimeService | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isMagnificUpscaling, setIsMagnificUpscaling] = useState(false);
  const [showFreepikSettings, setShowFreepikSettings] = useState(false);
  const [freepikSettings, setFreepikSettings] = useState<FreepikMagnificSettings>({
    scale_factor: '2x',
    optimized_for: 'standard',
    creativity: 0,
    definition: 0,
    resemblance: 0,
    intricacy: 0,
    engine: 'automatic'
  });

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
  const [showStyles, setShowStyles] = useState(true);
  const [styleViewMode, setStyleViewMode] = useState<'grid' | 'list'>('grid');

  // Reference Images: Use custom or fallback to defaults
  const [customReferenceImages, setCustomReferenceImages] = useState<ReferenceImage[]>([]);

  const filteredRefs = useMemo(() => {
    return customReferenceImages.filter(ref => {
      const category = ref.category || 'general';
      if (category === 'general' && editorMode === 'exterior') return true;
      return category === editorMode;
    });
  }, [customReferenceImages, editorMode]);

  const styleLibrary = filteredRefs.map(ref => ({ name: ref.name, url: ref.image_url }));

  // Drawing
  const [drawingTarget, setDrawingTarget] = useState<'source' | 'result' | null>(null);

  // Settings
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<RenderStyle>(RenderStyle.None);
  const [atmosphere, setAtmosphere] = useState<Atmosphere[]>([]);
  const [camera, setCamera] = useState<CameraAngle>(CameraAngle.Default);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('Original');
  const [sceneElements, setSceneElements] = useState<SceneElements>({
    people: false,
    cars: false,
    clouds: false,
    vegetation: false,
    city: false,
    motionBlur: false,
    enhanceFacade: false
  });
  const [model, setModel] = useState<string>('gemini-2.5-flash-image');
  const [resolution, setResolution] = useState<string>('4K');
  const [keepBuilding, setKeepBuilding] = useState(false);
  const [lockCamera, setLockCamera] = useState(false);
  const [lens, setLens] = useState<CameraLens | undefined>(undefined);
  const [aperture, setAperture] = useState<string>('');
  const [lockInterior, setLockInterior] = useState(false);
  const [sunPosition, setSunPosition] = useState<number>(135);
  const [timeOfDay, setTimeOfDay] = useState<number>(14); // Default 2 PM
  const [useSunControl, setUseSunControl] = useState(false);

  // Interior Settings State
  const [interiorSettings, setInteriorSettings] = useState<InteriorSettings>({
    flooring: { type: '', image: null },
    furniture: { style: '', image: null },
    primaryColor: { value: '', image: null },
    wallColor: { value: '', image: null }
  });

  // Prompt Templates
  const [savedTemplates, setSavedTemplates] = useState<PromptTemplate[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Sketchify Enhancement
  const [sketchStyle, setSketchStyle] = useState<'handdrawn' | 'pen' | 'pencil' | 'watercolor'>('pen');

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

  const loadSavedTemplates = async () => {
    if (!user) return;
    try {
      const templates = await promptTemplateService.getTemplates(user.id);
      setSavedTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!user || !prompt || !newTemplateName) return;
    setIsSavingTemplate(true);
    try {
      await promptTemplateService.saveTemplate(user.id, newTemplateName, prompt);
      await loadSavedTemplates();
      setNewTemplateName('');
      setShowTemplateManager(false);
      alert('Template saved successfully!');
    } catch (error: any) {
      console.error('Save template failed:', error);
      alert(`Failed to save template: ${error.message || 'Unknown error'} `);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await promptTemplateService.deleteTemplate(id);
      await loadSavedTemplates();
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  // Setup tool executor for Agentic Mode removed

  // Load history and custom reference images on mount
  useEffect(() => {
    const saved = localStorage.getItem('arch_genius_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { }
    }

    // Fetch user's custom reference images
    if (user) {
      fetchUserReferenceImages(user.id).then(userRefs => {
        setCustomReferenceImages(userRefs);
      }).catch(err => {
        console.error('Failed to load reference images:', err);
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

  // Load prompt templates
  useEffect(() => {
    loadSavedTemplates();
  }, [user]);

  // Auto-detect aspect ratio from result image
  useEffect(() => {
    if (resultImage) {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const ratio = width / height;

        // Determine closest aspect ratio
        let detectedRatio = '16:9';
        if (Math.abs(ratio - 16 / 9) < 0.1) detectedRatio = '16:9';
        else if (Math.abs(ratio - 9 / 16) < 0.1) detectedRatio = '9:16';
        else if (Math.abs(ratio - 1) < 0.1) detectedRatio = '1:1';
        else if (Math.abs(ratio - 4 / 3) < 0.1) detectedRatio = '4:3';
        else if (Math.abs(ratio - 3 / 4) < 0.1) detectedRatio = '3:4';

        console.log(`Original aspect ratio enforced: ${detectedRatio} (${width}x${height})`);

        setVideoSettings(prev => ({
          ...prev,
          aspectRatio: detectedRatio as any
        }));
      };
      img.src = resultImage;
    }
  }, [resultImage]);


  const saveToHistory = async (url: string, usedPrompt: string, modelName?: string, estimatedCost?: number) => {
    if (!user) return;
    try {
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        url,
        prompt: usedPrompt,
        timestamp: Date.now(),
        style,
        modelName: modelName || model,
        estimatedCost: estimatedCost || calculateUSDCost(modelName || model, resolution),
        metadata: {
          style,
          atmosphere,
          camera,
          aspectRatio,
          sceneElements,
          model,
          resolution,
          styleReferenceImage: (styleReferenceImage && !styleReferenceImage.startsWith('data:')) ? styleReferenceImage : undefined,
          sourceImage: (sourceImage && !sourceImage.startsWith('data:')) ? sourceImage : undefined,
          lockCamera,
          lockInterior,
          interior: editorMode === 'interior' ? interiorSettings : undefined,

          prompt: usedPrompt, // Save the prompt used for this generation
          tags,
          sunPosition
        }
      };

      const userDisplayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      await historyService.addToHistory(user.id, newItem, projectId || undefined, userDisplayName);
      loadHistory();
    } catch (e: any) {
      console.error("Failed to save history", e);
      // Silent fail usually desired for auto-save, but user reported issues so we alert for now
      alert("Failed to save history: " + (e.message || JSON.stringify(e)));
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    console.log("Loading history item:", item);
    // Confirmation removed per user request

    setResultImage(item.url);
    setPrompt(item.prompt || "");

    if (item.metadata) {
      console.log("Restoring metadata:", item.metadata);
      // Restore full state from metadata
      setPrompt(item.metadata.prompt || item.prompt);
      setStyle(item.metadata.style as RenderStyle);
      setAtmosphere(item.metadata.atmosphere as Atmosphere[]);
      setCamera(item.metadata.camera as CameraAngle);
      setAspectRatio(item.metadata.aspectRatio as AspectRatio);
      setSceneElements(item.metadata.sceneElements || { people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: false });
      setModel(item.metadata.model || 'gemini-2.5-flash-image');
      setResolution(item.metadata.resolution || '4K');
      setLockCamera(item.metadata.lockCamera || false);
      setLens(item.metadata.lens as CameraLens);
      setAperture(item.metadata.aperture || '');
      setLockInterior(item.metadata.lockInterior || false);

      if (item.metadata.styleReferenceImage) setStyleReferenceImage(item.metadata.styleReferenceImage);
      if (item.metadata.sourceImage) setSourceImage(item.metadata.sourceImage);
      if (item.metadata.interior) setInteriorSettings(item.metadata.interior);
      if (item.metadata.interior) setInteriorSettings(item.metadata.interior);
      if (item.metadata.tags) setTags(item.metadata.tags);
      if (item.metadata.sunPosition !== undefined) setSunPosition(item.metadata.sunPosition);
      if (item.metadata.timeOfDay !== undefined) setTimeOfDay(item.metadata.timeOfDay);
      if (item.metadata.useSunControl !== undefined) setUseSunControl(item.metadata.useSunControl);

      // Assuming these are not part of HistoryItem metadata directly, but if they were, they'd be set here.
      // setGeneratedImage(item.imageUrl);
      // setOriginalImage(item.originalImageUrl || null);
    } else {
      console.log("No metadata, legacy fallback");
      if (item.style) setStyle(item.style as RenderStyle);
    }
    setShowHistory(false);
  };

  const handleSaveProject = async () => {
    if (!user) {
      alert("Please sign in to save projects.");
      return;
    }

    let name = currentProjectName;
    if (!name) {
      name = prompt("Enter project name:", "My Design");
      if (!name) return;
    }

    try {
      console.log("Saving project...", { name, projectId, user: user.id });

      const projectData = {
        type: 'linear',
        linearState: {
          prompt,
          style,
          atmosphere,
          camera,
          aspectRatio,
          sceneElements,
          model,
          sourceImage,
          styleReferenceImage,
          resultImage,
          lockCamera,
          lens,
          aperture,
          lockInterior,
          interiorSettings: editorMode === 'interior' ? interiorSettings : undefined,
          editorMode, // Save the current editor mode
          tags,
          sunPosition
        }
      };

      if (projectId) {
        // Update
        console.log("Updating existing project:", projectId);
        const { error } = await supabase
          .from('projects')
          .update({
            name,
            data: projectData,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }
        alert("Project saved!");
      } else {
        // Create
        console.log("Creating new project");
        const { data, error } = await supabase
          .from('projects')
          .insert({
            name,
            user_id: user.id,
            data: projectData,
            description: 'Created in Linear Editor'
          })
          .select()
          .single();

        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }
        if (data) {
          console.log("Project created successfully:", data);
          setSearchParams({ projectId: data.id });
          setCurrentProjectName(name);
          alert("Project created!");
        }
      }
    } catch (e: any) {
      console.error("Failed to save project", e);
      alert("Failed to save project: " + (e.message || JSON.stringify(e)));
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (confirm("Clear all generation history?")) {
      await historyService.clearHistory(user.id);
      setHistory([]); // Clear local state immediately
    }
  };

  const calculateCost = () => {
    if (model === 'gemini-2.5-flash-image') return 1;
    if (model === 'gemini-3-pro-image-preview') {
      if (resolution === '1K' || resolution === 'Original') return 2;
      if (resolution === '2K') return 4;
      if (resolution === '4K') return 5;
    }
    return 1;
  };

  const calculateUSDCost = (modelName: string, res: string) => {
    if (modelName === 'gemini-2.5-flash-image' || modelName === 'gemini-2.5-flash') {
      return 0.0401;
    }
    if (modelName === 'gemini-3-pro-image-preview') {
      if (res === '4K') return 0.2411;
      return 0.1351; // 1K, 2K, Original
    }
    return 0.0401; // Fallback to Flash price
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

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop Recording
      if (audioManagerRef.current) {
        audioManagerRef.current.stopRecording();
      }
      if (realtimeServiceRef.current) {
        realtimeServiceRef.current.disconnect();
      }
      setIsRecording(false);
    } else {
      // Start Recording
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          alert("Gemini API Key is missing.");
          return;
        }

        // Initialize services
        realtimeServiceRef.current = new RealtimeService(apiKey);
        audioManagerRef.current = new AudioManager((base64PCM) => {
          if (realtimeServiceRef.current) {
            realtimeServiceRef.current.sendAudioChunk(base64PCM);
          }
        });

        // Connect to Gemini
        realtimeServiceRef.current.connect(
          (text) => {
            setPrompt(prev => prev + text);
          },
          (error) => {
            console.error("Realtime Service Error:", error);
            setIsRecording(false);
            alert("Connection to Gemini failed.");
          }
        );

        // Start Audio
        await audioManagerRef.current.startRecording();
        setIsRecording(true);

      } catch (error) {
        console.error("Error starting voice input:", error);
        alert("Could not start voice input. Please check permissions.");
        setIsRecording(false);
      }
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
      console.log("User found:", user.id);
      console.log("HistoryService:", historyService);
      loadQuota();
      loadHistory();
      if (projectId) {
        loadProject();
      }
    }
  }, [user?.id, projectId]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const items = await historyService.getHistory(user.id, projectId || undefined);
      setHistory(items);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const loadProject = async () => {
    if (!projectId) return;
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      if (data && data.data && data.data.linearState) {
        const state = data.data.linearState;
        setPrompt(state.prompt);
        setStyle(state.style);
        setAtmosphere(state.atmosphere);
        setCamera(state.camera);
        setAspectRatio(state.aspectRatio);
        setSceneElements(state.sceneElements);
        setModel(state.model);
        setSourceImage(state.sourceImage);
        setStyleReferenceImage(state.styleReferenceImage);
        setResultImage(state.resultImage);
        if (state.lockCamera !== undefined) setLockCamera(state.lockCamera);
        if (state.lens) setLens(state.lens as CameraLens);
        if (state.aperture) setAperture(state.aperture);
        if (state.lockInterior !== undefined) setLockInterior(state.lockInterior);
        if (state.interiorSettings) setInteriorSettings(state.interiorSettings);
        if (state.editorMode) setEditorMode(state.editorMode);
        if (state.tags) setTags(state.tags);
        if (state.sunPosition !== undefined) setSunPosition(state.sunPosition);
        if (state.timeOfDay !== undefined) setTimeOfDay(state.timeOfDay);
        if (state.useSunControl !== undefined) setUseSunControl(state.useSunControl);
        setCurrentProjectName(data.name);

        // If project has history snapshot, maybe merge? 
        // For now, we rely on global history filtered by project_id if we implement that fully.
        // But since we just loaded history based on projectId above, we are good.
      }
    } catch (e) {
      console.error("Failed to load project", e);
    }
  };

  const executeGeneration = async (overrideSource?: string, settingsOverride?: Partial<GenerationSettings>) => {
    if (!user) {
      alert("Please sign in to generate images.");
      return;
    }

    if (!prompt && !settingsOverride?.prompt) {
      alert(t('enterPrompt'));
      return;
    }

    const cost = calculateCost();
    const currentQuota = await quotaService.getUserQuota(user.id);
    if (!currentQuota || currentQuota.remaining < cost) {
      alert(`Not enough credits.This generation costs ${cost} credits.`);
      return;
    }

    setIsGenerating(true);
    setResultImage(null);
    setMultiResults([]);
    setBatchProgress({ current: 0, total: generationCount });

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
      keepBuilding: editorMode === 'exterior' ? keepBuilding : false, // Only apply keepBuilding in exterior mode
      lockCamera,
      lens,
      aperture,
      lockInterior: editorMode === 'interior' ? lockInterior : false,
      interior: editorMode === 'interior' ? interiorSettings : undefined,

      tags,
      sunPosition: useSunControl ? sunPosition : undefined,
      timeOfDay: useSunControl ? timeOfDay : undefined,
      ...settingsOverride
    };

    try {
      const src = overrideSource || sourceImage;
      if (!prompt && !src && !styleReferenceImage && !settingsOverride?.prompt) {
        alert("Please provide at least a text prompt, an image, or a style reference.");
        setIsGenerating(false);
        return;
      }

      const results: { url: string; settings: GenerationSettings }[] = [];
      const totalToGenerate = generationCount;

      for (let i = 0; i < totalToGenerate; i++) {
        setBatchProgress({ current: i + 1, total: totalToGenerate });

        // Deduct cost per image
        await quotaService.incrementUsage(user.id, cost);

        let resultUrl = '';
        if (src || styleReferenceImage) {
          resultUrl = await editImage(src, settings);
        } else {
          resultUrl = await generateImage(settings);
        }

        results.push({ url: resultUrl, settings });
        setMultiResults([...results]); // Update UI incrementally

        // Set first result as primary resultImage for compatibility
        if (i === 0) setResultImage(resultUrl);

        const usdCost = calculateUSDCost(settings.model || model, settings.resolution || resolution);
        saveToHistory(resultUrl, settings.prompt, settings.model || model, usdCost);
      }

      loadQuota(); // Refresh UI after all generations
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
      setGenerationCount(1);
    }
  };


  const handleSketchify = async () => {
    const targetImage = sourceImage || resultImage;
    if (!targetImage) {
      alert("Please upload an image first.");
      return;
    }

    // Map sketchStyle to RenderStyle
    const styleMap: Record<string, RenderStyle> = {
      'handdrawn': RenderStyle.Sketch,
      'pen': RenderStyle.Sketch,
      'pencil': RenderStyle.PencilDrawing,
      'watercolor': RenderStyle.Watercolor
    };

    // Style-specific prompts
    const stylePrompts: Record<string, string> = {
      'handdrawn': "Rough architectural sketch, hand-drawn lines, artistic draft",
      'pen': "Technical line drawing, black ink on paper, professional draft",
      'pencil': "Soft pencil drawing, graphite texture, architectural shading",
      'watercolor': "Architectural watercolor painting, soft colors, artistic wash"
    };

    const sketchPrompt = prompt || stylePrompts[sketchStyle];

    await executeGeneration(targetImage, {
      prompt: sketchPrompt,
      style: styleMap[sketchStyle],
      atmosphere: [],
      sceneElements: { ...sceneElements, people: false, cars: false },
      lockCamera: true,
      keepBuilding: true
    });
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
    const costPerImage = calculateCost();
    const requiredCredits = batchImages.length * costPerImage;
    const quotaData = await quotaService.getUserQuota(user.id);

    if (!quotaData || (quotaData.remaining) < requiredCredits) {
      const remaining = quotaData ? quotaData.remaining : 0;
      alert(`🚫 Not enough credits! Need ${requiredCredits}, have ${remaining}.\n\nPlease upgrade your plan or contact support.`);
      return;
    }

    // Confirm with user
    const confirmed = window.confirm(
      `This batch will process ${batchImages.length} image${batchImages.length > 1 ? 's' : ''} and use ${requiredCredits} credit${requiredCredits > 1 ? 's' : ''}.\n\nContinue ? `
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
      resolution,
      keepBuilding: editorMode === 'exterior' ? keepBuilding : false,
      lockCamera,
      lockInterior: editorMode === 'interior' ? lockInterior : false,
      interior: editorMode === 'interior' ? interiorSettings : undefined
    };

    for (let i = 0; i < batchImages.length; i++) {
      setBatchProgress({ current: i + 1, total: batchImages.length });

      try {
        // Deduct cost before API call
        await quotaService.incrementUsage(user.id, costPerImage);
        const result = await editImage(batchImages[i], settings);
        results.push({ input: batchImages[i], output: result, index: i });
        if (result) {
          const usdCost = calculateUSDCost(settings.model || model, settings.resolution || resolution);
          saveToHistory(result, settings.prompt, settings.model || model, usdCost);
        }
      } catch (error) {
        console.error(`Failed to process image ${i + 1}: `, error);
        results.push({ input: batchImages[i], output: null, index: i });
      }
    }

    setBatchResults(results);
    setIsBatchProcessing(false);
    setShowBatchResults(true);
    loadQuota(); // Refresh quota display
  };

  const handleGenerate = () => executeGeneration();

  // Helper to resize image to max 2K resolution
  const resizeImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 2048; // 2K resolution limit

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Get base64 string (this also handles the URL -> Base64 conversion)
        const base64 = canvas.toDataURL('image/jpeg', 0.9);
        resolve(base64);
      };
      img.onerror = (err) => reject(err);
      img.src = imageSrc;
    });
  };

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

      // Resize/Process image before sending
      // This handles:
      // 1. Downscaling to 2K (Kling limit)
      // 2. Converting URL to Base64 (for Gemini 3.0 results)
      // 3. Ensuring valid Base64 format
      const processedImage = await resizeImage(resultImage);

      // Call Netlify function to generate video
      const response = await fetch('/api/kling-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          image: processedImage,
          model: videoSettings.model,
          duration: videoSettings.duration,
          aspectRatio: videoSettings.aspectRatio,
          prompt: videoSettings.prompt,
          cfgScale: videoSettings.cfgScale || 0.5,
          mode: videoSettings.mode // Pass quality mode
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
          const pollResponse = await fetch('/api/kling-video', {
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
      alert(`Upscale failed: ${e.message} `);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleMagnificUpscale = async () => {
    if (!resultImage) return;
    setIsMagnificUpscaling(true);
    try {
      // Use Freepik Magnific Upscale with custom settings
      const upscaled = await upscaleImageFreepik(resultImage, {
        ...freepikSettings,
        prompt: prompt
      });
      setResultImage(upscaled);
      saveToHistory(upscaled, "Premium Upscale: " + prompt);
    } catch (e: any) {
      console.error("Magnific Upscale failed", e);
      alert(`Magnific Upscale failed: ${e.message} `);
    } finally {
      setIsMagnificUpscaling(false);
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

  const handleDrawRender = (newImage: string, editPrompt?: string, refImage?: string | null, ratio?: AspectRatio, selectedModel?: string, newTags?: Tag[]) => {
    setSourceImage(newImage);
    if (drawingTarget === 'result') {
      setResultImage(null);
    }

    // Update state for UI consistency
    if (editPrompt) setPrompt(editPrompt);
    if (refImage) setStyleReferenceImage(refImage);
    if (ratio) setAspectRatio(ratio);
    if (selectedModel) setModel(selectedModel);
    if (newTags) setTags(newTags);

    // Execute generation with overrides to avoid race conditions
    executeGeneration(newImage, {
      prompt: editPrompt || prompt,
      styleReferenceImage: refImage || styleReferenceImage,
      aspectRatio: ratio || aspectRatio,
      model: selectedModel || model,
      tags: newTags || tags
    });
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

  // Filtered Options based on Mode
  const availableStyles = STYLE_CATEGORIES[editorMode];

  const groupedStyles = useMemo<Record<string, RenderStyle[]>>(() => {
    const groups: Record<string, RenderStyle[]> = {};
    availableStyles.forEach(s => {
      const val = s as string;
      const parts = val.split(': ');
      const groupName = parts.length > 1 ? parts[0] : 'General';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(s);
    });
    return groups;
  }, [availableStyles]);



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
          selectedModel={model}
          onModelChange={setModel}
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
              <img
                src={historyService.getOptimizedUrl(item.url)}
                alt="History"
                className="w-full h-32 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== item.url) {
                    target.src = item.url;
                  }
                }}
              />
              <div className="p-2">
                <p className="text-[10px] text-slate-400 line-clamp-2">{item.prompt}</p>
                <p className="text-[9px] text-slate-600 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
              </div>
              <button
                onClick={() => handleLoadHistory(item)}
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

      {/* COLUMN 1: INPUT & CONTROLS (50%) */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4 relative h-auto lg:h-full min-h-0 shrink-0 lg:shrink">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 lg:overflow-y-auto custom-scrollbar relative flex flex-col gap-6">
          {/* SOURCE SECTION */}
          <section className="space-y-4">
            <div className="flex items-center justify-between text-indigo-400 font-semibold border-b border-slate-700/50 pb-2">
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
                    <Maximize size={12} />
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
            <div>
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
                  } `}
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

            {batchMode ? (
              <BatchImageUpload onImagesSelected={setBatchImages} maxImages={10} />
            ) : (
              <div className="min-h-[250px] relative">
                {showInstructions && <GuideTooltip text={t('guideSource')} className="top-2 right-2 z-10" side="bottom" />}
                <ImageUpload
                  selectedImage={sourceImage}
                  onImageSelected={setSourceImage}
                  label={t('dropSketch')}
                />
                {!sourceImage && (
                  <button
                    onClick={() => setDrawingTarget('source')}
                    className="mt-4 w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm hover:text-indigo-400 hover:border-indigo-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil size={14} /> {t('startBlank')}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* CONTROLS SECTION */}
          <section className="space-y-6 pt-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
              <Settings size={18} />
              <h2>{t('controls')}</h2>
            </div>

            <div className="bg-slate-900 p-1 rounded-lg flex mb-6 border border-slate-700">
              {(['exterior', 'interior', 'general'] as EditorMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setEditorMode(mode);
                    if (style !== RenderStyle.None && !STYLE_CATEGORIES[mode].includes(style)) {
                      setStyle(RenderStyle.None);
                    }
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${editorMode === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {editorMode === 'exterior' && (
              <button
                onClick={() => setKeepBuilding(!keepBuilding)}
                className={`w-full mb-6 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 border ${keepBuilding ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                <Lock size={16} />
                {keepBuilding ? 'Building Shape Locked' : 'Lock Building Shape & Details'}
              </button>
            )}

            <div className="space-y-6">
              <div className="space-y-2 relative">
                {showInstructions && <GuideTooltip text={t('guidePrompt')} className="-top-12 left-0" side="top" />}
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-400 uppercase">{t('instructionsLabel')}</label>
                  <div className="flex items-center gap-3">
                    {/* Template Selector */}
                    <div className="relative group">
                      <button
                        onClick={() => setShowTemplateManager(!showTemplateManager)}
                        className="text-[10px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <FileJson size={10} /> Templates
                      </button>

                      {showTemplateManager && (
                        <div className="absolute top-full right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">My Templates</span>
                            <button onClick={() => setShowTemplateManager(false)} className="text-slate-500 hover:text-white"><X size={10} /></button>
                          </div>
                          <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {savedTemplates.length === 0 && (
                              <div className="p-4 text-center text-[10px] text-slate-500 italic">No templates saved yet</div>
                            )}
                            {savedTemplates.map(tpl => (
                              <div key={tpl.id} className="p-2 hover:bg-slate-800 border-b border-slate-800/50 flex items-center justify-between group/tpl cursor-pointer" onClick={() => { setPrompt(tpl.prompt); setShowTemplateManager(false); }}>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] text-slate-200 font-medium truncate">{tpl.name}</div>
                                  <div className="text-[9px] text-slate-500 truncate">{tpl.prompt}</div>
                                </div>
                                <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover/tpl:opacity-100 transition-opacity">
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="p-2 bg-slate-950/50 border-t border-slate-700">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Template Name"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[9px] text-slate-200 outline-none focus:border-indigo-500"
                              />
                              <button
                                onClick={handleSaveTemplate}
                                disabled={isSavingTemplate || !prompt || !newTemplateName}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-1 rounded transition-colors"
                              >
                                {isSavingTemplate ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button onClick={handleEnhancePrompt} disabled={isEnhancing || !prompt} className="text-[10px] flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
                      <Wand2 size={10} /> {isEnhancing ? t('enhancing') : t('enhance')}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t('instructionsPlaceholder')} className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 pr-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none" />
                  <button onClick={handleVoiceInput} className={`absolute bottom-2 right-2 p-2 rounded-full transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title={isRecording ? "Stop Recording" : "Voice Input"}>
                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>
                {/* Quick Templates Buttons */}
                {savedTemplates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {savedTemplates.slice(0, 5).map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => setPrompt(tpl.prompt)}
                        className="px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-[10px] text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all truncate max-w-[120px]"
                        title={tpl.prompt}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2"><Zap size={14} /> Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 text-slate-300">
                  <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
                  <option value="gemini-3-pro-image-preview">Gemini 3 Pro (High Quality)</option>
                </select>
              </div>

              {model === 'gemini-3-pro-image-preview' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2"><Maximize size={14} /> Resolution (Cost: {calculateCost()} credits)</label>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 text-slate-300">
                    <option value="1K">1K (Square/Landscape) - 2 Credits</option>
                    <option value="2K">2K - 4 Credits</option>
                    <option value="4K">4K - 5 Credits</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2"><Palette size={14} /> {t('styleRef')}</label>
                <ImageUpload selectedImage={styleReferenceImage} onImageSelected={setStyleReferenceImage} label={t('uploadStyleRef')} compact />
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {styleLibrary.map((s, idx) => (
                    <button key={idx} onClick={() => convertUrlToBase64(s.url)} className="relative aspect-square rounded overflow-hidden border border-slate-700 hover:border-indigo-500 group" title={s.name}>
                      <img src={s.url} alt={s.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-center text-white p-1 transition-opacity">{s.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <button onClick={() => setShowStyles(!showStyles)} className="w-full flex items-center justify-between text-xs font-medium text-slate-400 uppercase group hover:text-slate-200 transition-colors">
                  <div className="flex items-center gap-2"><Zap size={14} /> {t('stylePreset')}</div>
                  <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                    <button
                      onClick={(e) => { e.stopPropagation(); setStyleViewMode('grid'); }}
                      className={`p-1 rounded transition-all ${styleViewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Grid View"
                    >
                      <Grid size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setStyleViewMode('list'); }}
                      className={`p-1 rounded transition-all ${styleViewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Dropdown View"
                    >
                      <LayoutTemplate size={12} />
                    </button>
                  </div>
                  {showStyles ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {showStyles && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    {styleViewMode === 'grid' ? (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        <div onClick={() => setStyle(RenderStyle.None)} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${style === RenderStyle.None ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                          <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-slate-400"><X size={18} /></div>
                          <span className="text-xs font-medium text-slate-300">{t('None')}</span>
                        </div>
                        {Object.entries(groupedStyles).map(([group, styles]) => (
                          <div key={group} className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">{group}</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {(styles as RenderStyle[]).map(s => {
                                const isSelected = style === s;
                                const displayName = s.includes(': ') ? s.split(': ')[1] : s;
                                const previewUrl = STYLE_PREVIEWS[s] || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=200&q=80';
                                return (
                                  <button key={s} onClick={() => setStyle(s)} className={`group relative aspect-square rounded-lg overflow-hidden border transition-all ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-[0.98]' : 'border-slate-700 hover:border-indigo-500/50'}`}>
                                    <img src={previewUrl} alt={s} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                      <div className="absolute bottom-0 left-0 right-0 p-1.5"><p className="text-[9px] font-medium text-white leading-tight truncate">{t(displayName as any) || displayName}</p></div>
                                    </div>
                                    {isSelected && <div className="absolute top-1 right-1 bg-indigo-600 rounded-full p-0.5 shadow-lg"><Zap size={8} className="text-white fill-white" /></div>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={style}
                          onChange={(e) => setStyle(e.target.value as RenderStyle)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                        >
                          <option value={RenderStyle.None}>{t('None')}</option>
                          {Object.entries(groupedStyles).map(([group, styles]) => (
                            <optgroup key={group} label={group} className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold">
                              {(styles as RenderStyle[]).map(s => {
                                const displayName = s.includes(': ') ? s.split(': ')[1] : s;
                                return (
                                  <option key={s} value={s} className="bg-slate-900 text-slate-200 text-xs normal-case font-normal">
                                    {t(displayName as any) || displayName}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ))}
                        </select>
                        <p className="text-[9px] text-slate-500 italic px-1">Selected: <span className="text-indigo-400 font-medium">{style}</span></p>
                      </div>
                    )}
                  </div>
                )}
              </div>



              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Sun size={14} className="text-amber-400" /> Atmosphere & Mood
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
                    { val: Atmosphere.WarmTungsten, icon: <Lightbulb size={14} />, label: 'atmWarm', color: 'bg-orange-900/30 text-orange-200 border-orange-700' },
                    { val: Atmosphere.NaturalLight, icon: <Sun size={14} />, label: 'atmNatural', color: 'bg-blue-100/20 text-blue-100 border-blue-200/30' },
                    { val: Atmosphere.Studio, icon: <Aperture size={14} />, label: 'atmStudio', color: 'bg-slate-700 text-slate-200 border-slate-500' },
                    { val: Atmosphere.Candlelight, icon: <Flame size={14} />, label: 'atmCozy', color: 'bg-red-900/30 text-red-200 border-red-700' },
                    { val: Atmosphere.Spring, icon: <Flower size={14} />, label: 'atmSpring', color: 'bg-pink-500/20 text-pink-300 border-pink-500/50' },
                    { val: Atmosphere.Summer, icon: <ThermometerSun size={14} />, label: 'atmSummer', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' },
                    { val: Atmosphere.Autumn, icon: <Leaf size={14} />, label: 'atmAutumn', color: 'bg-red-500/20 text-red-300 border-red-500/50' },
                    { val: Atmosphere.Winter, icon: <Snowflake size={14} />, label: 'atmWinter', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' },
                  ].filter(opt => {
                    if (editorMode !== 'interior') return true;
                    // Only show these for interior mode
                    return [
                      Atmosphere.None,
                      Atmosphere.Sunny,
                      Atmosphere.Sunset,
                      Atmosphere.Night,
                      Atmosphere.WarmTungsten,
                      Atmosphere.NaturalLight,
                      Atmosphere.Studio,
                      Atmosphere.Candlelight
                    ].includes(opt.val);
                  }).map(opt => {
                    const isSelected = atmosphere.includes(opt.val);
                    return <button key={opt.val} onClick={() => toggleAtmosphere(opt.val)} className={`flex flex-col items-center justify-center p-2 rounded border text-xs transition-all ${isSelected ? `${opt.color} border-opacity-100 ring-1 ring-offset-1 ring-offset-slate-900` : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{opt.icon}<span className="mt-1 text-[10px] text-center leading-none">{t(opt.label as any)}</span></button>;
                  })}
                </div>
              </div>

              {editorMode === 'interior' && <InteriorCustomization settings={interiorSettings} onChange={setInteriorSettings} />}

              {editorMode !== 'interior' && (
                <div className="space-y-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50 flex flex-col items-center transition-all duration-300">
                  <div className="w-full flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                      <Sun size={14} className={useSunControl ? "text-amber-400" : "text-slate-600"} />
                      Sun & Time
                    </label>
                    <button
                      onClick={() => setUseSunControl(!useSunControl)}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors relative ${useSunControl ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${useSunControl ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className={`w-full flex flex-col items-center transition-all duration-300 ${useSunControl ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none blur-[1px]'}`}>
                    <SunPositionSelector value={sunPosition || 135} onChange={setSunPosition} />

                    <div className="w-full space-y-2 pt-4 border-t border-slate-800 mt-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Time of Day</span>
                        <span className="text-indigo-400">{Math.floor(timeOfDay)}:00</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        step="1"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] text-slate-600 font-medium">
                        <span>Night</span>
                        <span>Noon</span>
                        <span>Night</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Aperture size={14} className="text-indigo-400" /> Optics & Perspective
                  </label>
                  <button onClick={() => setLockCamera(!lockCamera)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${lockCamera ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                    {lockCamera ? <Lock size={10} /> : <Lock size={10} className="opacity-50" />}
                    {lockCamera ? "Locked" : "Lock"}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {CAMERA_CONFIGS.slice(0, 8).map(opt => {
                      const isSelected = camera === opt.val;
                      return (
                        <button
                          key={opt.val}
                          onClick={() => setCamera(opt.val)}
                          disabled={lockCamera}
                          className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border text-[10px] font-medium transition-all ${isSelected ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'} ${lockCamera ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={opt.val}
                        >
                          {opt.icon}
                          <span className="truncate w-full px-1 text-center">{opt.label}</span>
                        </button>
                      );
                    })}
                    <details className="col-span-4 group">
                      <summary className="list-none cursor-pointer flex items-center justify-center py-1 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors">
                        <ChevronDown size={12} className="group-open:rotate-180 transition-transform mr-1" />
                        {camera.includes('Wide') || camera.includes('View') || camera.includes('Level') && !CAMERA_CONFIGS.slice(0, 8).some(c => c.val === camera) ? 'Custom Angle Selected' : 'Show More Angles'}
                      </summary>
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {CAMERA_CONFIGS.slice(8).map(opt => {
                          const isSelected = camera === opt.val;
                          return (
                            <button
                              key={opt.val}
                              onClick={() => setCamera(opt.val)}
                              disabled={lockCamera}
                              className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg border text-[9px] font-medium transition-all ${isSelected ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'} ${lockCamera ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={opt.val}
                            >
                              {opt.icon}
                              <span className="truncate w-full px-1 text-center">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Maximize size={12} /> Lens (Optics)
                      </label>
                      <select
                        value={lens || ''}
                        onChange={(e) => setLens(e.target.value as CameraLens)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-slate-400 outline-none focus:border-indigo-500/50"
                      >
                        <option value="">Default Lens</option>
                        {LENS_CONFIGS.map(l => (
                          <option key={l.val} value={l.val}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Sparkles size={12} /> Aperture (f-stop)
                      </label>
                      <input
                        type="text"
                        value={aperture}
                        onChange={(e) => setAperture(e.target.value)}
                        placeholder="e.g. f/1.8"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-slate-400 outline-none focus:border-indigo-500/50 placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} className="text-emerald-400" /> Scene Elements
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => toggleElement('people')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${sceneElements.people ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}><Users size={12} /> {t('people')}</button>
                  {editorMode !== 'interior' && <button onClick={() => toggleElement('cars')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${sceneElements.cars ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}><Car size={12} /> {t('cars')}</button>}
                  <button onClick={() => toggleElement('vegetation')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${sceneElements.vegetation ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}><Trees size={12} /> {editorMode === 'interior' ? "Plants" : t('greenery')}</button>
                  {editorMode !== 'interior' && <button onClick={() => toggleElement('clouds')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${sceneElements.clouds ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}><Cloud size={12} /> {t('clouds')}</button>}
                  {editorMode !== 'interior' && (
                    <>
                      <button onClick={() => toggleElement('city')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${sceneElements.city ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}><Building2 size={12} /> {t('city')}</button>
                      <button onClick={() => toggleElement('motionBlur')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${sceneElements.motionBlur ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}><Wind size={12} /> {t('motionBlur')}</button>
                      <button onClick={() => toggleElement('enhanceFacade')} className={`col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${sceneElements.enhanceFacade ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}><Zap size={12} /> {t('enhanceFacade')}</button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2"><LayoutTemplate size={14} /> {t('aspectRatio')}</label>
                <div className="grid grid-cols-3 gap-1">
                  {['Original', '1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => (
                    <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`px-2 py-2 text-xs rounded border transition-all ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{ratio}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Sketch Style</span>
                  <div className="flex gap-1">
                    {(['handdrawn', 'pen', 'pencil', 'watercolor'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setSketchStyle(style)}
                        className={`px-2 py-0.5 text-[9px] rounded-full border transition-all ${sketchStyle === style ? 'bg-amber-500/20 border-amber-500 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSketchify}
                  disabled={isGenerating || (!sourceImage && !resultImage)}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${(isGenerating || (!sourceImage && !resultImage)) ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20'}`}
                >
                  <Pen size={14} /> Sketchify Current Image
                </button>
              </div>

              <div className="relative pt-6 flex flex-col gap-2">
                <div className="relative flex items-stretch gap-2">
                  <div className="relative flex-1">
                    {showInstructions && <GuideTooltip text={t('guideGenerate')} className="-top-14 left-0 w-full max-w-none" side="bottom" />}
                    <button
                      onClick={() => batchMode ? processBatch() : handleGenerate()}
                      disabled={batchMode ? (isBatchProcessing || batchImages.length === 0) : (isGenerating || (!sourceImage && !prompt))}
                      className={`w-full py-6 rounded-xl font-bold text-xl shadow-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 ${(batchMode ? (isBatchProcessing || batchImages.length === 0) : (isGenerating || (!sourceImage && !prompt))) ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white shadow-indigo-500/40 ring-1 ring-white/10'}`}
                    >
                      {batchMode ? (isBatchProcessing ? <><Loader2 size={24} className="animate-spin" />Processing {batchProgress.current}/{batchProgress.total}...</> : <><Layers size={24} />Generate Batch {batchImages.length > 0 ? `(${batchImages.length})` : ''}</>) : (isGenerating ? <><Loader2 size={24} className="animate-spin" />{t('generating')} {generationCount > 1 ? `(${batchProgress.current}/${batchProgress.total})` : ''}</> : <><Zap size={24} fill="currentColor" />{t('generate')}</>)}
                    </button>
                  </div>

                  {!batchMode && (
                    <div className="flex flex-col gap-1 min-w-[80px]">
                      <span className="text-[9px] font-bold text-slate-500 uppercase text-center">Amount</span>
                      <select
                        value={generationCount}
                        onChange={(e) => setGenerationCount(parseInt(e.target.value))}
                        className="h-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 text-slate-200 font-bold focus:border-indigo-500 transition-colors cursor-pointer appearance-none text-center outline-none"
                        style={{ height: 'calc(100% - 14px)' }}
                      >
                        {[1, 2, 3, 4].map(num => (
                          <option key={num} value={num}>{num} {num === 1 ? 'Image' : 'Images'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>


      {/* COLUMN 2: RESULT (50%) */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4 min-h-[300px] h-[600px] lg:h-full min-h-0 shrink-0 lg:shrink lg:max-h-none overscroll-contain">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl flex-1 flex flex-col relative overflow-hidden">
          {showInstructions && <GuideTooltip text={t('guideResult')} className="top-16 left-1/2" side="top" />}

          <div className="flex items-center justify-between p-4 text-indigo-400 font-semibold relative border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Maximize2 size={18} />
              <h2>{t('result')}</h2>
            </div>

            <div className="flex items-center gap-2 relative">
              {showInstructions && resultImage && <GuideTooltip text={t('guideTools')} className="-bottom-16 right-0" side="top" />}
              {resultImage && (
                <>
                  <button
                    onClick={() => setPreviewImage(resultImage)}
                    className="p-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    title={t('fullScreen')}
                  >
                    <Maximize size={14} />
                  </button>
                  <button
                    onClick={handleUpscale}
                    disabled={isUpscaling || isMagnificUpscaling}
                    className="flex items-center gap-2 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                    title="Recraft Crisp Upscale"
                  >
                    {isUpscaling ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} {t('upscale')}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowFreepikSettings(!showFreepikSettings)}
                      disabled={isUpscaling || isMagnificUpscaling}
                      className="flex items-center gap-2 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-4 py-1.5 rounded-md transition-all shadow-lg shadow-amber-900/40 disabled:opacity-50 font-bold"
                      title="Configure & Run Magnific Upscale"
                    >
                      {isMagnificUpscaling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Magnific
                    </button>

                    {showFreepikSettings && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 z-[100] mt-2">
                        <FreepikSettings
                          settings={freepikSettings}
                          onChange={setFreepikSettings}
                          onClose={() => setShowFreepikSettings(false)}
                          onUpscale={handleMagnificUpscale}
                          isUpscaling={isMagnificUpscaling}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setDrawingTarget('result')}
                    className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Pencil size={14} /> {t('edit')}
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(resultImage);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = getHouzaiFilename('png');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (err: any) {
                        console.error("Download failed", err);
                        alert(`Download failed: ${err.message} `);
                      }
                    }}
                    className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Download size={14} /> {t('download')}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 relative flex flex-col min-h-0 bg-slate-900/30">
            {batchMode ? (
              batchResults.length > 0 || isBatchProcessing ? (
                <BatchResults
                  results={batchResults}
                  onClose={() => {
                    setBatchResults([]);
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center p-4">
                  <Layers size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Batch results will appear here</p>
                  <p className="text-xs text-slate-500 mt-1">Upload images and click Generate Batch</p>
                </div>
              )
            ) : (
              isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 animate-pulse p-4">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-mono">{t('simulating')}</p>
                  {generationCount > 1 && <p className="text-xs text-slate-500 mt-1">Generating {batchProgress.current} of {batchProgress.total}...</p>}
                  {sceneElements.enhanceFacade && <p className="text-xs text-slate-500 mt-2">{t('enhanceFacade')}...</p>}
                </div>
              ) : multiResults.length > 1 ? (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className={`grid gap-4 ${multiResults.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                    {multiResults.map((res, idx) => (
                      <div
                        key={idx}
                        className={`group relative rounded-lg border-2 overflow-hidden transition-all cursor-pointer hover:scale-[1.02] ${resultImage === res.url ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-800 hover:border-slate-600'}`}
                        onClick={() => setResultImage(res.url)}
                      >
                        <img src={res.url} alt={`Result ${idx + 1}`} className="w-full h-auto aspect-square object-cover" />
                        <div className="absolute inset-0 bg-slate-900/90 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between backdrop-blur-sm">
                          <div className="space-y-2 overflow-hidden">
                            <div className="flex items-center justify-between text-[10px] font-bold text-indigo-400 border-b border-indigo-500/20 pb-1">
                              <span>SETTINGS</span>
                              {resultImage === res.url && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> ACTIVE</span>}
                            </div>
                            <p className="text-[10px] text-slate-200 line-clamp-3 leading-tight italic">"{res.settings.prompt}"</p>
                            <div className="flex flex-wrap gap-1">
                              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-400">{res.settings.style}</span>
                              <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-400">{res.settings.model}</span>
                            </div>
                          </div>
                          <button className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded transition-colors shadow-lg shadow-indigo-900/40">
                            {resultImage === res.url ? 'Viewing This Result' : 'Select Result'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : resultImage ? (
                sourceImage ? (
                  <BeforeAfter beforeImage={sourceImage} afterImage={resultImage} />
                ) : (
                  <img src={resultImage} alt="Result" className="w-full h-full object-contain" />
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center p-4">
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
