"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import {
  SOLAR_SYSTEM_DATA,
  SIMPLE_MOONS,
  SimpleCelestialBody,
  ASTRONOMICAL_CONSTANTS
} from '../../../types/astronomical-data';
import { LocalizedContent } from '../../../types/educational-content';
import { useSolarSystemStore } from '../../../stores/solarSystemStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  Map, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Target,
  Home,
  Settings,
  Eye,
  EyeOff,
  Navigation,
  Compass
} from 'lucide-react';
interface MiniMapConfig {
  size: 'small' | 'medium' | 'large';
  showOrbits: boolean;
  showLabels: boolean;
  showScaleBar: boolean;
  showCurrentTime: boolean;
  showVelocityIndicators: boolean;
  autoCenter: boolean;
  followTarget: boolean;
}
interface CelestialPosition {
  id: string;
  name: string;
  position: { x: number; y: number };
  screenPosition: { x: number; y: number };
  distance: number;
  velocity: number;
  color: string;
  size: number;
  type: string;
  isVisible: boolean;
}
interface SolarSystemMiniMapProps {
  isVisible: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  config: MiniMapConfig;
  onConfigChange?: (config: Partial<MiniMapConfig>) => void;
  mainCamera?: THREE.Camera;
  scene?: THREE.Scene;
  onBodySelect?: (bodyId: string) => void;
  onBodyFocus?: (bodyId: string) => void;
  onCameraMove?: (position: THREE.Vector3, target: THREE.Vector3) => void;
  className?: string;
  zIndex?: number;
}
export const SolarSystemMiniMap: React.FC<SolarSystemMiniMapProps> = ({
  isVisible,
  position = 'top-right',
  config,
  onConfigChange,
  mainCamera,
  scene,
  onBodySelect,
  onBodyFocus,
  onCameraMove,
  className = '',
  zIndex = 1000
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [hoveredBody, setHoveredBody] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [dragState, setDragState] = useState({ isDragging: false, lastX: 0, lastY: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeState = useSolarSystemStore(state => state.timeState);
  const engineState = useSolarSystemStore(state => state.engineState);
  const currentLanguage = 'tr'; // FIXME: Should come from a user preferences store
  const celestialPositions = useMemo((): CelestialPosition[] => {
    if (!timeState) return [];
    const positions: CelestialPosition[] = [];
    const currentTime = timeState.currentTime;
    positions.push({
      id: 'sun',
      name: 'Güneş',
      position: { x: 0, y: 0 },
      screenPosition: { x: 0, y: 0 },
      distance: 0,
      velocity: 0,
      color: '#FDB813',
      size: 8,
      type: 'star',
      isVisible: true
    });
    Object.entries(SOLAR_SYSTEM_DATA).forEach(([bodyId, bodyData]) => {
      if (bodyId === 'sun') return;
      const position = calculateOrbitalPosition(bodyData, currentTime);
      const distance = Math.sqrt(position.x * position.x + position.y * position.y);
      positions.push({
        id: bodyId,
        name: bodyData.name,
        position: { x: position.x, y: position.y },
        screenPosition: { x: 0, y: 0 }, // Will be calculated in render
        distance,
        velocity: calculateOrbitalVelocity(bodyData, distance),
        color: bodyData.color,
        size: Math.max(2, Math.min(6, Math.log(bodyData.info.radius_km / 1000) + 2)),
        type: bodyData.type,
        isVisible: distance < 50 // Only show bodies within 50 AU
      });
    });
    Object.entries(SIMPLE_MOONS).forEach(([moonId, moonData]) => {
      if (!moonData.parent_id) return;
      const parentPos = positions.find(p => p.id === moonData.parent_id);
      if (!parentPos) return;
      const timeValue = currentTime.getTime() / 1000; // Convert to seconds
      const moonAngle = (timeValue * 0.0001) % (2 * Math.PI); // Simplified rotation
      const moonDistance = 0.2; // AU from parent (simplified)
      positions.push({
        id: moonId,
        name: moonData.name,
        position: {
          x: parentPos.position.x + moonDistance * Math.cos(moonAngle),
          y: parentPos.position.y + moonDistance * Math.sin(moonAngle)
        },
        screenPosition: { x: 0, y: 0 },
        distance: moonDistance,
        velocity: 1.0, // Simplified velocity
        color: moonData.color,
        size: 2,
        type: moonData.type,
        isVisible: zoom > 2 // Only show moons when zoomed in
      });
    });
    return positions;
  }, [timeState]);
  const calculateOrbitalPosition = useCallback((body: SimpleCelestialBody, currentTime: Date): { x: number; y: number } => {
    const orbit = body.orbit;
    const a = orbit.distance_from_sun; // AU
    const period = orbit.orbital_period_days; // days
    const julianDay = currentTime.getTime() / (1000 * 60 * 60 * 24) + 2440587.5;
    const angle = ((julianDay % period) / period) * 2 * Math.PI;
    return {
      x: a * Math.cos(angle),
      y: a * Math.sin(angle)
    };
  }, []);
  const calculateOrbitalVelocity = useCallback((body: SimpleCelestialBody, distance: number): number => {
    const circumference = 2 * Math.PI * body.orbit.distance_from_sun * ASTRONOMICAL_CONSTANTS.AU_IN_KM;
    const period = body.orbit.orbital_period_days * 24 * 3600; // Convert to seconds
    return circumference / period; // km/s
  }, []);
  const getCanvasDimensions = () => {
    const baseSize = isExpanded ? 300 : (config.size === 'small' ? 150 : config.size === 'medium' ? 200 : 250);
    return { width: baseSize, height: baseSize };
  };
  const worldToScreen = useCallback((worldPos: { x: number; y: number }, canvasSize: { width: number; height: number }) => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scale = zoom * Math.min(canvasSize.width, canvasSize.height) / 100; // Scale factor
    return {
      x: centerX + (worldPos.x - center.x) * scale,
      y: centerY + (worldPos.y - center.y) * scale
    };
  }, [zoom, center]);
  const screenToWorld = useCallback((screenPos: { x: number; y: number }, canvasSize: { width: number; height: number }) => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scale = zoom * Math.min(canvasSize.width, canvasSize.height) / 100;
    return {
      x: center.x + (screenPos.x - centerX) / scale,
      y: center.y + (screenPos.y - centerY) / scale
    };
  }, [zoom, center]);
  const renderMiniMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = getCanvasDimensions();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, width, height);
    if (zoom > 1.5) {
      drawGrid(ctx, width, height);
    }
    if (config.showOrbits) {
      drawOrbitalPaths(ctx, width, height);
    }
    celestialPositions.forEach(body => {
      if (!body.isVisible) return;
      const screenPos = worldToScreen(body.position, { width, height });
      body.screenPosition = screenPos;
      if (screenPos.x < 0 || screenPos.x > width || screenPos.y < 0 || screenPos.y > height) {
        return;
      }
      drawCelestialBody(ctx, body, screenPos);
    });
    if (config.showScaleBar) {
      drawScaleBar(ctx, width, height);
    }
    if (mainCamera) {
      drawCameraIndicator(ctx, width, height);
    }
  }, [celestialPositions, config, zoom, center, mainCamera, worldToScreen, hoveredBody, selectedBody]);
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    const gridSize = 20 * zoom;
    const offsetX = (center.x * zoom) % gridSize;
    const offsetY = (center.y * zoom) % gridSize;
    for (let x = -offsetX; x < width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = -offsetY; y < height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };
  const drawOrbitalPaths = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    Object.entries(SOLAR_SYSTEM_DATA).forEach(([bodyId, bodyData]) => {
      if (bodyId === 'sun') return;
      ctx.strokeStyle = `${bodyData.color}33`; // Semi-transparent
      ctx.lineWidth = 1;
      ctx.beginPath();
      const a = bodyData.orbit.distance_from_sun;
      for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
        const r = a;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        const screenPos = worldToScreen({ x, y }, { width, height });
        if (angle === 0) {
          ctx.moveTo(screenPos.x, screenPos.y);
        } else {
          ctx.lineTo(screenPos.x, screenPos.y);
        }
      }
      ctx.stroke();
    });
  };
  const drawCelestialBody = (ctx: CanvasRenderingContext2D, body: CelestialPosition, screenPos: { x: number; y: number }) => {
    const isHovered = body.id === hoveredBody;
    const isSelected = body.id === selectedBody;
    const radius = body.size * (isHovered ? 1.5 : 1) * zoom;
    if (isSelected || isHovered) {
      ctx.shadowColor = body.color;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = body.color;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius + 3, 0, 2 * Math.PI);
      ctx.stroke();
    }
    if (config.showVelocityIndicators && body.velocity > 0) {
      const velocityLength = Math.min(20, body.velocity / 5);
      ctx.strokeStyle = `${body.color}aa`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screenPos.x, screenPos.y);
      ctx.lineTo(screenPos.x + velocityLength, screenPos.y);
      ctx.stroke();
    }
    if (config.showLabels && (isHovered || isSelected || body.size > 4)) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(body.name, screenPos.x, screenPos.y - radius - 5);
    }
  };
  const drawScaleBar = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const scaleLength = 50; // pixels
    const scaleWorldLength = scaleLength / (zoom * Math.min(width, height) / 100);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.font = '10px sans-serif';
    const x = 10;
    const y = height - 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + scaleLength, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.moveTo(x + scaleLength, y - 3);
    ctx.lineTo(x + scaleLength, y + 3);
    ctx.stroke();
    ctx.textAlign = 'left';
    const scaleText = scaleWorldLength < 1
      ? `${(scaleWorldLength * ASTRONOMICAL_CONSTANTS.AU_IN_KM / 1e6).toFixed(1)} Mkm`
      : `${scaleWorldLength.toFixed(1)} AU`;
    ctx.fillText(scaleText, x, y - 8);
  };
  const drawCameraIndicator = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!mainCamera) return;
    const cameraWorldPos = { x: mainCamera.position.x / ASTRONOMICAL_CONSTANTS.AU_IN_KM, y: mainCamera.position.z / ASTRONOMICAL_CONSTANTS.AU_IN_KM };
    const cameraScreenPos = worldToScreen(cameraWorldPos, { width, height });
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cameraScreenPos.x, cameraScreenPos.y, 4, 0, 2 * Math.PI);
    ctx.stroke();
    const dirLength = 10;
    ctx.beginPath();
    ctx.moveTo(cameraScreenPos.x, cameraScreenPos.y);
    ctx.lineTo(cameraScreenPos.x + dirLength, cameraScreenPos.y);
    ctx.stroke();
  };
  const handleMouseMove = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (dragState.isDragging) {
      const deltaX = x - dragState.lastX;
      const deltaY = y - dragState.lastY;
      setCenter(prev => ({
        x: prev.x - deltaX / zoom / 10,
        y: prev.y - deltaY / zoom / 10
      }));
      setDragState(prev => ({ ...prev, lastX: x, lastY: y }));
      return;
    }
    const { width, height } = getCanvasDimensions();
    const hoveredBodyId = celestialPositions.find(body => {
      if (!body.isVisible) return false;
      const screenPos = worldToScreen(body.position, { width, height });
      const distance = Math.sqrt(Math.pow(x - screenPos.x, 2) + Math.pow(y - screenPos.y, 2));
      return distance <= body.size * 2;
    })?.id || null;
    setHoveredBody(hoveredBodyId);
  };
  const handleMouseDown = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setDragState({
      isDragging: true,
      lastX: x,
      lastY: y
    });
  };
  const handleMouseUp = () => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  };
  const handleClick = (event: React.MouseEvent) => {
    if (dragState.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { width, height } = getCanvasDimensions();
    const clickedBody = celestialPositions.find(body => {
      if (!body.isVisible) return false;
      const screenPos = worldToScreen(body.position, { width, height });
      const distance = Math.sqrt(Math.pow(x - screenPos.x, 2) + Math.pow(y - screenPos.y, 2));
      return distance <= body.size * 2;
    });
    if (clickedBody) {
      setSelectedBody(clickedBody.id);
      onBodySelect?.(clickedBody.id);
    }
  };
  const handleDoubleClick = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { width, height } = getCanvasDimensions();
    const clickedBody = celestialPositions.find(body => {
      if (!body.isVisible) return false;
      const screenPos = worldToScreen(body.position, { width, height });
      const distance = Math.sqrt(Math.pow(x - screenPos.x, 2) + Math.pow(y - screenPos.y, 2));
      return distance <= body.size * 2;
    });
    if (clickedBody) {
      onBodyFocus?.(clickedBody.id);
    }
  };
  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomFactor)));
  };
  useEffect(() => {
    const animate = () => {
      renderMiniMap();
      animationRef.current = requestAnimationFrame(animate);
    };
    if (isVisible) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, renderMiniMap]);
  useEffect(() => {
    if (config.followTarget && selectedBody) {
      const targetBody = celestialPositions.find(b => b.id === selectedBody);
      if (targetBody) {
        setCenter(targetBody.position);
      }
    }
  }, [config.followTarget, selectedBody, celestialPositions]);
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'top-4 right-4';
    }
  };
  if (!isVisible) return null;
  const { width, height } = getCanvasDimensions();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed ${getPositionClasses()} ${className}`}
      style={{ zIndex }}
    >
      <Card className="bg-black/90 backdrop-blur-sm border-gray-700 text-white overflow-hidden">
        {}
        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-400">Solar Sistem</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="p-1"
            >
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
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
              <div className="p-2 space-y-2">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={config.showOrbits}
                      onChange={(e) => onConfigChange?.({ showOrbits: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <span>Yörüngeler</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={config.showLabels}
                      onChange={(e) => onConfigChange?.({ showLabels: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <span>Etiketler</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={config.followTarget}
                      onChange={(e) => onConfigChange?.({ followTarget: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <span>Hedefi Takip</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={config.showVelocityIndicators}
                      onChange={(e) => onConfigChange?.({ showVelocityIndicators: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <span>Hız</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="cursor-grab active:cursor-grabbing"
            style={{ width: `${width}px`, height: `${height}px` }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
          />
          {}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(prev => Math.min(10, prev * 1.2))}
              className="p-1 bg-black/50"
            >
              <ZoomIn className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
              className="p-1 bg-black/50"
            >
              <ZoomOut className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCenter({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="p-1 bg-black/50"
            >
              <Home className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {}
        {(hoveredBody || selectedBody) && (
          <div className="p-2 border-t border-gray-700 text-xs">
            {(() => {
              const body = celestialPositions.find(b => b.id === (hoveredBody || selectedBody));
              if (!body) return null;
              return (
                <div>
                  <div className="font-semibold text-cyan-400">{body.name}</div>
                  <div className="text-gray-300">
                    Mesafe: {body.distance.toFixed(2)} AU
                  </div>
                  {body.velocity > 0 && (
                    <div className="text-gray-300">
                      Hız: {body.velocity.toFixed(1)} km/s
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Card>
    </motion.div>
  );
};
export default SolarSystemMiniMap;