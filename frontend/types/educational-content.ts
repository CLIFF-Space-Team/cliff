
export type EducationalLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
export type ContentType = 'overview' | 'physics' | 'exploration' | 'discovery' | 'mission' | 'fun_facts';
export type InteractionType = 'hover' | 'click' | 'focus' | 'proximity' | 'time_based';

export interface LocalizedContent {
  tr: string;
  en: string;
  [key: string]: string;
}

export interface EducationalContent {
  id: string;
  title: LocalizedContent;
  description: LocalizedContent;
  content: LocalizedContent;
  type: ContentType;
  level: EducationalLevel;
  tags: string[];
  
  images?: Array<{
    url: string;
    caption: LocalizedContent;
    credit?: string;
  }>;
  
  videos?: Array<{
    url: string;
    thumbnail: string;
    duration: number;
    caption: LocalizedContent;
  }>;
  
  interactive?: {
    hasQuiz: boolean;
    has3DModel: boolean;
    hasComparison: boolean;
    hasTimeline: boolean;
  };
  
  lastUpdated: Date;
  sources: Array<{
    name: string;
    url: string;
    type: 'nasa' | 'esa' | 'academic' | 'other';
  }>;
  
  readingTime: number; // minutes
  complexity: number; // 1-5 scale
  interactivity: number; // 1-5 scale
}

export interface MissionData {
  id: string;
  name: LocalizedContent;
  agency: string;
  launchDate: Date;
  endDate?: Date;
  status: 'planned' | 'active' | 'completed' | 'failed';
  target: string; // celestial body ID
  
  description: LocalizedContent;
  objectives: LocalizedContent[];
  achievements: Array<{
    title: LocalizedContent;
    date: Date;
    description: LocalizedContent;
    significance: EducationalLevel;
  }>;
  
  patch?: string;
  images: string[];
  trajectoryData?: Array<{
    date: Date;
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
  }>;
  
  educationalContent: EducationalContent[];
  
  spacecraft?: {
    mass: number; // kg
    power: number; // watts
    instruments: Array<{
      name: string;
      description: LocalizedContent;
      type: string;
    }>;
  };
}

export interface HistoricalEvent {
  id: string;
  title: LocalizedContent;
  date: Date;
  type: 'discovery' | 'first_observation' | 'mission_milestone' | 'scientific_breakthrough';
  relatedBody: string; // celestial body ID
  
  description: LocalizedContent;
  significance: LocalizedContent;
  discoverer?: string;
  method: LocalizedContent; // how it was discovered
  
  image?: string;
  coordinates?: { ra: number; dec: number }; // right ascension, declination
  
  educationalLevel: EducationalLevel;
  culturalImpact: LocalizedContent;
}

export interface CelestialComparison {
  id: string;
  title: LocalizedContent;
  type: 'size' | 'mass' | 'distance' | 'temperature' | 'gravity' | 'atmosphere';
  
  subjects: Array<{
    bodyId: string;
    value: number;
    unit: string;
    visualScale?: number; // for 3D representation
  }>;
  
  explanation: LocalizedContent;
  significance: LocalizedContent;
  analogies: Array<{
    description: LocalizedContent;
    accuracy: number; // 1-5 scale
  }>;
  
  visualization: {
    type: '3d_models' | 'chart' | 'animation' | 'side_by_side';
    config: Record<string, any>;
  };
}

export interface TooltipConfig {
  id: string;
  trigger: InteractionType;
  position: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';
  delay: number; // milliseconds
  duration: number; // milliseconds, 0 for persistent
  
  maxWidth: number;
  responsive: boolean;
  hideOnScroll: boolean;
  hideOnClickOutside: boolean;
  
  ariaLabel: LocalizedContent;
  tabIndex?: number;
  focusable: boolean;
  
  animation: {
    enter: string;
    exit: string;
    duration: number;
  };
}

export interface TooltipContent {
  title?: LocalizedContent;
  subtitle?: LocalizedContent;
  description: LocalizedContent;
  
  sections?: Array<{
    title: LocalizedContent;
    content: LocalizedContent;
    type: ContentType;
    expandable: boolean;
    defaultExpanded: boolean;
  }>;
  
  stats?: Array<{
    label: LocalizedContent;
    value: string | number;
    unit?: string;
    format?: 'number' | 'percentage' | 'distance' | 'time' | 'temperature';
  }>;
  
  actions?: Array<{
    label: LocalizedContent;
    action: 'focus_camera' | 'show_orbit' | 'play_animation' | 'open_info' | 'compare';
    params?: Record<string, any>;
    icon?: string;
  }>;
  
  relatedContent?: string[]; // IDs of related educational content
  
  preview?: {
    type: 'image' | '3d_preview' | 'chart';
    source: string;
    aspectRatio?: number;
  };
}

export interface InformationPanel {
  id: string;
  celestialBodyId: string;
  
  layout: 'sidebar' | 'modal' | 'overlay' | 'floating';
  size: 'small' | 'medium' | 'large' | 'fullscreen';
  resizable: boolean;
  draggable: boolean;
  collapsible: boolean;
  
  tabs: Array<{
    id: string;
    title: LocalizedContent;
    icon: string;
    content: PanelTabContent;
    order: number;
  }>;
  
  breadcrumb?: Array<{
    label: LocalizedContent;
    target: string;
  }>;
  
  defaultTab: string;
  rememberState: boolean;
  syncWithTimeController: boolean;
}

export interface PanelTabContent {
  type: 'overview' | 'physics' | 'exploration' | 'missions' | 'comparison' | 'timeline';
  
  loader?: () => Promise<EducationalContent[]>;
  
  content?: {
    sections: Array<{
      id: string;
      title: LocalizedContent;
      content: LocalizedContent;
      media?: Array<{
        type: 'image' | 'video' | '3d_model' | 'chart';
        source: string;
        caption?: LocalizedContent;
      }>;
      expandable: boolean;
      defaultExpanded: boolean;
    }>;
    
    interactiveElements?: Array<{
      type: 'scale_comparison' | 'orbit_visualization' | 'timeline' | 'quiz';
      config: Record<string, any>;
      position: number; // order in content
    }>;
  };
}

export interface SearchableContent {
  id: string;
  type: 'celestial_body' | 'mission' | 'event' | 'educational_content';
  title: LocalizedContent;
  description: LocalizedContent;
  tags: string[];
  categories: string[];
  
  keywords: LocalizedContent;
  searchWeight: number;
  lastUpdated: Date;
  
  quickStats?: Record<string, string | number>;
}

export interface SearchFilter {
  categories: string[];
  tags: string[];
  educationalLevels: EducationalLevel[];
  contentTypes: ContentType[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  hasMedia: boolean;
  isInteractive: boolean;
}

export interface TourStep {
  id: string;
  title: LocalizedContent;
  description: LocalizedContent;
  target: {
    type: 'celestial_body' | 'ui_element' | 'coordinate';
    identifier: string;
    position?: { x: number; y: number; z: number };
  };
  
  duration: number; // seconds, 0 for manual advance
  cameraAnimation: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    duration: number; // seconds
    easing: string;
  };
  
  overlay?: {
    type: 'spotlight' | 'highlight' | 'arrow' | 'circle';
    config: Record<string, any>;
  };
  
  interactiveElements?: Array<{
    type: 'button' | 'animation' | 'info_panel' | 'comparison';
    trigger: 'auto' | 'click' | 'timer';
    config: Record<string, any>;
  }>;
  
  nextStep?: string;
  previousStep?: string;
  skipAllowed: boolean;
  mandatory: boolean;
}

export interface GuidedTour {
  id: string;
  title: LocalizedContent;
  description: LocalizedContent;
  category: 'beginner' | 'intermediate' | 'advanced' | 'themed';
  theme?: string; // e.g., "mars_exploration", "outer_planets"
  
  estimatedDuration: number; // minutes
  steps: TourStep[];
  requirements: {
    minLevel: EducationalLevel;
    requiredFeatures: string[]; // WebGL, VR, etc.
  };
  
  completionCriteria: {
    minStepsCompleted: number;
    requiredInteractions: string[];
  };
  
  author: string;
  version: string;
  lastUpdated: Date;
  tags: string[];
}

export interface LearningProgress {
  userId?: string;
  sessionId: string;
  
  viewedContent: Array<{
    contentId: string;
    viewTime: number; // seconds
    completionPercentage: number;
    interactions: number;
    timestamp: Date;
  }>;
  
  featuresUsed: Array<{
    feature: string;
    usageCount: number;
    totalTime: number;
    lastUsed: Date;
  }>;
  
  conceptsMastered: string[];
  difficultyPreference: EducationalLevel;
  preferredContentTypes: ContentType[];
  
  accessibilitySettings: {
    highContrast: boolean;
    largeText: boolean;
    audioDescriptions: boolean;
    keyboardNavigation: boolean;
    screenReader: boolean;
  };
}

export interface AccessibilityFeatures {
  ariaLabels: LocalizedContent;
  altTexts: LocalizedContent;
  descriptions: LocalizedContent;
  
  keyboardShortcuts: Array<{
    key: string;
    modifiers: string[];
    action: string;
    description: LocalizedContent;
  }>;
  
  highContrastMode: boolean;
  focusIndicators: boolean;
  colorBlindSupport: boolean;
  
  audioDescriptions: Array<{
    trigger: string;
    content: LocalizedContent;
    duration: number;
  }>;
  
  alternativeInputMethods: string[];
  customizableControls: boolean;
  gestureSupport: boolean;
}

export interface LiveDataSource {
  id: string;
  name: string;
  type: 'nasa_api' | 'esa_api' | 'ground_station' | 'telescope' | 'spacecraft';
  endpoint: string;
  updateInterval: number; // seconds
  
  dataMapping: {
    [key: string]: string; // maps API fields to our data structure
  };
  
  fallback?: {
    staticData: any;
    message: LocalizedContent;
  };
  
  validator?: (data: any) => boolean;
  
  cacheDuration: number; // seconds
  cacheKey: string;
}

export interface EducationalDatabase {
  celestialBodies: Record<string, {
    content: EducationalContent[];
    missions: MissionData[];
    events: HistoricalEvent[];
    comparisons: CelestialComparison[];
  }>;
  
  tours: GuidedTour[];
  searchableContent: SearchableContent[];
  liveDataSources: LiveDataSource[];
  
  version: string;
  lastUpdated: Date;
  languages: string[];
  defaultLanguage: string;
}