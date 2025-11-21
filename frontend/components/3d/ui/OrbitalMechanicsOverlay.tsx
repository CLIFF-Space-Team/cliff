"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { 
  CelestialBody, 
  OrbitalElements, 
  SOLAR_SYSTEM_DATA,
  ASTRONOMICAL_CONSTANTS 
} from '../../../types/astronomical-data';
import { 
  LocalizedContent,
  EducationalLevel 
} from '../../../types/educational-content';
import { useSolarSystemStore } from '../../../stores/solarSystemStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  Target,
  Circle,
  TrendingUp,
  RotateCw,
  Zap,
  Info,
  Eye,
  EyeOff,
  Settings,
  Play,
  Pause,
  SkipForward,
  RefreshCw,
  Compass,
  Activity,
  Timer,
  X
} from 'lucide-react';
interface OrbitalPoint {
  id: string;
  name: LocalizedContent;
  position: THREE.Vector3;
  type: 'periapsis' | 'apoapsis' | 'ascending_node' | 'descending_node' | 'current';
  date: Date;
  velocity: number;
  distance: number;
  description: LocalizedContent;
}
interface OrbitalVisualizationConfig {
  showOrbitalPath: boolean;
  showVelocityVectors: boolean;
  showOrbitalPoints: boolean;
  showOrbitalPlane: boolean;
  showEccentricity: boolean;
  animateOrbit: boolean;
  highlightCurrentPosition: boolean;
  showEducationalInfo: boolean;
  educationalLevel: EducationalLevel;
}
interface OrbitalMechanicsOverlayProps {
  celestialBodyId: string;
  config: OrbitalVisualizationConfig;
  onConfigChange?: (config: Partial<OrbitalVisualizationConfig>) => void;
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  canvas?: HTMLCanvasElement;
  isVisible: boolean;
  onPointClick?: (point: OrbitalPoint) => void;
  onEducationalAction?: (action: string, params?: Record<string, any>) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}
interface OrbitalMechanicsCalculations {
  eccentricity: number;
  semiMajorAxis: number;
  semiMinorAxis: number;
  periapsis: { distance: number; position: THREE.Vector3; velocity: number };
  apoapsis: { distance: number; position: THREE.Vector3; velocity: number };
  period: number;
  meanMotion: number;
  specificEnergy: number;
  currentAnomaly: number;
  currentPosition: THREE.Vector3;
  currentVelocity: THREE.Vector3;
  orbitalPoints: OrbitalPoint[];
}
export const OrbitalMechanicsOverlay: React.FC<OrbitalMechanicsOverlayProps> = ({
  celestialBodyId,
  config,
  onConfigChange,
  scene,
  camera,
  canvas,
  isVisible,
  onPointClick,
  onEducationalAction,
  position = 'bottom-right',
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<OrbitalPoint | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const timeState = useSolarSystemStore(state => state.timeState);
  const currentLanguage = 'tr'; 
  const celestialBody = useMemo(() => {
    return SOLAR_SYSTEM_DATA[celestialBodyId];
  }, [celestialBodyId]);
  const getLocalizedText = useCallback((text: LocalizedContent): string => {
    return text[currentLanguage] || text['en'] || Object.values(text)[0] || '';
  }, [currentLanguage]);
  const orbitalCalculations = useMemo((): OrbitalMechanicsCalculations | null => {
    if (!celestialBody || !timeState) return null;
    const orbital = celestialBody.orbital;
    const currentTime = timeState.currentTime;
    const a = orbital.semiMajorAxis * ASTRONOMICAL_CONSTANTS.AU_IN_KM; 
    const e = orbital.eccentricity;
    const n = orbital.meanMotion * Math.PI / 180 / 86400; 
    const b = a * Math.sqrt(1 - e * e);
    const currentTimeNum = typeof currentTime === 'number' ? currentTime : new Date(currentTime).getTime() / 86400000;
    const epochNum = typeof orbital.epoch === 'number' ? orbital.epoch : new Date(orbital.epoch).getTime() / 86400000;
    const M = (orbital.meanAnomalyAtEpoch + n * (currentTimeNum - epochNum) * 86400) % (2 * Math.PI);
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = M + e * Math.sin(E);
    }
    const nu = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
    const r = a * (1 - e * Math.cos(E));
    const x_orbit = r * Math.cos(nu);
    const y_orbit = r * Math.sin(nu);
    const currentPosition = new THREE.Vector3(x_orbit, 0, y_orbit);
    const mu = ASTRONOMICAL_CONSTANTS.GRAVITATIONAL_CONSTANT * ASTRONOMICAL_CONSTANTS.SOLAR_MASS;
    const v = Math.sqrt(mu * (2/r - 1/a));
    const currentVelocity = new THREE.Vector3(0, 0, v);
    const periapsis = {
      distance: a * (1 - e),
      position: new THREE.Vector3(a * (1 - e), 0, 0),
      velocity: Math.sqrt(mu * (1 + e) / (a * (1 - e)))
    };
    const apoapsis = {
      distance: a * (1 + e),
      position: new THREE.Vector3(-a * (1 + e), 0, 0),
      velocity: Math.sqrt(mu * (1 - e) / (a * (1 + e)))
    };
    const period = 2 * Math.PI * Math.sqrt(a * a * a / mu);
    const specificEnergy = -mu / (2 * a);
    const orbitalPoints: OrbitalPoint[] = [
      {
        id: 'periapsis',
        name: { tr: 'Günberi', en: 'Periapsis' },
        position: periapsis.position,
        type: 'periapsis',
        date: new Date(), 
        velocity: periapsis.velocity,
        distance: periapsis.distance,
        description: { 
          tr: 'Yörüngedeki en yakın nokta', 
          en: 'Closest point in orbit' 
        }
      },
      {
        id: 'apoapsis',
        name: { tr: 'Günöte', en: 'Apoapsis' },
        position: apoapsis.position,
        type: 'apoapsis',
        date: new Date(),
        velocity: apoapsis.velocity,
        distance: apoapsis.distance,
        description: { 
          tr: 'Yörüngedeki en uzak nokta', 
          en: 'Farthest point in orbit' 
        }
      },
      {
        id: 'current',
        name: { tr: 'Mevcut Konum', en: 'Current Position' },
        position: currentPosition,
        type: 'current',
        date: new Date(timeState.currentTime),
        velocity: v,
        distance: r,
        description: { 
          tr: 'Şimdiki orbital konum', 
          en: 'Current orbital position' 
        }
      }
    ];
    return {
      eccentricity: e,
      semiMajorAxis: a,
      semiMinorAxis: b,
      periapsis,
      apoapsis,
      period,
      meanMotion: n,
      specificEnergy,
      currentAnomaly: nu,
      currentPosition,
      currentVelocity,
      orbitalPoints
    };
  }, [celestialBody, timeState]);
  useEffect(() => {
    if (!config.animateOrbit || !isVisible) return;
    const animate = () => {
      setAnimationProgress(prev => (prev + 0.005) % 1);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [config.animateOrbit, isVisible]);
  const handlePointClick = useCallback((point: OrbitalPoint) => {
    setSelectedPoint(point);
    onPointClick?.(point);
  }, [onPointClick]);
  const formatDistance = useCallback((distance: number): string => {
    if (distance > 1e9) {
      return `${(distance / 1e9).toFixed(2)} Milyar km`;
    } else if (distance > 1e6) {
      return `${(distance / 1e6).toFixed(2)} Milyon km`;
    } else if (distance > 1e3) {
      return `${(distance / 1e3).toFixed(2)} Bin km`;
    } else {
      return `${distance.toFixed(0)} km`;
    }
  }, []);
  const formatVelocity = useCallback((velocity: number): string => {
    return `${(velocity / 1000).toFixed(2)} km/s`;
  }, []);
  const formatPeriod = useCallback((seconds: number): string => {
    const days = seconds / 86400;
    if (days > 365.25) {
      return `${(days / 365.25).toFixed(1)} yıl`;
    } else if (days > 1) {
      return `${days.toFixed(1)} gün`;
    } else {
      return `${(seconds / 3600).toFixed(1)} saat`;
    }
  }, []);
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'bottom-4 right-4';
    }
  };
  if (!isVisible || !orbitalCalculations) return null;
  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed ${getPositionClasses()} z-50 ${className}`}
    >
      <Card className="bg-black/90 backdrop-blur-sm border-gray-700 text-white overflow-hidden">
        {}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-cyan-400">Orbital Mekanik</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="p-1"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden border-b border-gray-700"
            >
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showOrbitalPath}
                      onChange={(e) => onConfigChange?.({ showOrbitalPath: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <span>Yörünge Yolu</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showVelocityVectors}
                      onChange={(e) => onConfigChange?.({ showVelocityVectors: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <span>Hız Vektörleri</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showOrbitalPoints}
                      onChange={(e) => onConfigChange?.({ showOrbitalPoints: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <span>Orbital Noktalar</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.animateOrbit}
                      onChange={(e) => onConfigChange?.({ animateOrbit: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <span>Animasyon</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {}
        {!isExpanded && (
          <div className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="text-gray-400">Eksantriklik:</div>
                <div className="font-medium">{orbitalCalculations.eccentricity.toFixed(4)}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-400">Periyod:</div>
                <div className="font-medium">{formatPeriod(orbitalCalculations.period)}</div>
              </div>
            </div>
          </div>
        )}
        {}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 max-w-sm">
                {}
                <div>
                  <h3 className="text-sm font-semibold text-cyan-400 mb-2">Orbital Parametreler</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-400">Yarı Ana Eksen:</div>
                      <div className="font-medium">{formatDistance(orbitalCalculations.semiMajorAxis)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Eksantriklik:</div>
                      <div className="font-medium">{orbitalCalculations.eccentricity.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Orbital Periyod:</div>
                      <div className="font-medium">{formatPeriod(orbitalCalculations.period)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Ortalama Hareket:</div>
                      <div className="font-medium">{(orbitalCalculations.meanMotion * 180 / Math.PI * 86400).toFixed(2)}°/gün</div>
                    </div>
                  </div>
                </div>
                {}
                <div>
                  <h3 className="text-sm font-semibold text-green-400 mb-2">Mevcut Durum</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mesafe:</span>
                      <span>{formatDistance(orbitalCalculations.orbitalPoints.find(p => p.type === 'current')?.distance || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hız:</span>
                      <span>{formatVelocity(orbitalCalculations.orbitalPoints.find(p => p.type === 'current')?.velocity || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gerçek Anomali:</span>
                      <span>{(orbitalCalculations.currentAnomaly * 180 / Math.PI).toFixed(1)}°</span>
                    </div>
                  </div>
                </div>
                {}
                {config.showOrbitalPoints && (
                  <div>
                    <h3 className="text-sm font-semibold text-orange-400 mb-2">Orbital Noktalar</h3>
                    <div className="space-y-2">
                      {orbitalCalculations.orbitalPoints
                        .filter(point => point.type !== 'current')
                        .map(point => (
                          <button
                            key={point.id}
                            onClick={() => handlePointClick(point)}
                            className={`w-full text-left p-2 rounded text-xs transition-colors ${
                              selectedPoint?.id === point.id 
                                ? 'bg-cyan-600/20 border-cyan-400' 
                                : 'bg-gray-800/50 hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {point.type === 'periapsis' ? (
                                <Circle className="w-3 h-3 text-red-400" />
                              ) : (
                                <Circle className="w-3 h-3 text-blue-400" />
                              )}
                              <span className="font-medium">{getLocalizedText(point.name)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-gray-400">
                              <div>Mesafe: {formatDistance(point.distance)}</div>
                              <div>Hız: {formatVelocity(point.velocity)}</div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {}
                {config.showEducationalInfo && (
                  <div className="border-t border-gray-700 pt-3">
                    <h3 className="text-sm font-semibold text-purple-400 mb-2">Eğitici Bilgiler</h3>
                    <div className="text-xs text-gray-300 space-y-1">
                      <p>• Eksantriklik 0'a yaklaştıkça yörünge daire şeklini alır</p>
                      <p>• Periyapsis'te hız maksimum, apoapsis'te minimum olur</p>
                      <p>• Kepler'in ikinci yasası gereği eşit zamanlarda eşit alanlar taranır</p>
                    </div>
                  </div>
                )}
                {}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEducationalAction?.('focus_periapsis')}
                    className="text-xs"
                  >
                    <Target className="w-3 h-3 mr-1" />
                    Periyapsis'e Odakla
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEducationalAction?.('show_orbital_animation')}
                    className="text-xs"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Animasyonu Göster
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {}
        <AnimatePresence>
          {selectedPoint && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="border-t border-gray-700 overflow-hidden"
            >
              <div className="p-3 bg-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-cyan-400">
                    {getLocalizedText(selectedPoint.name)}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPoint(null)}
                    className="p-1"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-300 mb-2">
                  {getLocalizedText(selectedPoint.description)}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Mesafe:</div>
                    <div className="font-medium">{formatDistance(selectedPoint.distance)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Hız:</div>
                    <div className="font-medium">{formatVelocity(selectedPoint.velocity)}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEducationalAction?.('focus_point', { pointId: selectedPoint.id })}
                    className="text-xs w-full"
                  >
                    <Compass className="w-3 h-3 mr-1" />
                    Bu Noktaya Odakla
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};
export default OrbitalMechanicsOverlay;