"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { AccessibilityFeatures } from '../types/educational-content';

// Remove circular dependency - we'll handle translation differently

// Accessibility preferences interface
export interface AccessibilityPreferences {
  // Visual accessibility
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  colorBlindSupport: boolean;
  focusIndicators: boolean;
  
  // Audio accessibility
  audioDescriptions: boolean;
  soundEffects: boolean;
  voiceNavigation: boolean;
  
  // Motor accessibility
  keyboardNavigation: boolean;
  stickyKeys: boolean;
  slowKeys: boolean;
  mouseKeys: boolean;
  
  // Cognitive accessibility
  simplifiedInterface: boolean;
  readingGuide: boolean;
  pauseAnimations: boolean;
  
  // Screen reader support
  screenReader: boolean;
  verboseDescriptions: boolean;
  announceChanges: boolean;
}

// Keyboard shortcuts interface
export interface KeyboardShortcut {
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description: string;
  category: 'navigation' | 'content' | 'media' | 'accessibility';
}

// Focus management interface
export interface FocusState {
  currentFocus: string | null;
  focusHistory: string[];
  focusTrappedIn: string | null;
  skipLinks: Array<{
    id: string;
    label: string;
    target: string;
  }>;
}

// Accessibility state interface
interface AccessibilityState {
  preferences: AccessibilityPreferences;
  shortcuts: KeyboardShortcut[];
  focusState: FocusState;
  announcements: Array<{
    id: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
    timestamp: number;
  }>;
  isLoading: boolean;
  error: string | null;
}

// Accessibility actions
type AccessibilityAction =
  | { type: 'SET_PREFERENCE'; payload: { key: keyof AccessibilityPreferences; value: boolean } }
  | { type: 'SET_PREFERENCES'; payload: Partial<AccessibilityPreferences> }
  | { type: 'SET_FOCUS'; payload: string | null }
  | { type: 'TRAP_FOCUS'; payload: string | null }
  | { type: 'ADD_ANNOUNCEMENT'; payload: { message: string; priority: 'low' | 'medium' | 'high' } }
  | { type: 'CLEAR_ANNOUNCEMENTS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Default preferences
const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  colorBlindSupport: false,
  focusIndicators: true,
  audioDescriptions: false,
  soundEffects: true,
  voiceNavigation: false,
  keyboardNavigation: true,
  stickyKeys: false,
  slowKeys: false,
  mouseKeys: false,
  simplifiedInterface: false,
  readingGuide: false,
  pauseAnimations: false,
  screenReader: false,
  verboseDescriptions: false,
  announceChanges: true
};

// Default keyboard shortcuts
const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'h',
    modifiers: ['alt'],
    action: 'go_home',
    description: 'Ana sayfaya git',
    category: 'navigation'
  },
  {
    key: 's',
    modifiers: ['alt'],
    action: 'open_search',
    description: 'Arama panelini aç',
    category: 'content'
  },
  {
    key: 'm',
    modifiers: ['alt'],
    action: 'toggle_minimap',
    description: 'Mini haritayı aç/kapat',
    category: 'navigation'
  },
  {
    key: 'p',
    modifiers: ['alt'],
    action: 'toggle_play_pause',
    description: 'Oynat/durdur',
    category: 'media'
  },
  {
    key: 'f',
    modifiers: ['alt'],
    action: 'focus_selected',
    description: 'Seçili objeye odakla',
    category: 'navigation'
  },
  {
    key: 'i',
    modifiers: ['alt'],
    action: 'toggle_info_panel',
    description: 'Bilgi panelini aç/kapat',
    category: 'content'
  },
  {
    key: 'ArrowUp',
    modifiers: ['alt'],
    action: 'zoom_in',
    description: 'Yakınlaştır',
    category: 'navigation'
  },
  {
    key: 'ArrowDown',
    modifiers: ['alt'],
    action: 'zoom_out',
    description: 'Uzaklaştır',
    category: 'navigation'
  },
  {
    key: 'Escape',
    modifiers: [],
    action: 'close_modal',
    description: 'Modal/panel kapat',
    category: 'navigation'
  },
  {
    key: '?',
    modifiers: ['shift'],
    action: 'show_help',
    description: 'Yardım menüsünü göster',
    category: 'accessibility'
  }
];

// Accessibility reducer
function accessibilityReducer(state: AccessibilityState, action: AccessibilityAction): AccessibilityState {
  switch (action.type) {
    case 'SET_PREFERENCE':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          [action.payload.key]: action.payload.value
        }
      };
    
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      };
    
    case 'SET_FOCUS':
      const newHistory = action.payload 
        ? [...state.focusState.focusHistory, action.payload].slice(-10)
        : state.focusState.focusHistory;
      
      return {
        ...state,
        focusState: {
          ...state.focusState,
          currentFocus: action.payload,
          focusHistory: newHistory
        }
      };
    
    case 'TRAP_FOCUS':
      return {
        ...state,
        focusState: {
          ...state.focusState,
          focusTrappedIn: action.payload
        }
      };
    
    case 'ADD_ANNOUNCEMENT':
      const announcement = {
        id: `announcement-${Date.now()}`,
        message: action.payload.message,
        priority: action.payload.priority,
        timestamp: Date.now()
      };
      
      return {
        ...state,
        announcements: [...state.announcements, announcement].slice(-5) // Keep last 5
      };
    
    case 'CLEAR_ANNOUNCEMENTS':
      return {
        ...state,
        announcements: []
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    default:
      return state;
  }
}

// Accessibility context interface
interface AccessibilityContextType {
  // State
  preferences: AccessibilityPreferences;
  shortcuts: KeyboardShortcut[];
  focusState: FocusState;
  announcements: AccessibilityState['announcements'];
  isLoading: boolean;
  error: string | null;
  
  // Preference actions
  setPreference: (key: keyof AccessibilityPreferences, value: boolean) => void;
  setPreferences: (prefs: Partial<AccessibilityPreferences>) => void;
  resetPreferences: () => void;
  
  // Focus management
  setFocus: (elementId: string | null) => void;
  trapFocus: (containerId: string | null) => void;
  getNextFocusableElement: (currentId: string, direction: 'forward' | 'backward') => string | null;
  
  // Announcements
  announce: (message: string, priority?: 'low' | 'medium' | 'high') => void;
  clearAnnouncements: () => void;
  
  // Keyboard shortcuts
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string, modifiers: string[]) => void;
  
  // Utility functions
  isHighContrast: () => boolean;
  isReducedMotion: () => boolean;
  shouldShowFocusIndicators: () => boolean;
  getAriaLabel: (baseLabel: string, context?: string) => string;
  getAriaDescription: (description: string, verbose?: boolean) => string;
  
  // Audio descriptions
  playAudioDescription: (text: string) => void;
  stopAudioDescription: () => void;
}

// Create context
const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

// Accessibility provider props
interface AccessibilityProviderProps {
  children: React.ReactNode;
}

// Accessibility provider component
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(accessibilityReducer, {
    preferences: DEFAULT_PREFERENCES,
    shortcuts: DEFAULT_SHORTCUTS,
    focusState: {
      currentFocus: null,
      focusHistory: [],
      focusTrappedIn: null,
      skipLinks: [
        { id: 'skip-to-main', label: 'Ana içeriğe geç', target: 'main-content' },
        { id: 'skip-to-navigation', label: 'Navigasyona geç', target: 'main-navigation' },
        { id: 'skip-to-search', label: 'Aramaya geç', target: 'search-input' }
      ]
    },
    announcements: [],
    isLoading: false,
    error: null
  });

  const audioRef = useRef<SpeechSynthesis | null>(null);
  const shortcutHandlersRef = useRef<Map<string, () => void>>(new Map());

  // Initialize accessibility features
  useEffect(() => {
    // Load saved preferences
    const savedPrefs = localStorage.getItem('cliff-accessibility-preferences');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        dispatch({ type: 'SET_PREFERENCES', payload: parsed });
      } catch (error) {
        console.warn('Failed to load accessibility preferences:', error);
      }
    }

    // Detect system preferences
    detectSystemPreferences();

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      audioRef.current = window.speechSynthesis;
    }

    // Set up mutation observer for dynamic content announcements
    const observer = new MutationObserver(handleDynamicContentChanges);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-live', 'aria-label']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Detect system accessibility preferences
  const detectSystemPreferences = useCallback(() => {
    const systemPrefs: Partial<AccessibilityPreferences> = {};

    // Reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      systemPrefs.reducedMotion = true;
      systemPrefs.pauseAnimations = true;
    }

    // High contrast
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      systemPrefs.highContrast = true;
    }

    // Color scheme preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      systemPrefs.highContrast = true;
    }

    if (Object.keys(systemPrefs).length > 0) {
      dispatch({ type: 'SET_PREFERENCES', payload: systemPrefs });
    }
  }, []);

  // Handle dynamic content changes
  const handleDynamicContentChanges = useCallback((mutations: MutationRecord[]) => {
    if (!state.preferences.announceChanges) return;

    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const ariaLive = element.getAttribute('aria-live');
            
            if (ariaLive === 'polite' || ariaLive === 'assertive') {
              const text = element.textContent?.trim();
              if (text) {
                announce(text, ariaLive === 'assertive' ? 'high' : 'medium');
              }
            }
          }
        });
      }
    });
  }, [state.preferences.announceChanges]);

  // Set up keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!state.preferences.keyboardNavigation) return;

      const modifiers = [];
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.altKey) modifiers.push('alt');
      if (event.shiftKey) modifiers.push('shift');
      if (event.metaKey) modifiers.push('meta');

      const shortcutKey = `${modifiers.sort().join('+')}+${event.key}`;
      const handler = shortcutHandlersRef.current.get(shortcutKey);

      if (handler) {
        event.preventDefault();
        handler();
      }

      // Handle tab navigation for focus trapping
      if (event.key === 'Tab' && state.focusState.focusTrappedIn) {
        handleTabInFocusTrap(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.preferences.keyboardNavigation, state.focusState.focusTrappedIn]);

  // Handle tab navigation in focus trap
  const handleTabInFocusTrap = useCallback((event: KeyboardEvent) => {
    const trapContainer = document.querySelector(`[data-focus-trap="${state.focusState.focusTrappedIn}"]`);
    if (!trapContainer) return;

    const focusableElements = trapContainer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }, [state.focusState.focusTrappedIn]);

  // Apply CSS preferences
  useEffect(() => {
    const root = document.documentElement;

    // High contrast
    if (state.preferences.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    // Large text
    if (state.preferences.largeText) {
      root.setAttribute('data-large-text', 'true');
    } else {
      root.removeAttribute('data-large-text');
    }

    // Reduced motion
    if (state.preferences.reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }

    // Focus indicators
    if (state.preferences.focusIndicators) {
      root.setAttribute('data-focus-visible', 'true');
    } else {
      root.removeAttribute('data-focus-visible');
    }
  }, [state.preferences]);

  // Set preference
  const setPreference = useCallback((key: keyof AccessibilityPreferences, value: boolean) => {
    dispatch({ type: 'SET_PREFERENCE', payload: { key, value } });
    
    // Save to localStorage
    const newPreferences = { ...state.preferences, [key]: value };
    localStorage.setItem('cliff-accessibility-preferences', JSON.stringify(newPreferences));
  }, [state.preferences]);

  // Set multiple preferences
  const setPreferences = useCallback((prefs: Partial<AccessibilityPreferences>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: prefs });
    
    // Save to localStorage
    const newPreferences = { ...state.preferences, ...prefs };
    localStorage.setItem('cliff-accessibility-preferences', JSON.stringify(newPreferences));
  }, [state.preferences]);

  // Reset preferences
  const resetPreferences = useCallback(() => {
    dispatch({ type: 'SET_PREFERENCES', payload: DEFAULT_PREFERENCES });
    localStorage.removeItem('cliff-accessibility-preferences');
  }, []);

  // Focus management
  const setFocus = useCallback((elementId: string | null) => {
    dispatch({ type: 'SET_FOCUS', payload: elementId });
    
    if (elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        element.focus();
        
        // Announce focus change if screen reader support is enabled
        if (state.preferences.screenReader) {
          const label = element.getAttribute('aria-label') || 
                        element.getAttribute('title') || 
                        element.textContent?.trim() || 
                        elementId;
          announce(`Focused on ${label}`, 'low');
        }
      }
    }
  }, [state.preferences.screenReader]);

  // Focus trap management
  const trapFocus = useCallback((containerId: string | null) => {
    dispatch({ type: 'TRAP_FOCUS', payload: containerId });
  }, []);

  // Get next focusable element
  const getNextFocusableElement = useCallback((currentId: string, direction: 'forward' | 'backward'): string | null => {
    const focusableElements = Array.from(document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    )) as HTMLElement[];

    const currentIndex = focusableElements.findIndex(el => el.id === currentId);
    if (currentIndex === -1) return null;

    const nextIndex = direction === 'forward' 
      ? (currentIndex + 1) % focusableElements.length
      : (currentIndex - 1 + focusableElements.length) % focusableElements.length;

    return focusableElements[nextIndex]?.id || null;
  }, []);

  // Announcements
  const announce = useCallback((message: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    dispatch({ type: 'ADD_ANNOUNCEMENT', payload: { message, priority } });

    // Create live region announcement
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', priority === 'high' ? 'assertive' : 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = message;
    document.body.appendChild(liveRegion);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 1000);

    // Play audio description if enabled
    if (state.preferences.audioDescriptions) {
      playAudioDescription(message);
    }
  }, [state.preferences.audioDescriptions]);

  // Clear announcements
  const clearAnnouncements = useCallback(() => {
    dispatch({ type: 'CLEAR_ANNOUNCEMENTS' });
  }, []);

  // Register keyboard shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    const key = `${shortcut.modifiers.sort().join('+')}+${shortcut.key}`;
    // This would be implemented with proper action handlers
    console.log('Registering shortcut:', key, shortcut.action);
  }, []);

  // Unregister keyboard shortcut
  const unregisterShortcut = useCallback((key: string, modifiers: string[]) => {
    const shortcutKey = `${modifiers.sort().join('+')}+${key}`;
    shortcutHandlersRef.current.delete(shortcutKey);
  }, []);

  // Utility functions
  const isHighContrast = useCallback(() => state.preferences.highContrast, [state.preferences.highContrast]);
  const isReducedMotion = useCallback(() => state.preferences.reducedMotion, [state.preferences.reducedMotion]);
  const shouldShowFocusIndicators = useCallback(() => state.preferences.focusIndicators, [state.preferences.focusIndicators]);

  // Generate accessible labels
  const getAriaLabel = useCallback((baseLabel: string, context?: string): string => {
    if (context && state.preferences.verboseDescriptions) {
      return `${baseLabel} - ${context}`;
    }
    return baseLabel;
  }, [state.preferences.verboseDescriptions]);

  // Generate accessible descriptions
  const getAriaDescription = useCallback((description: string, verbose = false): string => {
    if (verbose || state.preferences.verboseDescriptions) {
      return description;
    }
    // Shorten for non-verbose mode
    return description.length > 100 ? `${description.substring(0, 97)}...` : description;
  }, [state.preferences.verboseDescriptions]);

  // Audio descriptions
  const playAudioDescription = useCallback((text: string) => {
    if (!audioRef.current || !state.preferences.audioDescriptions) return;

    // Cancel any ongoing speech
    audioRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    // Use appropriate language
    const lang = document.documentElement.lang || 'tr-TR';
    utterance.lang = lang;

    audioRef.current.speak(utterance);
  }, [state.preferences.audioDescriptions]);

  const stopAudioDescription = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.cancel();
    }
  }, []);

  const contextValue: AccessibilityContextType = {
    // State
    preferences: state.preferences,
    shortcuts: state.shortcuts,
    focusState: state.focusState,
    announcements: state.announcements,
    isLoading: state.isLoading,
    error: state.error,
    
    // Preference actions
    setPreference,
    setPreferences,
    resetPreferences,
    
    // Focus management
    setFocus,
    trapFocus,
    getNextFocusableElement,
    
    // Announcements
    announce,
    clearAnnouncements,
    
    // Keyboard shortcuts
    registerShortcut,
    unregisterShortcut,
    
    // Utility functions
    isHighContrast,
    isReducedMotion,
    shouldShowFocusIndicators,
    getAriaLabel,
    getAriaDescription,
    
    // Audio descriptions
    playAudioDescription,
    stopAudioDescription
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip links */}
      <div className="sr-only">
        {state.focusState.skipLinks.map(link => (
          <a
            key={link.id}
            href={`#${link.target}`}
            className="skip-link"
            onFocus={() => setFocus(link.id)}
          >
            {link.label}
          </a>
        ))}
      </div>
      
      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {state.announcements
          .filter(a => a.priority !== 'high')
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {state.announcements
          .filter(a => a.priority === 'high')
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      
      {children}
    </AccessibilityContext.Provider>
  );
};

// Accessibility hook
export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Specific accessibility hooks
export const useAccessibilityPreferences = () => {
  const { preferences, setPreference, setPreferences } = useAccessibility();
  return { preferences, setPreference, setPreferences };
};

export const useFocusManagement = () => {
  const { focusState, setFocus, trapFocus, getNextFocusableElement } = useAccessibility();
  return { focusState, setFocus, trapFocus, getNextFocusableElement };
};

export const useAnnouncements = () => {
  const { announce, clearAnnouncements, announcements } = useAccessibility();
  return { announce, clearAnnouncements, announcements };
};

export const useKeyboardShortcuts = () => {
  const { shortcuts, registerShortcut, unregisterShortcut } = useAccessibility();
  return { shortcuts, registerShortcut, unregisterShortcut };
};

export default AccessibilityProvider;