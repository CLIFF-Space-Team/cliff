import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Vector3 } from 'three'

interface TimeState {
  currentTime: Date
  timeScale: number
  isRunning: boolean
}

interface CelestialBodyState {
  id: string
  name: string
  type: 'planet' | 'moon' | 'asteroid' | 'comet'
  position: Vector3
  velocity: Vector3
  mass: number
  radius: number
}

interface EngineState {
  isInitialized: boolean
  isRunning: boolean
  engineVersion: string
  totalObjects: number
}

interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  totalObjects: number
  visibleObjects: number
}

interface PerformanceState {
  metrics: PerformanceMetrics
  isMonitoring: boolean
}

interface UIState {
  selectedObject: string | null
  cameraTarget: string | null
  showOrbits: boolean
  showLabels: boolean
  searchQuery: string
  activeFilters: {
    planets: boolean
    moons: boolean
    dwarfPlanets: boolean
  }
}

interface SolarSystemStore {
  engineState: EngineState
  timeState: TimeState
  ui: UIState
  performance: PerformanceState
  storeObjects: { [key: string]: CelestialBodyState }

  initializeEngine: () => void
  startEngine: () => void
  stopEngine: () => void
  updateTime: (deltaTime: number) => void
  setTimeScale: (scale: number) => void
  
  selectObject: (id: string | null) => void
  setCameraTarget: (id: string | null) => void
  toggleOrbits: () => void
  toggleLabels: () => void
  setSearchQuery: (query: string) => void
  setActiveFilters: (filters: UIState['activeFilters']) => void
  
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void
  
  addObject: (object: CelestialBodyState) => void
  removeObject: (id: string) => void
  updateObject: (id: string, updates: Partial<CelestialBodyState>) => void
}

const initialEngineState: EngineState = {
  isInitialized: false,
  isRunning: false,
  engineVersion: '3.1.0',
  totalObjects: 0
}

const initialTimeState: TimeState = {
  currentTime: new Date(),
  timeScale: 1,
  isRunning: false
}

const initialUIState: UIState = {
  selectedObject: null,
  cameraTarget: null,
  showOrbits: true,
  showLabels: true,
  searchQuery: '',
  activeFilters: {
    planets: true,
    moons: true,
    dwarfPlanets: true,
  },
}

const initialPerformanceState: PerformanceState = {
  metrics: {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    totalObjects: 0,
    visibleObjects: 0
  },
  isMonitoring: false
}

export const useSolarSystemStore = create<SolarSystemStore>()(
  devtools(
    (set, get) => ({
      engineState: initialEngineState,
      timeState: initialTimeState,
      ui: initialUIState,
      performance: initialPerformanceState,
      storeObjects: {},

      initializeEngine: () => {
        set((state) => ({
          engineState: {
            ...state.engineState,
            isInitialized: true,
          }
        }), false, 'initializeEngine')
      },

      startEngine: () => {
        set((state) => ({
          engineState: {
            ...state.engineState,
            isRunning: true,
          },
          timeState: {
            ...state.timeState,
            isRunning: true,
          }
        }), false, 'startEngine')
      },

      stopEngine: () => {
        set((state) => ({
          engineState: {
            ...state.engineState,
            isRunning: false,
          },
          timeState: {
            ...state.timeState,
            isRunning: false,
          }
        }), false, 'stopEngine')
      },

      updateTime: (deltaTime: number) => {
        const state = get()
        if (!state.timeState.isRunning) return

        set((state) => ({
          timeState: {
            ...state.timeState,
            currentTime: new Date(state.timeState.currentTime.getTime() + deltaTime * state.timeState.timeScale * 1000)
          }
        }), false, 'updateTime')
      },

      setTimeScale: (scale: number) => {
        set((state) => ({
          timeState: {
            ...state.timeState,
            timeScale: Math.max(0.1, Math.min(10000, scale))
          }
        }), false, 'setTimeScale')
      },

      selectObject: (id: string | null) => {
        set((state) => ({
          ui: {
            ...state.ui,
            selectedObject: id
          }
        }), false, 'selectObject')
      },

      setCameraTarget: (id: string | null) => {
        set((state) => ({
          ui: {
            ...state.ui,
            cameraTarget: id
          }
        }), false, 'setCameraTarget')
      },

      toggleOrbits: () => {
        set((state) => ({
          ui: {
            ...state.ui,
            showOrbits: !state.ui.showOrbits
          }
        }), false, 'toggleOrbits')
      },

      toggleLabels: () => {
        set((state) => ({
          ui: {
            ...state.ui,
            showLabels: !state.ui.showLabels
          }
        }), false, 'toggleLabels')
      },

      setSearchQuery: (query: string) => {
        set((state) => ({
          ui: {
            ...state.ui,
            searchQuery: query,
          },
        }), false, 'setSearchQuery')
      },

      setActiveFilters: (filters: UIState['activeFilters']) => {
        set((state) => ({
          ui: {
            ...state.ui,
            activeFilters: filters,
          },
        }), false, 'setActiveFilters')
      },

      updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => {
        set((state) => ({
          performance: {
            ...state.performance,
            metrics: {
              ...state.performance.metrics,
              ...metrics
            }
          }
        }), false, 'updatePerformanceMetrics')
      },

      addObject: (object: CelestialBodyState) => {
        set((state) => ({
          storeObjects: {
            ...state.storeObjects,
            [object.id]: object
          },
          engineState: {
            ...state.engineState,
            totalObjects: Object.keys(state.storeObjects).length + 1
          }
        }), false, 'addObject')
      },

      removeObject: (id: string) => {
        set((state) => {
          const newObjects = { ...state.storeObjects }
          delete newObjects[id]
          
          return {
            storeObjects: newObjects,
            engineState: {
              ...state.engineState,
              totalObjects: Object.keys(newObjects).length
            }
          }
        }, false, 'removeObject')
      },

      updateObject: (id: string, updates: Partial<CelestialBodyState>) => {
        set((state) => ({
          storeObjects: {
            ...state.storeObjects,
            [id]: {
              ...state.storeObjects[id],
              ...updates
            }
          }
        }), false, 'updateObject')
      },
    }),
    {
      name: 'solar-system-store'
    }
  )
)

export const solarSystemSelectors = {
  isEngineInitialized: (state: SolarSystemStore) => state.engineState.isInitialized,
  isEngineRunning: (state: SolarSystemStore) => state.engineState.isRunning,
  engineVersion: (state: SolarSystemStore) => state.engineState.engineVersion,
  totalObjects: (state: SolarSystemStore) => state.engineState.totalObjects,
  
  currentTime: (state: SolarSystemStore) => state.timeState.currentTime,
  timeScale: (state: SolarSystemStore) => state.timeState.timeScale,
  isTimeRunning: (state: SolarSystemStore) => state.timeState.isRunning,
  
  selectedObject: (state: SolarSystemStore) => state.ui.selectedObject,
  cameraTarget: (state: SolarSystemStore) => state.ui.cameraTarget,
  showOrbits: (state: SolarSystemStore) => state.ui.showOrbits,
  showLabels: (state: SolarSystemStore) => state.ui.showLabels,
  searchQuery: (state: SolarSystemStore) => state.ui.searchQuery,
  activeFilters: (state: SolarSystemStore) => state.ui.activeFilters,
  
  fps: (state: SolarSystemStore) => state.performance.metrics.fps,
  frameTime: (state: SolarSystemStore) => state.performance.metrics.frameTime,
  memoryUsage: (state: SolarSystemStore) => state.performance.metrics.memoryUsage,
  visibleObjects: (state: SolarSystemStore) => state.performance.metrics.visibleObjects,
  
  allObjects: (state: SolarSystemStore) => state.storeObjects,
  getObject: (id: string) => (state: SolarSystemStore) => state.storeObjects[id],
}


export class PerformanceManager {
  private updateCallback: ((metrics: Partial<PerformanceMetrics>) => void) | null = null
  private isMonitoring: boolean = false
  private rafId: number | null = null
  
  constructor() {
  }

  setUpdateCallback(callback: (metrics: Partial<PerformanceMetrics>) => void) {
    this.updateCallback = callback
  }

  startMonitoring() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    let frameCount = 0
    let lastTime = performance.now()
    
    const monitor = () => {
      if (!this.isMonitoring) return
      
      frameCount++
      const currentTime = performance.now()
      
      if (frameCount >= 60) {
        const deltaTime = currentTime - lastTime
        const fps = Math.round((frameCount * 1000) / deltaTime)
        const frameTime = deltaTime / frameCount
        
        if (this.updateCallback) {
          this.updateCallback({
            fps,
            frameTime: Number(frameTime.toFixed(2)),
            memoryUsage: this.getMemoryUsage()
          })
        }
        
        frameCount = 0
        lastTime = currentTime
      }
      
      this.rafId = requestAnimationFrame(monitor)
    }
    
    this.rafId = requestAnimationFrame(monitor)
  }

  stopMonitoring() {
    this.isMonitoring = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      return Math.round((window.performance as any).memory.usedJSHeapSize / 1048576) 
    }
    return 0
  }

  dispose() {
    this.stopMonitoring()
    this.updateCallback = null
  }
}

export default useSolarSystemStore