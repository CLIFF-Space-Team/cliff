"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Vector3 } from 'three';
import { 
  TooltipConfig, 
  TooltipContent, 
  LocalizedContent, 
  InteractionType,
  EducationalLevel 
} from '../../../types/educational-content';
import { useUserPreferences } from '../../../stores';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  Info, 
  X, 
  ChevronRight, 
  ExternalLink, 
  Camera, 
  Play,
  BookOpen,
  Zap,
  Users
} from 'lucide-react';

interface InteractiveTooltipProps {
  // Core properties
  isVisible: boolean;
  config: TooltipConfig;
  content: TooltipContent;
  
  // Positioning
  targetPosition?: { x: number; y: number; z: number }; // 3D world position
  screenPosition?: { x: number; y: number }; // 2D screen position
  
  // Callbacks
  onClose?: () => void;
  onAction?: (action: string, params?: Record<string, any>) => void;
  onInteractionChange?: (isInteracting: boolean) => void;
  
  // Advanced options
  parentElement?: HTMLElement;
  zIndex?: number;
  followMouse?: boolean;
  
  // 3D Integration
  camera?: THREE.Camera;
  canvas?: HTMLCanvasElement;
}

interface TooltipPosition {
  x: number;
  y: number;
  anchor: 'top' | 'bottom' | 'left' | 'right' | 'center';
  offset: { x: number; y: number };
}

export const InteractiveTooltip: React.FC<InteractiveTooltipProps> = ({
  isVisible,
  config,
  content,
  targetPosition,
  screenPosition,
  onClose,
  onAction,
  onInteractionChange,
  parentElement,
  zIndex = 10000,
  followMouse = false,
  camera,
  canvas
}) => {
  // State
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  
  // Refs
  const tooltipRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // Store
  const preferences = useUserPreferences();
  const currentLanguage = 'tr';
  
  // Get localized content
  const getLocalizedText = useCallback((text: LocalizedContent): string => {
    return text[currentLanguage] || text['en'] || Object.values(text)[0] || '';
  }, [currentLanguage]);

  // Calculate tooltip position
  const calculatePosition = useCallback((): TooltipPosition | null => {
    if (!canvas || !tooltipRef.current) return null;

    let screenPos = screenPosition;
    
    // Convert 3D position to screen coordinates if needed
    if (targetPosition && camera && !screenPosition) {
      const vector = new Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
      vector.project(camera);
      
      const canvasRect = canvas.getBoundingClientRect();
      screenPos = {
        x: (vector.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left,
        y: (-vector.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top
      };
    }

    if (!screenPos) return null;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Determine best position to avoid viewport edges
    let anchor: TooltipPosition['anchor'] = 'top';
    let x = screenPos.x;
    let y = screenPos.y;
    const offset = { x: 0, y: -10 };

    // Check space around target
    const spaceAbove = screenPos.y;
    const spaceBelow = viewportHeight - screenPos.y;
    const spaceLeft = screenPos.x;
    const spaceRight = viewportWidth - screenPos.x;
    
    // Determine best vertical position
    if (spaceAbove > tooltipRect.height + 20 && spaceAbove > spaceBelow) {
      anchor = 'bottom';
      y = screenPos.y - tooltipRect.height - 10;
      offset.y = 10;
    } else if (spaceBelow > tooltipRect.height + 20) {
      anchor = 'top';
      y = screenPos.y + 10;
      offset.y = -10;
    } else if (spaceLeft > tooltipRect.width + 20) {
      anchor = 'right';
      x = screenPos.x - tooltipRect.width - 10;
      y = screenPos.y - tooltipRect.height / 2;
      offset.x = 10;
      offset.y = 0;
    } else if (spaceRight > tooltipRect.width + 20) {
      anchor = 'left';
      x = screenPos.x + 10;
      y = screenPos.y - tooltipRect.height / 2;
      offset.x = -10;
      offset.y = 0;
    } else {
      // Center on screen if no good position
      anchor = 'center';
      x = (viewportWidth - tooltipRect.width) / 2;
      y = (viewportHeight - tooltipRect.height) / 2;
      offset.x = 0;
      offset.y = 0;
    }

    // Clamp to viewport bounds
    x = Math.max(10, Math.min(x, viewportWidth - tooltipRect.width - 10));
    y = Math.max(10, Math.min(y, viewportHeight - tooltipRect.height - 10));

    return { x, y, anchor, offset };
  }, [targetPosition, screenPosition, camera, canvas]);

  // Handle mouse movement for follow cursor mode
  useEffect(() => {
    if (!followMouse || !isVisible) return;

    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [followMouse, isVisible]);

  // Update position when dependencies change
  useEffect(() => {
    if (!isVisible) return;

    const updatePosition = () => {
      if (followMouse) {
        setPosition({
          x: mousePosition.x + 10,
          y: mousePosition.y - 10,
          anchor: 'top',
          offset: { x: -10, y: 10 }
        });
      } else {
        const newPos = calculatePosition();
        setPosition(newPos);
      }
    };

    // Immediate update
    updatePosition();

    // Update on resize or scroll
    const handleResize = () => requestAnimationFrame(updatePosition);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isVisible, followMouse, mousePosition, calculatePosition]);

  // Handle interaction state changes
  useEffect(() => {
    onInteractionChange?.(isInteracting);
  }, [isInteracting, onInteractionChange]);

  // Auto-hide timeout
  useEffect(() => {
    if (!isVisible || config.duration === 0 || isHovered || isInteracting) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      return;
    }

    timeoutRef.current = setTimeout(() => {
      onClose?.();
    }, config.duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, config.duration, isHovered, isInteracting, onClose]);

  // Handle section expansion
  const toggleSection = useCallback((index: number) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Handle action execution
  const executeAction = useCallback((action: string, params?: Record<string, any>) => {
    onAction?.(action, params);
    
    // Close tooltip for certain actions unless configured otherwise
    if (['focus_camera', 'show_orbit', 'open_info'].includes(action)) {
      setTimeout(() => onClose?.(), 300);
    }
  }, [onAction, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!config.focusable || !isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose?.();
          break;
        case 'Enter':
        case ' ':
          if (content.actions && content.actions.length > 0) {
            executeAction(content.actions[0].action, content.actions[0].params);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.focusable, isVisible, content.actions, executeAction, onClose]);

  // Format stat values
  const formatStatValue = useCallback((value: string | number, format?: string, unit?: string): string => {
    if (typeof value === 'string') return value;
    
    let formattedValue: string;
    
    switch (format) {
      case 'number':
        formattedValue = value.toLocaleString(currentLanguage);
        break;
      case 'percentage':
        formattedValue = `${(value * 100).toFixed(1)}%`;
        break;
      case 'distance':
        if (value >= 1e9) {
          formattedValue = `${(value / 1e9).toFixed(2)} milyar`;
        } else if (value >= 1e6) {
          formattedValue = `${(value / 1e6).toFixed(2)} milyon`;
        } else if (value >= 1e3) {
          formattedValue = `${(value / 1e3).toFixed(2)} bin`;
        } else {
          formattedValue = value.toLocaleString(currentLanguage);
        }
        break;
      case 'time':
        if (value >= 365.25) {
          formattedValue = `${(value / 365.25).toFixed(1)} yıl`;
        } else if (value >= 1) {
          formattedValue = `${value.toFixed(1)} gün`;
        } else {
          formattedValue = `${(value * 24).toFixed(1)} saat`;
        }
        break;
      case 'temperature':
        formattedValue = `${value}${unit || 'K'}`;
        break;
      default:
        formattedValue = value.toString();
    }
    
    return unit && format !== 'temperature' ? `${formattedValue} ${unit}` : formattedValue;
  }, [currentLanguage]);

  // Animation variants
  const tooltipVariants = {
    enter: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        duration: config.animation.duration / 1000
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -10,
      transition: {
        duration: config.animation.duration / 1000
      }
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'focus_camera': return Camera;
      case 'show_orbit': return Zap;
      case 'play_animation': return Play;
      case 'open_info': return BookOpen;
      case 'compare': return Users;
      default: return ExternalLink;
    }
  };

  // Render tooltip content
  const renderTooltipContent = () => (
    <div 
      ref={contentRef}
      className="relative bg-black/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl text-white max-w-sm"
      style={{ maxWidth: `${config.maxWidth}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="tooltip"
      aria-label={getLocalizedText(config.ariaLabel)}
      tabIndex={config.focusable ? 0 : -1}
    >
      {/* Header */}
      {(content.title || content.subtitle) && (
        <div className="p-4 pb-2 border-b border-gray-700">
          {content.title && (
            <h3 className="text-lg font-semibold text-cyan-400 mb-1">
              {getLocalizedText(content.title)}
            </h3>
          )}
          {content.subtitle && (
            <p className="text-sm text-gray-300">
              {getLocalizedText(content.subtitle)}
            </p>
          )}
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded hover:bg-gray-700 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview */}
      {content.preview && (
        <div className="px-4 pt-2">
          {content.preview.type === 'image' && (
            <img
              src={content.preview.source}
              alt=""
              className="w-full h-32 object-cover rounded"
              style={{ aspectRatio: content.preview.aspectRatio || 'auto' }}
            />
          )}
        </div>
      )}

      {/* Main content */}
      <div className="p-4">
        <p className="text-gray-200 text-sm leading-relaxed mb-3">
          {getLocalizedText(content.description)}
        </p>

        {/* Quick stats */}
        {content.stats && content.stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {content.stats.map((stat, index) => (
              <div key={index} className="bg-gray-800/50 rounded p-2">
                <div className="text-xs text-gray-400">
                  {getLocalizedText(stat.label)}
                </div>
                <div className="text-sm font-medium text-white">
                  {formatStatValue(stat.value, stat.format, stat.unit)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expandable sections */}
        {content.sections && content.sections.length > 0 && (
          <div className="space-y-2 mb-3">
            {content.sections.map((section, index) => {
              const isExpanded = expandedSections.has(index) || section.defaultExpanded;
              
              return (
                <div key={index} className="border border-gray-700 rounded">
                  <button
                    onClick={() => section.expandable && toggleSection(index)}
                    className={`w-full flex items-center justify-between p-2 text-left ${
                      section.expandable ? 'hover:bg-gray-800/50' : ''
                    } transition-colors`}
                    disabled={!section.expandable}
                  >
                    <span className="text-sm font-medium text-cyan-400">
                      {getLocalizedText(section.title)}
                    </span>
                    {section.expandable && (
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} 
                      />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {(isExpanded || !section.expandable) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 pt-0 text-xs text-gray-300 border-t border-gray-700">
                          {getLocalizedText(section.content)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {content.actions && content.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {content.actions.map((action, index) => {
              const IconComponent = getActionIcon(action.action);
              
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => executeAction(action.action, action.params)}
                  className="text-xs"
                  onMouseEnter={() => setIsInteracting(true)}
                  onMouseLeave={() => setIsInteracting(false)}
                >
                  <IconComponent className="w-3 h-3 mr-1" />
                  {getLocalizedText(action.label)}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Arrow indicator */}
      {position && position.anchor !== 'center' && (
        <div
          className={`absolute w-2 h-2 bg-black/95 border-gray-700 rotate-45 ${
            position.anchor === 'top' ? 'border-b border-r -top-1 left-1/2 -translate-x-1/2' :
            position.anchor === 'bottom' ? 'border-t border-l -bottom-1 left-1/2 -translate-x-1/2' :
            position.anchor === 'left' ? 'border-t border-r -left-1 top-1/2 -translate-y-1/2' :
            'border-t border-l -right-1 top-1/2 -translate-y-1/2'
          }`}
        />
      )}
    </div>
  );

  if (!isVisible || !position) return null;

  const tooltip = (
    <AnimatePresence mode="wait">
      <motion.div
        key="tooltip"
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate="enter"
        exit="exit"
        variants={tooltipVariants}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex,
          pointerEvents: 'auto'
        }}
        className="pointer-events-auto"
      >
        {renderTooltipContent()}
      </motion.div>
    </AnimatePresence>
  );

  // Use portal to render outside component tree
  const targetElement = parentElement || document.body;
  return createPortal(tooltip, targetElement);
};

export default InteractiveTooltip;
