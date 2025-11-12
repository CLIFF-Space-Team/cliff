"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  InformationPanel, 
  PanelTabContent, 
  EducationalContent, 
  LocalizedContent,
  MissionData,
  HistoricalEvent,
  CelestialComparison,
  EducationalLevel
} from '../../../types/educational-content';
import { CelestialBody, SOLAR_SYSTEM_DATA } from '../../../types/astronomical-data';
import { useSolarSystemStore } from '../../../stores/solarSystemStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  Globe,
  Zap,
  Rocket,
  Clock,
  Scale,
  BookOpen,
  Star,
  Camera,
  Play,
  Pause,
  RotateCw,
  Download,
  Share,
  Heart,
  Info,
  TrendingUp,
  Thermometer,
  Gauge
} from 'lucide-react';
interface PlanetInformationPanelProps {
  panelConfig: InformationPanel;
  celestialBodyId: string;
  isVisible?: boolean;
  educationalContent?: EducationalContent[];
  missions?: MissionData[];
  historicalEvents?: HistoricalEvent[];
  comparisons?: CelestialComparison[];
  onClose?: () => void;
  onTabChange?: (tabId: string) => void;
  onAction?: (action: string, params?: Record<string, any>) => void;
  className?: string;
  zIndex?: number;
}
interface TabComponentProps {
  celestialBody: CelestialBody;
  content: PanelTabContent;
  isActive: boolean;
  language: string;
  onAction: (action: string, params?: Record<string, any>) => void;
}
export const PlanetInformationPanel: React.FC<PlanetInformationPanelProps> = ({
  panelConfig,
  celestialBodyId,
  isVisible = true,
  educationalContent = [],
  missions = [],
  historicalEvents = [],
  comparisons = [],
  onClose,
  onTabChange,
  onAction,
  className = '',
  zIndex = 1000
}) => {
  const [activeTab, setActiveTab] = useState(panelConfig.defaultTab);
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [bookmarked, setBookmarked] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const { selectedObject, selectObject } = useSolarSystemStore(state => ({
    selectedObject: state.ui.selectedObject,
    selectObject: state.selectObject,
  }));
  const timeState = useSolarSystemStore(state => state.timeState);
  const currentLanguage = 'tr'; // FIXME: Should come from a user preferences store
  const celestialBody = useMemo(() => {
    if (!selectedObject) return null;
    return SOLAR_SYSTEM_DATA[selectedObject];
  }, [selectedObject]);
  const getLocalizedText = useCallback((text: LocalizedContent): string => {
    return text[currentLanguage] || text['en'] || Object.values(text)[0] || '';
  }, [currentLanguage]);
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  }, [onTabChange]);
  useEffect(() => {
    if (!panelConfig.draggable || !isDragging) return;
    const handleMouseMove = (event: MouseEvent) => {
      const newX = event.clientX - dragOffset.x;
      const newY = event.clientY - dragOffset.y;
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 600);
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, panelConfig.draggable]);
  const handleDragStart = (event: React.MouseEvent) => {
    if (!panelConfig.draggable) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
      setIsDragging(true);
    }
  };
  const getPanelSizeClasses = () => {
    const baseSize = isExpanded ? 'large' : panelConfig.size;
    switch (baseSize) {
      case 'small': return 'w-80 h-96';
      case 'medium': return 'w-96 h-[32rem]';
      case 'large': return 'w-[48rem] h-[36rem]';
      case 'fullscreen': return 'w-screen h-screen';
      default: return 'w-96 h-[32rem]';
    }
  };
  const formatValue = useCallback((value: number, type: string): string => {
    switch (type) {
      case 'mass':
        return `${(value / 1e24).toFixed(2)} × 10²⁴ kg`;
      case 'radius':
        return `${value.toLocaleString()} km`;
      case 'temperature':
        return `${value}K (${(value - 273.15).toFixed(0)}°C)`;
      case 'gravity':
        return `${value} m/s²`;
      case 'distance':
        return `${value.toFixed(3)} AU`;
      case 'period':
        return value > 365 ? `${(value / 365.25).toFixed(1)} yıl` : `${value.toFixed(1)} gün`;
      default:
        return value.toLocaleString();
    }
  }, []);
  const handleClose = () => {
    selectObject(null);
    if (onClose) onClose();
  };
  if (!isVisible || !selectedObject || !celestialBody) return null;
  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          position: panelConfig.layout === 'floating' ? 'fixed' : 'relative',
          left: panelConfig.layout === 'floating' ? position.x : 'auto',
          top: panelConfig.layout === 'floating' ? position.y : 'auto',
          zIndex
        }}
        className={`${getPanelSizeClasses()} ${className}`}
      >
        <Card className="h-full flex flex-col bg-black/95 backdrop-blur-sm border-gray-700 text-white overflow-hidden">
          {}
          <div 
            ref={dragRef}
            className={`flex items-center justify-between p-4 border-b border-gray-700 ${
              panelConfig.draggable ? 'cursor-move' : ''
            }`}
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-cyan-400" />
              <div>
                <h2 className="text-xl font-bold text-cyan-400">
                  {celestialBody.name}
                </h2>
                <p className="text-sm text-gray-400 capitalize">
                  {celestialBody.type.replace('_', ' ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBookmarked(!bookmarked)}
                className="p-2"
              >
                <Heart className={`w-4 h-4 ${bookmarked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              {}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction?.('share', { bodyId: celestialBodyId })}
                className="p-2"
              >
                <Share className="w-4 h-4" />
              </Button>
              {}
              {panelConfig.resizable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              )}
              {}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {}
          <div className="flex border-b border-gray-700 bg-gray-900/50">
            {panelConfig.tabs
              .sort((a, b) => a.order - b.order)
              .map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <i className={`w-4 h-4 ${tab.icon}`} />
                  {getLocalizedText(tab.title)}
                </button>
              ))}
          </div>
          {}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {panelConfig.tabs
                .filter(tab => tab.id === activeTab)
                .map(tab => (
                  <motion.div
                    key={tab.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <TabContent
                      celestialBody={celestialBody}
                      content={tab.content}
                      isActive={activeTab === tab.id}
                      language={currentLanguage}
                      onAction={onAction || (() => {})}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
const TabContent: React.FC<TabComponentProps> = ({
  celestialBody,
  content,
  isActive,
  language,
  onAction
}) => {
  const getLocalizedText = useCallback((text: LocalizedContent): string => {
    return text[language] || text['en'] || Object.values(text)[0] || '';
  }, [language]);
  const formatValue = useCallback((value: number, type: string): string => {
    switch (type) {
      case 'mass':
        return `${(value / 1e24).toFixed(2)} × 10²⁴ kg`;
      case 'radius':
        return `${value.toLocaleString()} km`;
      case 'temperature':
        return `${value}K (${(value - 273.15).toFixed(0)}°C)`;
      case 'gravity':
        return `${value} m/s²`;
      case 'distance':
        return `${value.toFixed(3)} AU`;
      case 'period':
        return value > 365 ? `${(value / 365.25).toFixed(1)} yıl` : `${value.toFixed(1)} gün`;
      default:
        return value.toLocaleString();
    }
  }, []);
  const renderOverviewContent = () => (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-gray-800/50 border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-blue-400">Fiziksel Özellikler</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Yarıçap:</span>
              <span>{formatValue(celestialBody.physical.radius, 'radius')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Kütle:</span>
              <span>{formatValue(celestialBody.physical.mass, 'mass')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Yoğunluk:</span>
              <span>{celestialBody.physical.density} g/cm³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Yerçekimi:</span>
              <span>{formatValue(celestialBody.physical.gravity, 'gravity')}</span>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gray-800/50 border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <RotateCw className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-green-400">Orbital Özellikler</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Yarı Ana Eksen:</span>
              <span>{formatValue(celestialBody.orbital.semiMajorAxis, 'distance')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Eksantriklik:</span>
              <span>{celestialBody.orbital.eccentricity.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Eğim:</span>
              <span>{celestialBody.orbital.inclination.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Orbital Periyod:</span>
              <span>{formatValue(celestialBody.orbital.orbitalPeriod, 'period')}</span>
            </div>
          </div>
        </Card>
      </div>
      {}
      {celestialBody.info.surface_temp_celsius && (
        <Card className="p-4 bg-gray-800/50 border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-orange-400">Sıcaklık</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-blue-300 font-medium">
                {celestialBody.info.surface_temp_celsius.min}°C
              </div>
              <div className="text-gray-400">Minimum</div>
            </div>
            <div className="text-center">
              <div className="text-green-300 font-medium">
                {celestialBody.info.surface_temp_celsius.average}°C
              </div>
              <div className="text-gray-400">Ortalama</div>
            </div>
            <div className="text-center">
              <div className="text-red-300 font-medium">
                {celestialBody.info.surface_temp_celsius.max}°C
              </div>
              <div className="text-gray-400">Maksimum</div>
            </div>
          </div>
        </Card>
      )}
      {}
      {celestialBody.atmosphere?.hasAtmosphere && (
        <Card className="p-4 bg-gray-800/50 border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-purple-400">Atmosfer</h3>
          </div>
          <div className="text-sm text-gray-400">
            Bu gezegen atmosfere sahiptir.
          </div>
        </Card>
      )}
      {}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction('focus_camera', { bodyId: celestialBody.id })}
          className="flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Odakla
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction('show_orbit', { bodyId: celestialBody.id })}
          className="flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Yörüngeyi Göster
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction('compare', { bodyId: celestialBody.id })}
          className="flex items-center gap-2"
        >
          <Scale className="w-4 h-4" />
          Karşılaştır
        </Button>
      </div>
    </div>
  );
  const renderPhysicsContent = () => (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <Card className="p-4 bg-gray-800/50 border-gray-600">
          <h3 className="font-semibold text-cyan-400 mb-3">Detaylı Fiziksel Özellikler</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Kaçış Hızı:</span>
                <span>{celestialBody.physical.escapeVelocity} km/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Dönüş Periyodu:</span>
                <span>{(celestialBody.physical.rotationPeriod / 24).toFixed(2)} gün</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Eksen Eğimi:</span>
                <span>{celestialBody.physical.axialTilt}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Albedo:</span>
                <span>{celestialBody.physical.albedo}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-center p-3 bg-gray-700/50 rounded">
                <div className="text-lg font-bold text-cyan-400">
                  {(celestialBody.physical.mass / 5.972e24).toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">Dünya Kütlesi</div>
              </div>
              <div className="text-center p-3 bg-gray-700/50 rounded">
                <div className="text-lg font-bold text-green-400">
                  {(celestialBody.physical.radius / 6371).toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">Dünya Yarıçapı</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
  switch (content.type) {
    case 'overview':
      return renderOverviewContent();
    case 'physics':
      return renderPhysicsContent();
    default:
      return (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>İçerik yükleniyor...</p>
          </div>
        </div>
      );
  }
};
export default PlanetInformationPanel;