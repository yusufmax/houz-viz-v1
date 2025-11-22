
export enum RenderStyle {
  None = 'Photorealistic',

  // Office Building
  OfficeGlass = 'Office: Modern Glass Curtain Wall',
  OfficeTimber = 'Office: Sustainable Timber Grid',
  OfficeHighTech = 'Office: High-Tech Kinetic Facade',
  OfficeBiophilic = 'Office: Biophilic Green Tower',
  OfficeBrutalist = 'Office: Brutalist Concrete (Modernized)',

  // Mixed Use Building
  MixedRetailRes = 'Mixed Use: Retail Podium + Residential Tower',
  MixedIndustrial = 'Mixed Use: Industrial Loft Conversion',
  MixedBrickGlass = 'Mixed Use: Contemporary Brick & Glass',
  MixedTerraced = 'Mixed Use: Urban Terraced Garden',
  MixedOrganic = 'Mixed Use: Futuristic Organic Form',

  // Apartment Complex
  AptLuxury = 'Apartment: Luxury Balcony Facade',
  AptScandi = 'Apartment: Scandinavian Minimalist',
  AptMediterranean = 'Apartment: Mediterranean Stucco & Tile',
  AptSocial = 'Apartment: Modern Social Housing (Colorful)',
  AptClassic = 'Apartment: Classic Brownstone / Brick',

  // Home
  HomeMinimalist = 'Home: Modern Minimalist Villa',
  HomeFarmhouse = 'Home: Contemporary Farmhouse',
  HomeMidCentury = 'Home: Mid-Century Modern',
  HomeCoastal = 'Home: Coastal / Hamptons Style',
  HomeJapandi = 'Home: Japandi (Japanese-Scandi)',
  HomeIndustrial = 'Home: Industrial Chic Home',
  HomeCraftsman = 'Home: Traditional Craftsman'
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

export enum CameraAngle {
  Default = 'Default',
  EyeLevel = 'Eye Level',
  Drone = 'Drone View / Aerial',
  LowAngle = 'Low Angle / Hero Shot',
  Isometric = 'Isometric View',
  TopDown = 'Top Down Plan View',
  CloseUp = 'Close Up Detail',
  WideAngle = 'Wide Angle / Interior'
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | 'Original';

export interface SceneElements {
  people: boolean;
  cars: boolean;
  clouds: boolean;
  vegetation: boolean;
  city: boolean;
  motionBlur: boolean;
  enhanceFacade: boolean;
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
  model?: string;
  resolution?: string;
}

// Infinity Node Types
export interface NodeData {
  label?: string;
  value?: any;
  type?: string; // 'image', 'text', 'combo'
  imageSrc?: string;
  beforeImage?: string; // Source image for Before/After comparison
  settings?: GenerationSettings;
  subtype?: 'general' | 'arch' | 'product';
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
  avatar_url: string | null;
  website: string | null;
  updated_at: string;
  generation_quota: number;
  generations_used: number;
}
export interface Project {
  id: string;
  name: string;
  lastModified: number;
  nodes: Node[];
  connections: Connection[];
  pan: { x: number, y: number };
  zoom: number;
}

export interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  style: RenderStyle;
}

// Video Generation Types
export enum KlingModel {
  V2_5_Turbo = 'kling-v2-5-turbo',
  V2_1 = 'kling-v2-1'
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

export interface VideoGenerationSettings {
  model: KlingModel;
  duration: 5 | 10;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  prompt: string;
  cfgScale?: number;
  cameraControl?: CameraControlSettings;
  mode?: 'std' | 'pro';
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
