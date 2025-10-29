"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { LocalizedContent } from '../types/educational-content';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  tr: {
    code: 'tr',
    name: 'Türkçe',
    nativeName: 'Türkçe',
    flag: '🇹🇷',
    rtl: false
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false
  }
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Translation keys interface
export interface TranslationKeys {
  // Common UI
  'common.loading': string;
  'common.error': string;
  'common.close': string;
  'common.open': string;
  'common.save': string;
  'common.cancel': string;
  'common.back': string;
  'common.next': string;
  'common.previous': string;
  'common.search': string;
  'common.filter': string;
  'common.clear': string;
  'common.settings': string;
  
  // Solar System
  'solarsystem.sun': string;
  'solarsystem.mercury': string;
  'solarsystem.venus': string;
  'solarsystem.earth': string;
  'solarsystem.mars': string;
  'solarsystem.jupiter': string;
  'solarsystem.saturn': string;
  'solarsystem.uranus': string;
  'solarsystem.neptune': string;
  'solarsystem.pluto': string;
  'solarsystem.moon': string;
  
  // Educational Content
  'education.overview': string;
  'education.physics': string;
  'education.exploration': string;
  'education.discovery': string;
  'education.mission': string;
  'education.fun_facts': string;
  'education.basic': string;
  'education.intermediate': string;
  'education.advanced': string;
  'education.expert': string;
  'education.level': string;
  'education.tips': string;
  
  // Orbital Mechanics
  'orbital.periapsis': string;
  'orbital.apoapsis': string;
  'orbital.eccentricity': string;
  'orbital.inclination': string;
  'orbital.orbital_period': string;
  'orbital.semi_major_axis': string;
  'orbital.velocity': string;
  'orbital.distance': string;
  
  // Units
  'units.km': string;
  'units.au': string;
  'units.kg': string;
  'units.years': string;
  'units.days': string;
  'units.hours': string;
  'units.celsius': string;
  'units.kelvin': string;
  'units.ms2': string;
  'units.kms': string;
  
  // UI Components
  'ui.tooltip.close': string;
  'ui.panel.expand': string;
  'ui.panel.collapse': string;
  'ui.minimap.title': string;
  'ui.search.placeholder': string;
  'ui.search.no_results': string;
  'ui.search.recent_searches': string;
  'ui.filter.categories': string;
  'ui.filter.level': string;
  'ui.filter.content_type': string;
  'ui.orbital.mechanics': string;
  'ui.time.controls': string;
  
  // Actions
  'action.focus_camera': string;
  'action.show_orbit': string;
  'action.compare': string;
  'action.bookmark': string;
  'action.share': string;
  'action.download': string;
  'action.play': string;
  'action.pause': string;
  
  // Error Messages
  'error.loading_content': string;
  'error.network_error': string;
  'error.not_found': string;
  'error.invalid_data': string;
}

// Translation data
const translations: Record<SupportedLanguage, TranslationKeys> = {
  tr: {
    // Common UI
    'common.loading': 'Yükleniyor...',
    'common.error': 'Hata',
    'common.close': 'Kapat',
    'common.open': 'Aç',
    'common.save': 'Kaydet',
    'common.cancel': 'İptal',
    'common.back': 'Geri',
    'common.next': 'İleri',
    'common.previous': 'Önceki',
    'common.search': 'Ara',
    'common.filter': 'Filtrele',
    'common.clear': 'Temizle',
    'common.settings': 'Ayarlar',
    
    // Solar System
    'solarsystem.sun': 'Güneş',
    'solarsystem.mercury': 'Merkür',
    'solarsystem.venus': 'Venüs',
    'solarsystem.earth': 'Dünya',
    'solarsystem.mars': 'Mars',
    'solarsystem.jupiter': 'Jüpiter',
    'solarsystem.saturn': 'Satürn',
    'solarsystem.uranus': 'Uranüs',
    'solarsystem.neptune': 'Neptün',
    'solarsystem.pluto': 'Plüton',
    'solarsystem.moon': 'Ay',
    
    // Educational Content
    'education.overview': 'Genel Bakış',
    'education.physics': 'Fizik',
    'education.exploration': 'Keşif',
    'education.discovery': 'Keşif',
    'education.mission': 'Misyon',
    'education.fun_facts': 'İlginç Bilgiler',
    'education.basic': 'Temel',
    'education.intermediate': 'Orta',
    'education.advanced': 'İleri',
    'education.expert': 'Uzman',
    'education.level': 'Seviye',
    'education.tips': 'İpuçları',
    
    // Orbital Mechanics
    'orbital.periapsis': 'Günberi',
    'orbital.apoapsis': 'Günöte',
    'orbital.eccentricity': 'Eksantriklik',
    'orbital.inclination': 'Eğim',
    'orbital.orbital_period': 'Yörünge Periyodu',
    'orbital.semi_major_axis': 'Yarı Ana Eksen',
    'orbital.velocity': 'Hız',
    'orbital.distance': 'Mesafe',
    
    // Units
    'units.km': 'km',
    'units.au': 'AU',
    'units.kg': 'kg',
    'units.years': 'yıl',
    'units.days': 'gün',
    'units.hours': 'saat',
    'units.celsius': '°C',
    'units.kelvin': 'K',
    'units.ms2': 'm/s²',
    'units.kms': 'km/s',
    
    // UI Components
    'ui.tooltip.close': 'Kapat',
    'ui.panel.expand': 'Genişlet',
    'ui.panel.collapse': 'Daralt',
    'ui.minimap.title': 'Solar Sistem Haritası',
    'ui.search.placeholder': 'Gezegen, misyon veya konu ara...',
    'ui.search.no_results': 'Sonuç bulunamadı',
    'ui.search.recent_searches': 'Son Aramalar',
    'ui.filter.categories': 'Kategoriler',
    'ui.filter.level': 'Seviye',
    'ui.filter.content_type': 'İçerik Türü',
    'ui.orbital.mechanics': 'Orbital Mekanik',
    'ui.time.controls': 'Zaman Kontrolü',
    
    // Actions
    'action.focus_camera': 'Kameraya Odakla',
    'action.show_orbit': 'Yörüngeyi Göster',
    'action.compare': 'Karşılaştır',
    'action.bookmark': 'Yer İmi Ekle',
    'action.share': 'Paylaş',
    'action.download': 'İndir',
    'action.play': 'Oynat',
    'action.pause': 'Durdur',
    
    // Error Messages
    'error.loading_content': 'İçerik yüklenemedi',
    'error.network_error': 'Ağ bağlantısı hatası',
    'error.not_found': 'İçerik bulunamadı',
    'error.invalid_data': 'Geçersiz veri'
  },
  
  en: {
    // Common UI
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.close': 'Close',
    'common.open': 'Open',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.clear': 'Clear',
    'common.settings': 'Settings',
    
    // Solar System
    'solarsystem.sun': 'Sun',
    'solarsystem.mercury': 'Mercury',
    'solarsystem.venus': 'Venus',
    'solarsystem.earth': 'Earth',
    'solarsystem.mars': 'Mars',
    'solarsystem.jupiter': 'Jupiter',
    'solarsystem.saturn': 'Saturn',
    'solarsystem.uranus': 'Uranus',
    'solarsystem.neptune': 'Neptune',
    'solarsystem.pluto': 'Pluto',
    'solarsystem.moon': 'Moon',
    
    // Educational Content
    'education.overview': 'Overview',
    'education.physics': 'Physics',
    'education.exploration': 'Exploration',
    'education.discovery': 'Discovery',
    'education.mission': 'Mission',
    'education.fun_facts': 'Fun Facts',
    'education.basic': 'Basic',
    'education.intermediate': 'Intermediate',
    'education.advanced': 'Advanced',
    'education.expert': 'Expert',
    'education.level': 'Level',
    'education.tips': 'Tips',
    
    // Orbital Mechanics
    'orbital.periapsis': 'Periapsis',
    'orbital.apoapsis': 'Apoapsis',
    'orbital.eccentricity': 'Eccentricity',
    'orbital.inclination': 'Inclination',
    'orbital.orbital_period': 'Orbital Period',
    'orbital.semi_major_axis': 'Semi-Major Axis',
    'orbital.velocity': 'Velocity',
    'orbital.distance': 'Distance',
    
    // Units
    'units.km': 'km',
    'units.au': 'AU',
    'units.kg': 'kg',
    'units.years': 'years',
    'units.days': 'days',
    'units.hours': 'hours',
    'units.celsius': '°C',
    'units.kelvin': 'K',
    'units.ms2': 'm/s²',
    'units.kms': 'km/s',
    
    // UI Components
    'ui.tooltip.close': 'Close',
    'ui.panel.expand': 'Expand',
    'ui.panel.collapse': 'Collapse',
    'ui.minimap.title': 'Solar System Map',
    'ui.search.placeholder': 'Search planets, missions or topics...',
    'ui.search.no_results': 'No results found',
    'ui.search.recent_searches': 'Recent Searches',
    'ui.filter.categories': 'Categories',
    'ui.filter.level': 'Level',
    'ui.filter.content_type': 'Content Type',
    'ui.orbital.mechanics': 'Orbital Mechanics',
    'ui.time.controls': 'Time Controls',
    
    // Actions
    'action.focus_camera': 'Focus Camera',
    'action.show_orbit': 'Show Orbit',
    'action.compare': 'Compare',
    'action.bookmark': 'Bookmark',
    'action.share': 'Share',
    'action.download': 'Download',
    'action.play': 'Play',
    'action.pause': 'Pause',
    
    // Error Messages
    'error.loading_content': 'Failed to load content',
    'error.network_error': 'Network connection error',
    'error.not_found': 'Content not found',
    'error.invalid_data': 'Invalid data'
  }
};

// Language context state
interface LanguageState {
  currentLanguage: SupportedLanguage;
  isLoading: boolean;
  error: string | null;
  fallbackLanguage: SupportedLanguage;
}

// Language actions
type LanguageAction =
  | { type: 'SET_LANGUAGE'; payload: SupportedLanguage }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FALLBACK'; payload: SupportedLanguage };

// Language reducer
function languageReducer(state: LanguageState, action: LanguageAction): LanguageState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, currentLanguage: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_FALLBACK':
      return { ...state, fallbackLanguage: action.payload };
    default:
      return state;
  }
}

// Language context interface
interface LanguageContextType {
  // State
  currentLanguage: SupportedLanguage;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setLanguage: (language: SupportedLanguage) => void;
  
  // Translation functions
  t: (key: keyof TranslationKeys, fallback?: string) => string;
  tLocalized: (content: LocalizedContent) => string;
  
  // Format functions
  formatDate: (date: Date) => string;
  formatNumber: (num: number) => string;
  formatDistance: (distance: number, unit?: 'km' | 'au') => string;
  formatTime: (seconds: number) => string;
  
  // Utility functions
  getLanguageInfo: (langCode: SupportedLanguage) => typeof SUPPORTED_LANGUAGES[SupportedLanguage];
  isRTL: () => boolean;
}

// Create context
const LanguageContext = createContext<LanguageContextType | null>(null);

// Language provider props
interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
  fallbackLanguage?: SupportedLanguage;
}

// Language provider component
export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  defaultLanguage = 'tr',
  fallbackLanguage = 'en'
}) => {
  const [state, dispatch] = useReducer(languageReducer, {
    currentLanguage: defaultLanguage,
    isLoading: false,
    error: null,
    fallbackLanguage
  });

  // Load saved language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('cliff-language') as SupportedLanguage;
    if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
      dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage });
    } else {
      // Detect browser language
      const browserLanguage = navigator.language.split('-')[0] as SupportedLanguage;
      if (SUPPORTED_LANGUAGES[browserLanguage]) {
        dispatch({ type: 'SET_LANGUAGE', payload: browserLanguage });
      }
    }
  }, []);

  // Set language
  const setLanguage = useCallback((language: SupportedLanguage) => {
    if (!SUPPORTED_LANGUAGES[language]) {
      console.warn(`Unsupported language: ${language}`);
      return;
    }

    dispatch({ type: 'SET_LANGUAGE', payload: language });
    localStorage.setItem('cliff-language', language);
    
    // Update document language
    document.documentElement.lang = language;
    
    // Update document direction for RTL languages
    document.documentElement.dir = SUPPORTED_LANGUAGES[language].rtl ? 'rtl' : 'ltr';
  }, []);

  // Translation function
  const t = useCallback((key: keyof TranslationKeys, fallback?: string): string => {
    const translation = translations[state.currentLanguage]?.[key] ||
                       translations[state.fallbackLanguage]?.[key] ||
                       fallback ||
                       key;
    
    return translation;
  }, [state.currentLanguage, state.fallbackLanguage]);

  // Localized content translation
  const tLocalized = useCallback((content: LocalizedContent): string => {
    return content[state.currentLanguage] ||
           content[state.fallbackLanguage] ||
           content['en'] ||
           Object.values(content)[0] ||
           '';
  }, [state.currentLanguage, state.fallbackLanguage]);

  // Format date according to current language
  const formatDate = useCallback((date: Date): string => {
    const locale = state.currentLanguage === 'tr' ? 'tr-TR' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, [state.currentLanguage]);

  // Format numbers according to current language
  const formatNumber = useCallback((num: number): string => {
    const locale = state.currentLanguage === 'tr' ? 'tr-TR' : 'en-US';
    return new Intl.NumberFormat(locale).format(num);
  }, [state.currentLanguage]);

  // Format distance with appropriate units
  const formatDistance = useCallback((distance: number, unit: 'km' | 'au' = 'km'): string => {
    if (unit === 'au') {
      return `${distance.toFixed(3)} ${t('units.au')}`;
    }
    
    if (distance >= 1e9) {
      return `${(distance / 1e9).toFixed(2)} ${state.currentLanguage === 'tr' ? 'milyar' : 'billion'} ${t('units.km')}`;
    } else if (distance >= 1e6) {
      return `${(distance / 1e6).toFixed(2)} ${state.currentLanguage === 'tr' ? 'milyon' : 'million'} ${t('units.km')}`;
    } else if (distance >= 1e3) {
      return `${(distance / 1e3).toFixed(2)} ${state.currentLanguage === 'tr' ? 'bin' : 'thousand'} ${t('units.km')}`;
    } else {
      return `${formatNumber(Math.round(distance))} ${t('units.km')}`;
    }
  }, [t, formatNumber, state.currentLanguage]);

  // Format time duration
  const formatTime = useCallback((seconds: number): string => {
    if (seconds >= 31557600) { // Years
      const years = seconds / 31557600;
      return `${years.toFixed(1)} ${t('units.years')}`;
    } else if (seconds >= 86400) { // Days
      const days = seconds / 86400;
      return `${days.toFixed(1)} ${t('units.days')}`;
    } else if (seconds >= 3600) { // Hours
      const hours = seconds / 3600;
      return `${hours.toFixed(1)} ${t('units.hours')}`;
    } else {
      return `${Math.round(seconds)} s`;
    }
  }, [t]);

  // Get language info
  const getLanguageInfo = useCallback((langCode: SupportedLanguage) => {
    return SUPPORTED_LANGUAGES[langCode];
  }, []);

  // Check if current language is RTL
  const isRTL = useCallback((): boolean => {
    return SUPPORTED_LANGUAGES[state.currentLanguage].rtl;
  }, [state.currentLanguage]);

  const contextValue: LanguageContextType = {
    // State
    currentLanguage: state.currentLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    setLanguage,
    
    // Translation functions
    t,
    tLocalized,
    
    // Format functions
    formatDate,
    formatNumber,
    formatDistance,
    formatTime,
    
    // Utility functions
    getLanguageInfo,
    isRTL
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Language hook
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translation hook (shorthand)
export const useTranslation = () => {
  const { t, tLocalized } = useLanguage();
  return { t, tLocalized };
};

// Localized content hook
export const useLocalizedContent = () => {
  const { tLocalized } = useLanguage();
  return tLocalized;
};

// Format hooks
export const useFormatters = () => {
  const { formatDate, formatNumber, formatDistance, formatTime } = useLanguage();
  return { formatDate, formatNumber, formatDistance, formatTime };
};

export default LanguageProvider;