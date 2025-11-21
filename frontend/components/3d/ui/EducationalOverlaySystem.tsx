"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { InteractiveTooltip } from './InteractiveTooltip';
import { PlanetInformationPanel } from './PlanetInformationPanel';
import { OrbitalMechanicsOverlay } from './OrbitalMechanicsOverlay';
import { SolarSystemMiniMap } from './SolarSystemMiniMap';
import SearchAndFilterPanel from './SearchAndFilterPanel';
import { 
  TooltipConfig, 
  TooltipContent, 
  InformationPanel,
  SearchableContent,
  SearchFilter,
  LocalizedContent
} from '../../../types/educational-content';
import { SOLAR_SYSTEM_DATA } from '../../../types/astronomical-data';
import { educationalContentManager } from '../../../services/EducationalContentManager';
import { useLanguage } from '../../../providers/LanguageProvider';
import { useAccessibility } from '../../../providers/AccessibilityProvider';
import { useSolarSystemStore } from '../../../stores/solarSystemStore';
import { Button } from '../../ui/button';
import { 
  Info, 
  Search, 
  Map, 
  Target, 
  Settings, 
  HelpCircle,
  BookOpen,
  Compass,
  X
} from 'lucide-react';
interface EducationalOverlaySystemProps {
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  canvas?: HTMLCanvasElement;
  enableTooltips?: boolean;
  enableInformationPanels?: boolean;
  enableOrbitalOverlay?: boolean;
  enableMiniMap?: boolean;
  enableSearch?: boolean;
  onCameraMove?: (position: THREE.Vector3, target: THREE.Vector3) => void;
  onBodySelect?: (bodyId: string) => void;
  onEducationalAction?: (action: string, params?: Record<string, any>) => void;
  className?: string;
}
interface SystemState {
  showTooltip: boolean;
  showInformationPanel: boolean;
  showOrbitalOverlay: boolean;
  showMiniMap: boolean;
  showSearchPanel: boolean;
  selectedCelestialBody: string | null;
  hoveredElement: {
    type: 'celestial_body' | 'ui_element' | null;
    id: string | null;
    position?: { x: number; y: number; z: number };
  };
  currentTooltipContent: TooltipContent | null;
  searchResults: SearchableContent[];
  activeFilters: SearchFilter;
  currentEducationalLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  showEducationalHints: boolean;
  tourMode: boolean;
}
const DEFAULT_STATE: SystemState = {
  showTooltip: false,
  showInformationPanel: false,
  showOrbitalOverlay: false,
  showMiniMap: true,
  showSearchPanel: false,
  selectedCelestialBody: null,
  hoveredElement: { type: null, id: null },
  currentTooltipContent: null,
  searchResults: [],
  activeFilters: {
    categories: [],
    tags: [],
    educationalLevels: [],
    contentTypes: [],
    hasMedia: false,
    isInteractive: false
  },
  currentEducationalLevel: 'intermediate',
  showEducationalHints: true,
  tourMode: false
};
export const EducationalOverlaySystem: React.FC<EducationalOverlaySystemProps> = ({
  scene,
  camera,
  canvas,
  enableTooltips = true,
  enableInformationPanels = true,
  enableOrbitalOverlay = true,
  enableMiniMap = true,
  enableSearch = true,
  onCameraMove,
  onBodySelect,
  onEducationalAction,
  className = ''
}) => {
  const [systemState, setSystemState] = useState<SystemState>(DEFAULT_STATE);
  const { t, tLocalized } = useLanguage();
  const { announce, setFocus, preferences } = useAccessibility();
  const selectedBody = useSolarSystemStore(state => state.ui.selectedObject);
  const timeState = useSolarSystemStore(state => state.timeState);
  const tooltipConfig: TooltipConfig = useMemo(() => ({
    id: 'educational-tooltip',
    trigger: 'hover',
    position: 'auto',
    delay: 500,
    duration: 0, 
    maxWidth: 400,
    responsive: true,
    hideOnScroll: false,
    hideOnClickOutside: true,
    ariaLabel: { tr: 'Eğitici bilgi tooltip\'i', en: 'Educational information tooltip' },
    focusable: true,
    animation: {
      enter: 'fade-scale',
      exit: 'fade-scale',
      duration: 250
    }
  }), []);
  const informationPanelConfig: InformationPanel = useMemo(() => {
    if (!systemState.selectedCelestialBody) return null as any;
    return {
      id: `${systemState.selectedCelestialBody}-info-panel`,
      celestialBodyId: systemState.selectedCelestialBody,
      layout: 'floating',
      size: 'large',
      resizable: true,
      draggable: true,
      collapsible: true,
      tabs: [
        {
          id: 'overview',
          title: { tr: 'Genel Bakış', en: 'Overview' },
          icon: 'globe',
          content: { type: 'overview' },
          order: 1
        },
        {
          id: 'physics',
          title: { tr: 'Fizik', en: 'Physics' },
          icon: 'zap',
          content: { type: 'physics' },
          order: 2
        },
        {
          id: 'exploration',
          title: { tr: 'Keşif', en: 'Exploration' },
          icon: 'rocket',
          content: { type: 'exploration' },
          order: 3
        }
      ],
      defaultTab: 'overview',
      rememberState: true,
      syncWithTimeController: true
    };
  }, [systemState.selectedCelestialBody]);
  const orbitalOverlayConfig = useMemo(() => ({
    showOrbitalPath: true,
    showVelocityVectors: systemState.currentEducationalLevel !== 'basic',
    showOrbitalPoints: true,
    showOrbitalPlane: systemState.currentEducationalLevel === 'advanced' || systemState.currentEducationalLevel === 'expert',
    showEccentricity: true,
    animateOrbit: true,
    highlightCurrentPosition: true,
    showEducationalInfo: systemState.showEducationalHints,
    educationalLevel: systemState.currentEducationalLevel
  }), [systemState.currentEducationalLevel, systemState.showEducationalHints]);
  const miniMapConfig = useMemo(() => ({
    size: 'medium' as const,
    showOrbits: true,
    showLabels: systemState.currentEducationalLevel !== 'expert',
    showScaleBar: true,
    showCurrentTime: true,
    showVelocityIndicators: systemState.currentEducationalLevel !== 'basic',
    autoCenter: false,
    followTarget: systemState.selectedCelestialBody !== null
  }), [systemState.currentEducationalLevel, systemState.selectedCelestialBody]);
  const handleBodySelection = useCallback((bodyId: string) => {
    setSystemState(prev => ({
      ...prev,
      selectedCelestialBody: bodyId,
      showInformationPanel: true,
      showOrbitalOverlay: bodyId !== 'sun' 
    }));
    onBodySelect?.(bodyId);
    if (preferences.announceChanges) {
      const bodyName = SOLAR_SYSTEM_DATA[bodyId]?.name || bodyId;
      announce(t('action.focus_camera') + ': ' + bodyName, 'medium');
    }
  }, [onBodySelect, announce, preferences.announceChanges, t]);
  const handleElementHover = useCallback((elementId: string | null, elementType: 'celestial_body' | 'ui_element' | null, position?: { x: number; y: number; z: number }) => {
    if (!enableTooltips) return;
    setSystemState(prev => ({
      ...prev,
      hoveredElement: { type: elementType, id: elementId, position },
      showTooltip: elementId !== null
    }));
    if (elementId && elementType === 'celestial_body') {
      const bodyData = SOLAR_SYSTEM_DATA[elementId];
      if (bodyData) {
        const tooltipContent: TooltipContent = {
          title: { tr: bodyData.name, en: bodyData.name },
          description: {
            tr: `${bodyData.type} - ${bodyData.name} hakkında temel bilgiler`,
            en: `${bodyData.type} - Basic information about ${bodyData.name}`
          },
          stats: [
            {
              label: { tr: 'Yarıçap', en: 'Radius' },
              value: bodyData.physical.radius,
              unit: 'km',
              format: 'number'
            },
            {
              label: { tr: 'Kütle', en: 'Mass' },
              value: bodyData.physical.mass / 1e24,
              unit: '× 10²⁴ kg',
              format: 'number'
            },
            {
              label: { tr: 'Orbital Periyod', en: 'Orbital Period' },
              value: bodyData.orbital.orbitalPeriod,
              unit: 'gün',
              format: 'time'
            }
          ],
          actions: [
            {
              label: { tr: 'Bilgi Paneli', en: 'Information Panel' },
              action: 'open_info',
              params: { bodyId: elementId }
            },
            {
              label: { tr: 'Odakla', en: 'Focus' },
              action: 'focus_camera',
              params: { bodyId: elementId }
            }
          ]
        };
        setSystemState(prev => ({
          ...prev,
          currentTooltipContent: tooltipContent
        }));
      }
    }
  }, [enableTooltips]);
  const handleEducationalAction = useCallback((action: string, params?: Record<string, any>) => {
    switch (action) {
      case 'open_info_panel':
        if (params?.bodyId) {
          handleBodySelection(params.bodyId);
        }
        break;
      case 'focus_camera':
        if (params?.bodyId) {
          handleBodySelection(params.bodyId);
          onEducationalAction?.(action, params);
        }
        break;
      case 'show_orbital_overlay':
        setSystemState(prev => ({ ...prev, showOrbitalOverlay: true }));
        break;
      case 'toggle_educational_level':
        const levels: typeof systemState.currentEducationalLevel[] = ['basic', 'intermediate', 'advanced', 'expert'];
        const currentIndex = levels.indexOf(systemState.currentEducationalLevel);
        const nextLevel = levels[(currentIndex + 1) % levels.length];
        setSystemState(prev => ({ ...prev, currentEducationalLevel: nextLevel }));
        announce(`${t('education.level')}: ${t(`education.${nextLevel}` as any)}`, 'medium');
        break;
      case 'toggle_search_panel':
        setSystemState(prev => ({ 
          ...prev, 
          showSearchPanel: !prev.showSearchPanel 
        }));
        if (!systemState.showSearchPanel) {
          setTimeout(() => setFocus('search-input'), 100);
        }
        break;
      default:
        onEducationalAction?.(action, params);
    }
  }, [handleBodySelection, onEducationalAction, systemState.currentEducationalLevel, systemState.showSearchPanel, announce, t, setFocus]);
  const handleSearchResultSelect = useCallback((result: SearchableContent) => {
    if (result.type === 'celestial_body') {
      handleBodySelection(result.id);
    }
    setSystemState(prev => ({ 
      ...prev, 
      showSearchPanel: false 
    }));
  }, [handleBodySelection]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!preferences.keyboardNavigation) return;
      if (event.altKey && event.key === 's') {
        event.preventDefault();
        handleEducationalAction('toggle_search_panel');
      }
      if (event.altKey && event.key === 'i') {
        event.preventDefault();
        if (systemState.selectedCelestialBody) {
          setSystemState(prev => ({ 
            ...prev, 
            showInformationPanel: !prev.showInformationPanel 
          }));
        }
      }
      if (event.altKey && event.key === 'm') {
        event.preventDefault();
        setSystemState(prev => ({ 
          ...prev, 
          showMiniMap: !prev.showMiniMap 
        }));
      }
      if (event.altKey && event.key === 'o') {
        event.preventDefault();
        if (systemState.selectedCelestialBody && systemState.selectedCelestialBody !== 'sun') {
          setSystemState(prev => ({ 
            ...prev, 
            showOrbitalOverlay: !prev.showOrbitalOverlay 
          }));
        }
      }
      if (event.altKey && event.key === 'l') {
        event.preventDefault();
        handleEducationalAction('toggle_educational_level');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [preferences.keyboardNavigation, systemState, handleEducationalAction]);
  useEffect(() => {
    if (selectedBody && selectedBody !== systemState.selectedCelestialBody) {
      handleBodySelection(selectedBody);
    }
  }, [selectedBody, systemState.selectedCelestialBody, handleBodySelection]);
  return (
    <div className={`educational-overlay-system relative w-full h-full ${className}`}>
      {}
      <AnimatePresence>
        {enableTooltips && systemState.showTooltip && systemState.currentTooltipContent && (
          <InteractiveTooltip
            isVisible={systemState.showTooltip}
            config={tooltipConfig}
            content={systemState.currentTooltipContent}
            targetPosition={systemState.hoveredElement.position}
            onClose={() => setSystemState(prev => ({ ...prev, showTooltip: false }))}
            onAction={handleEducationalAction}
            camera={camera}
            canvas={canvas}
          />
        )}
      </AnimatePresence>
      {}
      <AnimatePresence>
        {enableInformationPanels && systemState.showInformationPanel && systemState.selectedCelestialBody && informationPanelConfig && (
          <PlanetInformationPanel
            isVisible={systemState.showInformationPanel}
            celestialBodyId={systemState.selectedCelestialBody}
            panelConfig={informationPanelConfig}
            onClose={() => setSystemState(prev => ({ 
              ...prev, 
              showInformationPanel: false,
              selectedCelestialBody: null 
            }))}
            onAction={handleEducationalAction}
          />
        )}
      </AnimatePresence>
      {}
      <AnimatePresence>
        {enableOrbitalOverlay && systemState.showOrbitalOverlay && systemState.selectedCelestialBody && systemState.selectedCelestialBody !== 'sun' && (
          <OrbitalMechanicsOverlay
            celestialBodyId={systemState.selectedCelestialBody}
            config={orbitalOverlayConfig}
            onConfigChange={(newConfig) => {
            }}
            scene={scene}
            camera={camera}
            canvas={canvas}
            isVisible={systemState.showOrbitalOverlay}
            onEducationalAction={handleEducationalAction}
            position="bottom-left"
          />
        )}
      </AnimatePresence>
      {}
      <AnimatePresence>
        {enableMiniMap && systemState.showMiniMap && (
          <SolarSystemMiniMap
            isVisible={systemState.showMiniMap}
            position="top-right"
            config={miniMapConfig}
            onConfigChange={(newConfig) => {
            }}
            mainCamera={camera}
            onBodySelect={handleBodySelection}
            onBodyFocus={(bodyId) => {
              handleBodySelection(bodyId);
              handleEducationalAction('focus_camera', { bodyId });
            }}
          />
        )}
      </AnimatePresence>
      {}
      <AnimatePresence>
        {enableSearch && systemState.showSearchPanel && (
          <SearchAndFilterPanel
            isVisible={systemState.showSearchPanel}
            position="left"
            size="normal"
            onClose={() => setSystemState(prev => ({ ...prev, showSearchPanel: false }))}
            onResultSelect={handleSearchResultSelect}
            onFilterChange={(filters) => setSystemState(prev => ({ ...prev, activeFilters: filters }))}
          />
        )}
      </AnimatePresence>
      {}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-2 bg-black/90 backdrop-blur-sm border border-gray-700 rounded-full px-4 py-2">
          {enableSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEducationalAction('toggle_search_panel')}
              className="p-2 hover:bg-gray-700"
              title={t('common.search')}
            >
              <Search className="w-4 h-4 text-cyan-400" />
            </Button>
          )}
          {enableMiniMap && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSystemState(prev => ({ ...prev, showMiniMap: !prev.showMiniMap }))}
              className="p-2 hover:bg-gray-700"
              title={t('ui.minimap.title')}
            >
              <Map className="w-4 h-4 text-green-400" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEducationalAction('toggle_educational_level')}
            className="p-2 hover:bg-gray-700"
            title={`${t('education.level')}: ${t(`education.${systemState.currentEducationalLevel}` as any)}`}
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
          </Button>
          <div className="w-px h-4 bg-gray-600 mx-1" />
          <span className="text-xs text-gray-400">
            {t(`education.${systemState.currentEducationalLevel}` as any)}
          </span>
        </div>
      </motion.div>
      {}
      <AnimatePresence>
        {systemState.showEducationalHints && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-4 max-w-sm"
          >
            <div className="bg-blue-900/80 backdrop-blur-sm border border-blue-700 rounded-lg p-3 text-white text-sm">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">{t('education.tips')}:</p>
                  <p className="text-blue-200 text-xs">
                    {systemState.selectedCelestialBody 
                      ? `${SOLAR_SYSTEM_DATA[systemState.selectedCelestialBody]?.name || systemState.selectedCelestialBody} üzerinde geziniyorsunuz. Alt+I ile detay panelini açabilirsiniz.`
                      : 'Bir gök cisminin üzerine gelip bilgilerini görün. Alt+S ile arama yapabilirsiniz.'
                    }
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSystemState(prev => ({ ...prev, showEducationalHints: false }))}
                  className="p-1 ml-auto"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default EducationalOverlaySystem;
