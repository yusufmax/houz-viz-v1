
export enum RenderStyle {
  None = 'None',
  Photorealistic = 'Photorealistic',
  PanArabic = 'Pan Arabic',
  Asian = 'Asian / Zen',
  Scandic = 'Scandinavian',
  Tropical = 'Tropical',

  // Office Building
  OfficeGlass = 'Office: Glass Curtain Wall',
  OfficeACM = 'Office: Alucobond / ACM Panels (Hi-Tech)',
  OfficeNeoclassic = 'Office: Neoclassical (Stone & Columns)',
  OfficeConcrete = 'Office: Modern Concrete & Glass',
  OfficeBrick = 'Office: Industrial Brick & Metal',

  // Mixed Use Building
  MixedGlassSteel = 'Mixed Use: Glass & Steel Tower',
  MixedBrickLoft = 'Mixed Use: Brick Loft & Metal',
  MixedNeoclassic = 'Mixed Use: Neoclassical Facade',
  MixedModern = 'Mixed Use: Modern Composite Panels',
  MixedFuturistic = 'Mixed Use: Futuristic Metal & Glass',

  // Apartment Complex
  AptModern = 'Apartment: Modern Glass & Concrete',
  AptNeoclassic = 'Apartment: Neoclassical Stone',
  AptBrick = 'Apartment: Classic Brick Facade',
  AptMinimal = 'Apartment: Minimalist White Stucco',
  AptHiTech = 'Apartment: Hi-Tech Metal Facade',

  // Home
  HomeModern = 'Home: Modern Concrete & Glass',
  HomeNeoclassic = 'Home: Neoclassical Villa',
  HomeHiTech = 'Home: Hi-Tech Steel & Glass',
  HomeMinimal = 'Home: Minimalist Stucco',
  HomeClassic = 'Home: Classic Brick & Stone',

  // General / Artistic
  cinematic = 'Cinematic',
  Sketch = 'Sketch / Drawing',
  Watercolor = 'Watercolor',
  Blueprint = 'Blueprint',
  PencilDrawing = 'Pencil Drawing',
  Chalk = 'Chalk Sketch',
  Cyberpunk = 'Cyberpunk',

  // Exterior Additional
  Modernist = 'Modernist',
  Minimalist = 'Minimalist',
  Brutalism = 'Brutalism',
  Bauhaus = 'Bauhaus',
  Colonial = 'Colonial',
  Rustic = 'Rustic',
  Parametric = 'Parametric',
  IndustrialLoft = 'Industrial Loft',
  Biophilic = 'Biophilic',
  GlassFacade = 'Glass Facade',
  Sustainable = 'Sustainable',
  Cottage = 'Cottage',
  Alpine = 'Alpine',
  DesertModern = 'Desert Modern',

  // Interior - Home
  HomeScandi = 'Interior: Scandinavian',
  HomeJapandi = 'Interior: Japandi',
  HomeBoho = 'Interior: Boho',
  HomeIndustrial = 'Interior: Industrial',
  HomeLuxury = 'Interior: Luxury',
  HomeMidCentury = 'Interior: Mid-Century Modern',
  HomeCoastal = 'Interior: Coastal',
  HomeFarmhouse = 'Interior: Farmhouse',
  HomeWabiSabi = 'Interior: Wabi-Sabi',
  HomeMaximalist = 'Interior: Maximalist',
  HomeArtDeco = 'Interior: Art Deco',
  // HomeClassic is already defined above

  // Interior - Office
  OfficeOpenPlan = 'Office: Open Plan',
  OfficeExecutive = 'Office: Executive Suite',
  OfficeCreative = 'Office: Creative Studio',
  OfficeTech = 'Office: Tech Startup',
  OfficeBiophilic = 'Office: Biophilic',

  // Interior - Retail
  RetailBoutique = 'Retail: Boutique',
  RetailShowroom = 'Retail: Showroom',
  RetailMall = 'Retail: Mall',
  RetailMinimal = 'Retail: Minimalist Store',

  // Interior - Hospitality
  HospHotelLobby = 'Hospitality: Hotel Lobby',
  HospRestaurant = 'Hospitality: Restaurant',
  HospCafe = 'Hospitality: Cafe',
  HospBar = 'Hospitality: Bar',

  // Sales / Real Estate
  SalesRealEstate = 'Real Estate: Staging',
  SalesReception = 'Real Estate: Reception',
  SalesGallery = 'Real Estate: Gallery'
}

export enum SuperRenderStyle {
  None = 'None',
  Minimalist = 'Product: Minimalist Studio',
  Lifestyle = 'Product: Lifestyle / Street',
  Luxury = 'Product: Luxury / High-end',
  Action = 'Product: Action / Dynamic',
  Cinematic = 'Product: Cinematic Lighting',
  FlatLay = 'Product: Flat Lay / Top-down',
  Macro = 'Product: Macro / Detailed',
  OnHand = 'Product: On Hand / Holding',
  Everyday = 'Product: Everyday / Casual',
  InAction = 'Product: In Action / Usage',
  SurrealViz = 'Product: Surreal / Artistic'
}

export enum CameraLens {
  UltraWide = '14mm Ultra-Wide',
  Wide = '24mm Wide (Context)',
  Standard = '50mm Standard',
  Portrait = '85mm Prime (Portrait)',
  Macro = '100mm Macro (Detail)',
  Telephoto = '200mm Telephoto (Compression)',
  Fisheye = 'Fisheye (Artistic)'
}

export enum Atmosphere {
  None = 'None',
  Sunny = 'Sunny Day',
  Sunset = 'Golden Hour Sunset',
  Night = 'Realistic Night time',
  Foggy = 'Foggy & Mysterious',
  Rainy = 'Rainy Reflections',
  Snowy = 'Snowy Winter',
  Overcast = 'Soft Overcast',
  Dawn = 'Blue Hour Dawn',
  Stormy = 'Dramatic Stormy',
  Misty = 'Morning Mist / Ethereal',
  Cyber = 'Neon Cyberpunk Lighting',
  // Interior Specific
  WarmTungsten = 'Interior: Warm Tungsten',
  NaturalLight = 'Interior: Natural Window Light',
  Studio = 'Interior: Studio Lighting',
  Candlelight = 'Interior: Candlelight / Cozy',
  // Seasons
  Spring = 'Spring / Blooming',
  Summer = 'Summer / Vibrant',
  Autumn = 'Autumn / Fall Colors',
  Winter = 'Winter / Cold'
}

export enum SuperAtmosphere {
  None = 'None',
  StudioSoftbox = 'Softbox / Studio Lighting',
  DramaticShadows = 'Dramatic / High Contrast',
  NeonCyber = 'Neon / Cyberpunk Glow',
  GoldenHour = 'Product: Golden Hour',
  HardLight = 'Hard Lighting / Crisp',
  SoftDiffused = 'Soft Diffused / Airy',
  Vibrant = 'Vibrant / High Saturation'
}

export enum CameraAngle {
  Default = 'Default',
  EyeLevel = 'Eye Level',
  Drone = 'Drone View / Aerial',
  LowAngle = 'Low Angle / Hero Shot',
  Isometric = 'Isometric View',
  TopDown = 'Top Down Plan View',
  CloseUp = 'Close Up Detail',
  WideAngle = 'Wide Angle / Interior',
  ThreeQuarterView = 'Three Quarter View',
  WormEyeView = 'Worm Eye View',
  BirdEyeView = 'Bird Eye View',
  StreetLevel = 'Street Level',
  FacadeView = 'Facade View',
  InteriorWide = 'Interior Wide Angle',
  ExteriorWide = 'Exterior Wide Angle'
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | 'Original' | '1:4' | '4:1' | '1:8' | '8:1';

export interface SceneElements {
  people: boolean;
  cars: boolean;
  clouds: boolean;
  vegetation: boolean;
  city: boolean;
  motionBlur: boolean;
  enhanceFacade: boolean;
}

export interface Tag {
  id: number;
  x: number;
  y: number;
  image: string;
  prompt?: string;
}

export interface GenerationSettings {
  prompt: string;
  style: RenderStyle;
  atmosphere: Atmosphere[];
  camera: CameraAngle;
  aspectRatio: AspectRatio;
  negativePrompt?: string;
  sceneElements: SceneElements;
  styleReferenceImage?: string | null;
  atmosphereReferenceImage?: string | null;
  architectureReferenceImage?: string | null;
  model?: string;
  lens?: CameraLens;
  aperture?: string;
  resolution?: string;
  keepBuilding?: boolean;
  lockCamera?: boolean;
  lockInterior?: boolean;
  interior?: InteriorSettings;
  superMode?: SuperModeSettings;
  tags?: Tag[];
  sunPosition?: number;
  timeOfDay?: number;
  useGrounding?: boolean;
  customReferences?: CustomReference[];
}

export interface CustomReference {
  id: string;
  category: 'People' | 'Environment' | 'Architecture' | 'Atmosphere';
  image: string;
  prompt: string; 
}

export type GarmentCategory = 'Top' | 'Bottom' | 'Shoes' | 'Accessories' | 'Full Body' | 'Other';

export interface GarmentSlot {
  id: string;
  type: GarmentCategory;
  image: string | null;
}

export interface SuperModeSettings {
  productCategory: string;
  lighting: SuperAtmosphere;
  background: string;
  focus: 'Object' | 'Context' | 'Detail';
  model?: string;
  lightingIntensity?: 'Soft' | 'Balanced' | 'Hard';
  lightingColor?: string;
  groundMaterial?: string;
  environmentProps?: string;
  cameraAngle: string;
  lens?: CameraLens;
  isMoodboard?: boolean;
  generateMultiAngle?: boolean;
  multiAngleSelection?: string[];
  aperture?: string;
  shutterSpeed?: string;
  isVirtualTryOn?: boolean;
  garmentImage?: string | null; // Deprecated but kept for compatibility
  garments?: GarmentSlot[];
  modelGen?: ModelGenSettings;
  location?: 'Studio' | 'Interior' | 'Exterior';
}

export interface ModelGenSettings {
  gender?: string;
  age?: string;
  skinTone?: string;
  nationality?: string;
  eyeColor?: string;
  hairColor?: string;
  height?: string;
  pose?: string;
}

export interface InteriorSettings {
  flooring: { type: string; image?: string | null };
  furniture: { style: string; image?: string | null };
  primaryColor: { value: string; image?: string | null };
  wallColor: { value: string; image?: string | null };
}

// Infinity Node Types
export interface NodeData {
  label?: string;
  value?: any;
  type?: string; // 'image', 'text', 'combo'
  imageSrc?: string;
  beforeImage?: string; // Source image for Before/After comparison
  settings?: GenerationSettings;
  subtype?: 'general' | 'arch' | 'product' | 'super';
  collapsed?: boolean;
}

export interface Node {
  id: string;
  type: 'input' | 'processor' | 'output' | 'prompt';
  x: number;
  y: number;
  width?: number;
  height?: number;
  data: NodeData;
  inputs: string[]; // IDs of nodes connected to this node's inputs
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  website: string | null;
  updated_at: string;
  generation_quota: number;
  generations_used: number;
  is_admin_visible?: boolean;
  is_admin?: boolean;
  is_banned?: boolean;
  magnific_enabled?: boolean;
}
export interface Project {
  id: string;
  name: string;
  lastModified: number;
  type?: 'canvas' | 'linear'; // Distinguish project types
  nodes?: Node[]; // Optional for linear projects
  connections?: Connection[]; // Optional for linear projects
  pan?: { x: number, y: number }; // Optional for linear projects
  zoom?: number; // Optional for linear projects
  linearState?: {
    prompt: string;
    style: RenderStyle;
    atmosphere: Atmosphere[];
    camera: CameraAngle;
    aspectRatio: AspectRatio;
    sceneElements: SceneElements;
    model: string;
    sourceImage: string | null;
    styleReferenceImage: string | null;
    atmosphereReferenceImage?: string | null;
    architectureReferenceImage?: string | null;
    resultImage: string | null;
    lockCamera?: boolean;
    lockInterior?: boolean;
    interiorSettings?: any;
    editorMode?: 'exterior' | 'interior' | 'general';
    tags?: Tag[];
    sunPosition?: number;
    timeOfDay?: number;
    useSunControl?: boolean;
    customReferences?: CustomReference[];
  };
}

export interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  style: RenderStyle;
  metadata?: any;
  modelName?: string;
  estimatedCost?: number;
}

// Video Generation Types
export enum KlingModel {
  V2_5_Turbo = 'kling-v2-5-turbo',
  V2_1 = 'kling-v2-1',
  V3 = 'kling-v3'
}

export type CameraMovementType = 'simple' | 'down_back' | 'forward_up' | 'right_turn_forward' | 'left_turn_forward';

export interface CameraControlSettings {
  type: CameraMovementType;
  config: {
    horizontal: number;
    vertical: number;
    pan: number;
    tilt: number;
    roll: number;
    zoom: number;
  };
}

export interface MultiShotPrompt {
  index: number;
  prompt: string;
  duration: string;
}

export interface VideoGenerationSettings {
  model: KlingModel;
  duration: number; // Allow arbitrary sum for multi-shot
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  prompt: string;
  cfgScale?: number;
  cameraControl?: CameraControlSettings;
  mode?: 'std' | 'pro';
  multiShot?: boolean;
  multiPrompt?: MultiShotPrompt[];
}

export interface VideoGeneration {
  id: string;
  user_id: string;
  task_id: string;
  source_image: string;
  model: string;
  duration: number;
  aspect_ratio: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoQuota {
  used: number;
  quota: number;
  last_reset: string;
}

export type FreepikScaleFactor = '2x' | '4x' | '8x' | '16x';
export type FreepikStyle = 'standard' | 'soft_portraits' | 'hard_portraits' | 'art_n_illustration' | 'videogame_assets' | 'nature_n_landscapes' | 'films_n_photography' | '3d_renders' | 'science_fiction_n_horror';
export type FreepikEngine = 'automatic' | 'illusio' | 'sharpy' | 'sparkle' | 'magnific_2_0' | 'magnific_1_0';

export interface FreepikMagnificSettings {
  scale_factor: FreepikScaleFactor;
  optimized_for: FreepikStyle;
  creativity: number;
  definition: number;
  resemblance: number;
  intricacy: number;
  engine: FreepikEngine;
  prompt?: string;
}
