
export enum RenderStyle {
  None = 'None',
  // General
  Photorealistic = 'Photorealistic',
  cinematic = 'Cinematic & Dramatic',
  // Architectural Styles
  Minimalist = 'Minimalist',
  Brutalism = 'Brutalism',
  Modernist = 'Modernist',
  Futuristic = 'Futuristic Organic',
  Deconstructivism = 'Deconstructivism',
  Parametric = 'Parametric Design',
  Bauhaus = 'Bauhaus',
  Mediterranean = 'Mediterranean',
  Colonial = 'Colonial / Neoclassical',
  Rustic = 'Rustic / Stone & Timber',
  IndustrialLoft = 'Industrial Loft',
  // Cultural
  PanArabic = 'Pan-Arabic / Islamic Modern',
  Asian = 'Contemporary Asian / Zen',
  Tropical = 'Tropical Modernism',
  Scandic = 'Nordic / Scandinavian',
  // Rendering Techniques
  Sketch = 'Architectural Sketch',
  Watercolor = 'Watercolor',
  Cyberpunk = 'Cyberpunk',
  PencilDrawing = 'Pencil Drawing',
  Blueprint = 'Blueprint',
  Chalk = 'Chalk Sketch',

  // Interior - Home
  HomeScandi = 'Interior Home: Scandinavian',
  HomeJapandi = 'Interior Home: Japandi',
  HomeBoho = 'Interior Home: Bohemian',
  HomeIndustrial = 'Interior Home: Industrial',
  HomeLuxury = 'Interior Home: Luxury Contemporary',
  HomeMidCentury = 'Interior Home: Mid-Century Modern',
  HomeCoastal = 'Interior Home: Coastal / Hamptons',
  HomeFarmhouse = 'Interior Home: Modern Farmhouse',
  HomeWabiSabi = 'Interior Home: Wabi Sabi',
  HomeMaximalist = 'Interior Home: Maximalist',
  HomeArtDeco = 'Interior Home: Art Deco',
  HomeClassic = 'Interior Home: Classic Contemporary',

  // Interior - Office
  OfficeOpenPlan = 'Interior Office: Open Plan',
  OfficeExecutive = 'Interior Office: Executive Suite',
  OfficeCreative = 'Interior Office: Creative Studio',
  OfficeTech = 'Interior Office: Tech Startup / Modern',
  OfficeBiophilic = 'Interior Office: Biophilic / Green',

  // Interior - Retail
  RetailBoutique = 'Interior Retail: Luxury Boutique',
  RetailShowroom = 'Interior Retail: Car/Product Showroom',
  RetailMall = 'Interior Retail: Shopping Mall',
  RetailMinimal = 'Interior Retail: Minimalist Store',

  // Interior - Hospitality
  HospHotelLobby = 'Interior Hospitality: Hotel Lobby',
  HospRestaurant = 'Interior Hospitality: Fine Dining',
  HospCafe = 'Interior Hospitality: Coffee Shop / Cafe',
  HospBar = 'Interior Hospitality: Lounge Bar',

  // Interior - Sales Office
  SalesRealEstate = 'Interior Sales: Real Estate Center',
  SalesReception = 'Interior Sales: Corporate Reception',
  SalesGallery = 'Interior Sales: Sales Gallery / Exhibition',

  // Exterior
  Biophilic = 'Exterior: Biophilic',
  GlassFacade = 'Exterior: Glass Facade',
  Sustainable = 'Exterior: Sustainable Timber',
  Cottage = 'Exterior: Modern Cottage',
  Alpine = 'Exterior: Alpine Chalet',
  DesertModern = 'Exterior: Desert Modernism'
}

export enum Atmosphere {
  None = 'None',
  Sunny = 'Sunny Day',
  Sunset = 'Golden Hour Sunset',
  Night = 'Night with City Lights',
  Foggy = 'Foggy & Mysterious',
  Rainy = 'Rainy Neon Reflections',
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
