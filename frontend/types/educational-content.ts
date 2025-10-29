// CLIFF 3D Educational Content Types
// Interactive tooltip and information overlay system types

export type EducationalLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
export type ContentType = 'overview' | 'physics' | 'exploration' | 'discovery' | 'mission' | 'fun_facts';
export type InteractionType = 'hover' | 'click' | 'focus' | 'proximity' | 'time_based';

// Multi-language support
export interface LocalizedContent {
  tr: string;
  en: string;
  [key: string]: string;
}

// Educational content structure
export interface EducationalContent {
  id: string;
  title: LocalizedContent;
  description: LocalizedContent;
  content: LocalizedContent;
  type: ContentType;
  level: EducationalLevel;
  tags: string[];
  
  // Media assets
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
  
  // Interactive elements
  interactive?: {
    hasQuiz: boolean;
    has3DModel: boolean;
    hasComparison: boolean;
    hasTimeline: boolean;
  };
  
  // Metadata
  lastUpdated: Date;
  sources: Array<{
    name: string;
    url: string;
    type: 'nasa' | 'esa' | 'academic' | 'other';
  }>;
  
  // Difficulty and engagement metrics
  readingTime: number; // minutes
  complexity: number; // 1-5 scale
  interactivity: number; // 1-5 scale
}

// Mission data structure
export interface MissionData {
  id: string;
  name: LocalizedContent;
  agency: string;
  launchDate: Date;
  endDate?: Date;
  status: 'planned' | 'active' | 'completed' | 'failed';
  target: string; // celestial body ID
  
  // Mission details
  description: LocalizedContent;
  objectives: LocalizedContent[];
  achievements: Array<{
    title: LocalizedContent;
    date: Date;
    description: LocalizedContent;
    significance: EducationalLevel;
  }>;
  
  // Visual assets
  patch?: string;
  images: string[];
  trajectoryData?: Array<{
    date: Date;
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
  }>;
  
  // Educational content
  educationalContent: EducationalContent[];
  
  // Technical specifications
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

// Discovery and historical events
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
  
  // Visual representation
  image?: string;
  coordinates?: { ra: number; dec: number }; // right ascension, declination
  
  // Educational impact
  educationalLevel: EducationalLevel;
  culturalImpact: LocalizedContent;
}

// Comparison data for educational purposes
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
  
  // Context and explanation
  explanation: LocalizedContent;
  significance: LocalizedContent;
  analogies: Array<{
    description: LocalizedContent;
    accuracy: number; // 1-5 scale
  }>;
  
  // Interactive features
  visualization: {
    type: '3d_models' | 'chart' | 'animation' | 'side_by_side';
    config: Record<string, any>;
  };
}

// Tooltip system types
export interface TooltipConfig {
  id: string;
  trigger: InteractionType;
  position: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';
  delay: number; // milliseconds
  duration: number; // milliseconds, 0 for persistent
  
  // Responsive behavior
  maxWidth: number;
  responsive: boolean;
  hideOnScroll: boolean;
  hideOnClickOutside: boolean;
  
  // Accessibility
  ariaLabel: LocalizedContent;
  tabIndex?: number;
  focusable: boolean;
  
  // Animation
  animation: {
    enter: string;
    exit: string;
    duration: number;
  };
}

export interface TooltipContent {
  // Basic content
  title?: LocalizedContent;
  subtitle?: LocalizedContent;
  description: LocalizedContent;
  
  // Rich content
  sections?: Array<{
    title: LocalizedContent;
    content: LocalizedContent;
    type: ContentType;
    expandable: boolean;
    defaultExpanded: boolean;
  }>;
  
  // Quick stats
  stats?: Array<{
    label: LocalizedContent;
    value: string | number;
    unit?: string;
    format?: 'number' | 'percentage' | 'distance' | 'time' | 'temperature';
  }>;
  
  // Actions
  actions?: Array<{
    label: LocalizedContent;
    action: 'focus_camera' | 'show_orbit' | 'play_animation' | 'open_info' | 'compare';
    params?: Record<string, any>;
    icon?: string;
  }>;
  
  // Related content
  relatedContent?: string[]; // IDs of related educational content
  
  // Visual elements
  preview?: {
    type: 'image' | '3d_preview' | 'chart';
    source: string;
    aspectRatio?: number;
  };
}

// Information panel system
export interface InformationPanel {
  id: string;
  celestialBodyId: string;
  
  // Panel configuration
  layout: 'sidebar' | 'modal' | 'overlay' | 'floating';
  size: 'small' | 'medium' | 'large' | 'fullscreen';
  resizable: boolean;
  draggable: boolean;
  collapsible: boolean;
  
  // Content organization
  tabs: Array<{
    id: string;
    title: LocalizedContent;
    icon: string;
    content: PanelTabContent;
    order: number;
  }>;
  
  // Navigation
  breadcrumb?: Array<{
    label: LocalizedContent;
    target: string;
  }>;
  
  // State management
  defaultTab: string;
  rememberState: boolean;
  syncWithTimeController: boolean;
}

export interface PanelTabContent {
  type: 'overview' | 'physics' | 'exploration' | 'missions' | 'comparison' | 'timeline';
  
  // Dynamic content loading
  loader?: () => Promise<EducationalContent[]>;
  
  // Static content
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
    
    // Interactive elements
    interactiveElements?: Array<{
      type: 'scale_comparison' | 'orbit_visualization' | 'timeline' | 'quiz';
      config: Record<string, any>;
      position: number; // order in content
    }>;
  };
}

// Search and filter system
export interface SearchableContent {
  id: string;
  type: 'celestial_body' | 'mission' | 'event' | 'educational_content';
  title: LocalizedContent;
  description: LocalizedContent;
  tags: string[];
  categories: string[];
  
  // Search optimization
  keywords: LocalizedContent;
  searchWeight: number;
  lastUpdated: Date;
  
  // Quick access data
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

// Guided tour system
export interface TourStep {
  id: string;
  title: LocalizedContent;
  description: LocalizedContent;
  target: {
    type: 'celestial_body' | 'ui_element' | 'coordinate';
    identifier: string;
    position?: { x: number; y: number; z: number };
  };
  
  // Step behavior
  duration: number; // seconds, 0 for manual advance
  cameraAnimation: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    duration: number; // seconds
    easing: string;
  };
  
  // UI elements
  overlay?: {
    type: 'spotlight' | 'highlight' | 'arrow' | 'circle';
    config: Record<string, any>;
  };
  
  // Interactive elements
  interactiveElements?: Array<{
    type: 'button' | 'animation' | 'info_panel' | 'comparison';
    trigger: 'auto' | 'click' | 'timer';
    config: Record<string, any>;
  }>;
  
  // Navigation
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
  
  // Tour configuration
  estimatedDuration: number; // minutes
  steps: TourStep[];
  requirements: {
    minLevel: EducationalLevel;
    requiredFeatures: string[]; // WebGL, VR, etc.
  };
  
  // Progress tracking
  completionCriteria: {
    minStepsCompleted: number;
    requiredInteractions: string[];
  };
  
  // Metadata
  author: string;
  version: string;
  lastUpdated: Date;
  tags: string[];
}

// Learning analytics and progress tracking
export interface LearningProgress {
  userId?: string;
  sessionId: string;
  
  // Content engagement
  viewedContent: Array<{
    contentId: string;
    viewTime: number; // seconds
    completionPercentage: number;
    interactions: number;
    timestamp: Date;
  }>;
  
  // Feature usage
  featuresUsed: Array<{
    feature: string;
    usageCount: number;
    totalTime: number;
    lastUsed: Date;
  }>;
  
  // Learning outcomes
  conceptsMastered: string[];
  difficultyPreference: EducationalLevel;
  preferredContentTypes: ContentType[];
  
  // Accessibility preferences
  accessibilitySettings: {
    highContrast: boolean;
    largeText: boolean;
    audioDescriptions: boolean;
    keyboardNavigation: boolean;
    screenReader: boolean;
  };
}

// Accessibility support
export interface AccessibilityFeatures {
  // Screen reader support
  ariaLabels: LocalizedContent;
  altTexts: LocalizedContent;
  descriptions: LocalizedContent;
  
  // Keyboard navigation
  keyboardShortcuts: Array<{
    key: string;
    modifiers: string[];
    action: string;
    description: LocalizedContent;
  }>;
  
  // Visual accessibility
  highContrastMode: boolean;
  focusIndicators: boolean;
  colorBlindSupport: boolean;
  
  // Audio support
  audioDescriptions: Array<{
    trigger: string;
    content: LocalizedContent;
    duration: number;
  }>;
  
  // Motor accessibility
  alternativeInputMethods: string[];
  customizableControls: boolean;
  gestureSupport: boolean;
}

// Real-time data integration
export interface LiveDataSource {
  id: string;
  name: string;
  type: 'nasa_api' | 'esa_api' | 'ground_station' | 'telescope' | 'spacecraft';
  endpoint: string;
  updateInterval: number; // seconds
  
  // Data mapping
  dataMapping: {
    [key: string]: string; // maps API fields to our data structure
  };
  
  // Error handling
  fallback?: {
    staticData: any;
    message: LocalizedContent;
  };
  
  // Data validation
  validator?: (data: any) => boolean;
  
  // Caching
  cacheDuration: number; // seconds
  cacheKey: string;
}

// Export main educational content database structure
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
  
  // Metadata
  version: string;
  lastUpdated: Date;
  languages: string[];
  defaultLanguage: string;
}