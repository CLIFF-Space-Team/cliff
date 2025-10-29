import { useSolarSystemStore, solarSystemSelectors, PerformanceManager } from './solarSystemStore'

// 🔧 FIX: Export main store and selectors
export { useSolarSystemStore, solarSystemSelectors, PerformanceManager }

// 🔧 FIX: Create stable custom hooks using selectors to prevent re-renders

// Engine State Hooks
export const useEngineState = () => {
  const isInitialized = useSolarSystemStore(solarSystemSelectors.isEngineInitialized)
  const isRunning = useSolarSystemStore(solarSystemSelectors.isEngineRunning)
  const engineVersion = useSolarSystemStore(solarSystemSelectors.engineVersion)
  const totalObjects = useSolarSystemStore(solarSystemSelectors.totalObjects)
  
  return {
    isInitialized,
    isRunning,
    engineVersion,
    totalObjects
  }
}

// Time State Hooks
export const useTimeState = () => {
  const currentTime = useSolarSystemStore(solarSystemSelectors.currentTime)
  const timeScale = useSolarSystemStore(solarSystemSelectors.timeScale)
  const isRunning = useSolarSystemStore(solarSystemSelectors.isTimeRunning)
  
  return {
    currentTime,
    timeScale,
    isRunning
  }
}

// Performance Metrics Hooks
export const usePerformanceMetrics = () => {
  const fps = useSolarSystemStore(solarSystemSelectors.fps)
  const frameTime = useSolarSystemStore(solarSystemSelectors.frameTime)
  const memoryUsage = useSolarSystemStore(solarSystemSelectors.memoryUsage)
  const visibleObjects = useSolarSystemStore(solarSystemSelectors.visibleObjects)
  const totalObjects = useSolarSystemStore(solarSystemSelectors.totalObjects)
  
  return {
    fps,
    frameTime,
    memoryUsage,
    visibleObjects,
    totalObjects
  }
}

// UI State Hooks  
export const useUIState = () => {
  const selectedObject = useSolarSystemStore(solarSystemSelectors.selectedObject)
  const cameraTarget = useSolarSystemStore(solarSystemSelectors.cameraTarget)
  const showOrbits = useSolarSystemStore(solarSystemSelectors.showOrbits)
  const showLabels = useSolarSystemStore(solarSystemSelectors.showLabels)
  
  return {
    selectedObject,
    cameraTarget,
    showOrbits,
    showLabels
  }
}

// 🔧 FIX: Create placeholder hooks for compatibility
export const useCameraState = () => {
  const cameraTarget = useSolarSystemStore(solarSystemSelectors.cameraTarget)
  
  return {
    target: cameraTarget,
    position: [5, 3, 5] as [number, number, number],
    fov: 75
  }
}

export const useVisualizationOptions = () => {
  const showOrbits = useSolarSystemStore(solarSystemSelectors.showOrbits)
  const showLabels = useSolarSystemStore(solarSystemSelectors.showLabels)
  
  return {
    showOrbits,
    showLabels,
    showPaths: true,
    showGrid: false
  }
}

export const useUserPreferences = () => {
  return {
    theme: 'dark',
    quality: 'high',
    autoSave: true
  }
}

// Action Hooks
export const useEngineActions = () => {
  const initializeEngine = useSolarSystemStore(state => state.initializeEngine)
  const startEngine = useSolarSystemStore(state => state.startEngine)
  const stopEngine = useSolarSystemStore(state => state.stopEngine)
  
  return {
    initialize: initializeEngine,
    start: startEngine,
    stop: stopEngine
  }
}

export const useTimeActions = () => {
  const setTimeScale = useSolarSystemStore(state => state.setTimeScale)
  const updateTime = useSolarSystemStore(state => state.updateTime)
  
  return {
    setTimeScale,
    updateTime,
    pause: useSolarSystemStore(state => state.stopEngine),
    resume: useSolarSystemStore(state => state.startEngine)
  }
}

export const useCameraActions = () => {
  const setCameraTarget = useSolarSystemStore(state => state.setCameraTarget)
  
  return {
    setTarget: setCameraTarget,
    resetView: () => setCameraTarget(null)
  }
}

export const useVisualizationActions = () => {
  const toggleOrbits = useSolarSystemStore(state => state.toggleOrbits)
  const toggleLabels = useSolarSystemStore(state => state.toggleLabels)
  
  return {
    toggleOrbits,
    toggleLabels
  }
}

// Complex Action Hooks
export const useInitializeEngine = () => {
  const initializeEngine = useSolarSystemStore(state => state.initializeEngine)
  const startEngine = useSolarSystemStore(state => state.startEngine)
  
  return () => {
    initializeEngine()
    startEngine()
  }
}

export const usePerformanceMonitoring = () => {
  const updateMetrics = useSolarSystemStore(state => state.updatePerformanceMetrics)
  
  return {
    updateMetrics,
    startMonitoring: () => {
      // Performance monitoring logic would go here
      console.log('Performance monitoring started')
    },
    stopMonitoring: () => {
      console.log('Performance monitoring stopped')
    }
  }
}

export const useTimeSimulation = () => {
  const timeActions = useTimeActions()
  const timeState = useTimeState()
  
  return {
    ...timeActions,
    ...timeState,
    fastForward: () => timeActions.setTimeScale(timeState.timeScale * 2),
    slowDown: () => timeActions.setTimeScale(timeState.timeScale / 2),
    realTime: () => timeActions.setTimeScale(1)
  }
}

// 🔧 FIX: Default export for backward compatibility
export default useSolarSystemStore