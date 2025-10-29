import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { GeographicRegion, RegionStats } from '@/lib/geographic-regions'
import { regionDetector, EarthEvent as DetectorEarthEvent } from '@/lib/geographic-region-detector'

export interface EarthEvent {
  id: string
  title: string
  category: string
  severity: 'low' | 'medium' | 'high'
  date: string
  location: {
    lat: number
    lon: number
  }
  description?: string
  imageUrl?: string
  affectedArea?: number
  populationImpact?: number
  // AI Generated Images
  aiImages?: EONETAIImage[]
  aiImagesLoading?: boolean
  aiImagesError?: string
  hasAIImages?: boolean
}

export interface EONETAIImage {
  event_id: string
  purpose: string
  image_url: string
  title: string
  description: string
  prompt_used: string
  geographical_context: string
  severity_indicator: string
  generation_time_ms: number
  metadata: Record<string, any>
}

export interface EONETAIImageResponse {
  success: boolean
  event_id: string
  event_title: string
  generated_images: EONETAIImage[]
  total_images: number
  successful_generations: number
  failed_generations: number
  total_processing_time_ms: number
  event_context: Record<string, any>
  suggestions: string[]
  error_message?: string
}

export interface EventCluster {
  id: string
  coordinates: [number, number]
  count: number
  events: EarthEvent[]
}

interface EarthEventsStore {
  viewMode: '3D' | '2D' | 'transitioning'
  transitionProgress: number
  
  events: any[] // NASA EONET formatında events
  selectedEvent: any | null
  filteredEvents: any[]
  filters: {
    severity?: 'low' | 'medium' | 'high'
    category?: string
    dateRange?: { start: Date; end: Date }
  }
  
  mapCenter: [number, number]
  mapZoom: number
  clusters: EventCluster[]
  
  // Regional properties
  selectedRegion: GeographicRegion | null
  regionColorMode: boolean
  regionVisibility: Map<GeographicRegion, boolean>
  regionStats: RegionStats[]
  
  isAnimating: boolean
  autoPlay: boolean
  animationSpeed: number
  showcaseMode: boolean
  loading: boolean
  error: string | null
  
  startTransition: (event: any) => void
  toggleView: () => void
  selectEvent: (event: any | null) => void
  updateFilters: (filters: any) => void
  setTransitionProgress: (progress: number) => void
  setMapView: (center: [number, number], zoom: number) => void
  toggleAutoPlay: () => void
  setShowcaseMode: (enabled: boolean) => void
  setViewMode: (mode: '3D' | '2D' | 'transitioning') => void
  loadEvents: () => Promise<void>
  fetchEvents: () => Promise<void>
  
  // Regional actions
  selectRegion: (region: GeographicRegion | null) => void
  setRegionColorMode: (enabled: boolean) => void
  toggleRegionVisibility: (region: GeographicRegion) => void
  getRegionStats: () => RegionStats[]
  updateRegionStats: () => void
  getVisibleEvents: () => DetectorEarthEvent[]
  
  // AI Image Generation actions
  generateEventImages: (eventId: string) => Promise<void>
  getEventImages: (eventId: string) => Promise<void>
  clearEventImages: (eventId: string) => void
}

// NASA EONET API formatında mock data
const mockEvents: any[] = [
  {
    id: 'EONET_001',
    title: 'Türkiye Orman Yangını',
    description: 'Antalya bölgesinde devam eden orman yangını',
    created_date: new Date().toISOString(),
    categories: [{ id: 8, title: 'Wildfires' }],
    geometry: [{ coordinates: [30.7133, 36.8969] }]
  },
  {
    id: 'EONET_002',
    title: 'Ege Denizi Depremi',
    description: '5.2 büyüklüğünde deprem',
    created_date: new Date(Date.now() - 86400000).toISOString(),
    categories: [{ id: 16, title: 'Earthquakes' }],
    geometry: [{ coordinates: [26.1238, 38.4237] }]
  },
  {
    id: 'EONET_003',
    title: 'Karadeniz Fırtınası',
    description: 'Şiddetli fırtına ve yağış',
    created_date: new Date(Date.now() - 172800000).toISOString(),
    categories: [{ id: 10, title: 'Severe Storms' }],
    geometry: [{ coordinates: [36.3300, 41.2861] }]
  },
  {
    id: 'EONET_004',
    title: 'Akdeniz Sel Felaketi',
    description: 'Aşırı yağış sonucu sel',
    created_date: new Date(Date.now() - 259200000).toISOString(),
    categories: [{ id: 9, title: 'Floods' }],
    geometry: [{ coordinates: [32.0, 36.5] }]
  },
  {
    id: 'EONET_005',
    title: 'Etna Yanardağı Aktivitesi',
    description: 'İtalya Etna yanardağında artan aktivite',
    created_date: new Date(Date.now() - 345600000).toISOString(),
    categories: [{ id: 12, title: 'Volcanoes' }],
    geometry: [{ coordinates: [14.9934, 37.7510] }]
  },
  {
    id: 'EONET_006',
    title: 'California Orman Yangını',
    description: 'Los Angeles yakınlarında büyük yangın',
    created_date: new Date(Date.now() - 432000000).toISOString(),
    categories: [{ id: 8, title: 'Wildfires' }],
    geometry: [{ coordinates: [-118.2437, 34.0522] }]
  },
  {
    id: 'EONET_007',
    title: 'Japonya Depremi',
    description: '6.8 büyüklüğünde deprem',
    created_date: new Date(Date.now() - 518400000).toISOString(),
    categories: [{ id: 16, title: 'Earthquakes' }],
    geometry: [{ coordinates: [139.6503, 35.6762] }]
  },
  {
    id: 'EONET_008',
    title: 'Avustralya Kuraklık',
    description: 'Şiddetli kuraklık devam ediyor',
    created_date: new Date(Date.now() - 604800000).toISOString(),
    categories: [{ id: 15, title: 'Drought' }],
    geometry: [{ coordinates: [133.7751, -25.2744] }]
  },
  {
    id: 'EONET_009',
    title: 'Amazon Orman Yangını',
    description: 'Amazon yağmur ormanlarında büyük yangın',
    created_date: new Date(Date.now() - 691200000).toISOString(),
    categories: [{ id: 8, title: 'Wildfires' }],
    geometry: [{ coordinates: [-60.0261, -3.4653] }]
  },
  {
    id: 'EONET_010',
    title: 'Himalaya Buzul Eriması',
    description: 'Küresel ısınma nedeniyle hızlanan buzul eriması',
    created_date: new Date(Date.now() - 777600000).toISOString(),
    categories: [{ id: 15, title: 'Drought' }],
    geometry: [{ coordinates: [86.9250, 27.9881] }]
  }
]

export const useEarthEventsStore = create<EarthEventsStore>()(
  devtools(
    (set, get) => ({
      viewMode: '3D',
      transitionProgress: 0,
      
      events: mockEvents,
      selectedEvent: null,
      filteredEvents: mockEvents,
      filters: {},
      
      mapCenter: [0, 0],
      mapZoom: 2,
      clusters: [],
      
      // Regional properties initialization
      selectedRegion: null,
      regionColorMode: true,
      regionVisibility: new Map([
        [GeographicRegion.EUROPE, true],
        [GeographicRegion.ASIA, true],
        [GeographicRegion.NORTH_AMERICA, true],
        [GeographicRegion.SOUTH_AMERICA, true],
        [GeographicRegion.AFRICA, true],
        [GeographicRegion.OCEANIA, true],
        [GeographicRegion.MIDDLE_EAST, true],
        [GeographicRegion.ARCTIC, true]
      ]),
      regionStats: [],
      
      isAnimating: false,
      autoPlay: false,
      animationSpeed: 1,
      showcaseMode: false,
      loading: false,
      error: null,
      
      startTransition: (event) => {
        set({
          selectedEvent: event,
          viewMode: 'transitioning',
          isAnimating: true,
          transitionProgress: 0
        })
        
        const animate = () => {
          const progress = get().transitionProgress
          if (progress < 1) {
            set({ transitionProgress: Math.min(progress + 0.02, 1) })
            requestAnimationFrame(animate)
          } else {
            const coords = event.geometry?.[0]?.coordinates
            set({
              viewMode: '2D',
              isAnimating: false,
              mapCenter: coords ? [coords[0], coords[1]] : [0, 0],
              mapZoom: 10
            })
          }
        }
        
        animate()
      },
      
      toggleView: () => {
        const currentMode = get().viewMode
        if (currentMode === '3D') {
          const selectedEvent = get().selectedEvent
          if (selectedEvent) {
            get().startTransition(selectedEvent)
          } else {
            set({ viewMode: '2D' })
          }
        } else if (currentMode === '2D') {
          set({ viewMode: '3D', transitionProgress: 0 })
        }
      },
      
      selectEvent: (event) => {
        set({ selectedEvent: event })
        if (event && get().viewMode === '3D') {
          get().startTransition(event)
        }
      },
      
      updateFilters: (filters) => {
        set({ filters })
        
        const filtered = get().events.filter(event => {
          if (filters.severity && event.severity !== filters.severity) return false
          if (filters.category && event.category !== filters.category) return false
          if (filters.dateRange) {
            const eventDate = new Date(event.date)
            if (eventDate < filters.dateRange.start || eventDate > filters.dateRange.end) {
              return false
            }
          }
          return true
        })
        
        set({ filteredEvents: filtered })
      },
      
      setTransitionProgress: (progress) => set({ transitionProgress: progress }),
      
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
      
      toggleAutoPlay: () => set({ autoPlay: !get().autoPlay }),
      
      setShowcaseMode: (enabled) => set({ showcaseMode: enabled }),
      
      setViewMode: (mode) => set({ viewMode: mode }),
      
      loadEvents: async () => {
        set({ loading: true, error: null })
        try {
          const response = await fetch('http://localhost:8000/api/v1/nasa/earth-events')
          if (response.ok) {
            const data = await response.json()
            const events = data.success ? data.data?.events || mockEvents : mockEvents
            set({
              events,
              filteredEvents: events,
              loading: false
            })
          } else {
            console.log('Server not available, using mock data')
            set({
              events: mockEvents,
              filteredEvents: mockEvents,
              loading: false,
              error: null // Server olmadığında error gösterme
            })
          }
        } catch (error) {
          console.log('Failed to load events, using mock data:', error)
          set({
            events: mockEvents,
            filteredEvents: mockEvents,
            loading: false,
            error: null // Network error durumunda error gösterme
          })
        }
      },
      
      fetchEvents: async () => {
        set({ loading: true, error: null })
        try {
          const response = await fetch('http://localhost:8000/api/v1/nasa/earth-events')
          if (response.ok) {
            const data = await response.json()
            const events = data.success ? data.data?.events || mockEvents : mockEvents
            set({
              events,
              filteredEvents: events,
              loading: false
            })
          } else {
            console.log('Server not available, using mock data')
            set({
              events: mockEvents,
              filteredEvents: mockEvents,
              loading: false,
              error: null // Server olmadığında error gösterme
            })
          }
        } catch (error) {
          console.log('Failed to load events, using mock data:', error)
          set({
            events: mockEvents,
            filteredEvents: mockEvents,
            loading: false,
            error: null // Network error durumunda error gösterme
          })
        }
      },

      // Regional actions implementation
      selectRegion: (region) => {
        set({ selectedRegion: region })
        
        if (region) {
          const events = get().events
          const regionEvents = events.filter(event => {
            const coords = event.geometry?.[0]?.coordinates
            if (!coords) return false
            
            return regionDetector.detectRegion(coords[1], coords[0]) === region
          })
          
          set({
            filteredEvents: regionEvents,
            mapCenter: regionEvents.length > 0
              ? [regionEvents[0].geometry[0].coordinates[0], regionEvents[0].geometry[0].coordinates[1]]
              : get().mapCenter
          })
        } else {
          const visibleRegions = Array.from(get().regionVisibility.entries())
            .filter(([_, visible]) => visible)
            .map(([region, _]) => region)
          
          const events = get().events
          const visibleEvents = events.filter(event => {
            const coords = event.geometry?.[0]?.coordinates
            if (!coords) return false
            
            const eventRegion = regionDetector.detectRegion(coords[1], coords[0])
            return visibleRegions.includes(eventRegion)
          })
          
          set({ filteredEvents: visibleEvents })
        }
      },

      setRegionColorMode: (enabled) => {
        set({ regionColorMode: enabled })
      },

      toggleRegionVisibility: (region) => {
        const currentVisibility = get().regionVisibility
        const newVisibility = new Map(currentVisibility)
        newVisibility.set(region, !currentVisibility.get(region))
        
        set({ regionVisibility: newVisibility })
        
        // Update filtered events based on new visibility
        const visibleRegions = Array.from(newVisibility.entries())
          .filter(([_, visible]) => visible)
          .map(([region, _]) => region)
        
        const events = get().events
        const visibleEvents = events.filter(event => {
          const coords = event.geometry?.[0]?.coordinates
          if (!coords) return false
          
          const eventRegion = regionDetector.detectRegion(coords[1], coords[0])
          return visibleRegions.includes(eventRegion)
        })
        
        set({ filteredEvents: visibleEvents })
      },

      getRegionStats: () => {
        const events = get().events
        const detectorEvents: DetectorEarthEvent[] = events.map(event => ({
          id: event.id,
          coordinates: {
            lat: event.geometry?.[0]?.coordinates?.[1] || 0,
            lng: event.geometry?.[0]?.coordinates?.[0] || 0
          }
        }))
        
        return regionDetector.getRegionStats(detectorEvents)
      },

      updateRegionStats: () => {
        const stats = get().getRegionStats()
        set({ regionStats: stats })
      },

      getVisibleEvents: (): DetectorEarthEvent[] => {
        const visibleRegions = Array.from(get().regionVisibility.entries())
          .filter(([_, visible]) => visible)
          .map(([region, _]) => region)
        
        const events = get().events
        return events
          .filter(event => {
            const coords = event.geometry?.[0]?.coordinates
            if (!coords) return false
            
            const eventRegion = regionDetector.detectRegion(coords[1], coords[0])
            return visibleRegions.includes(eventRegion)
          })
          .map(event => ({
            id: event.id,
            coordinates: {
              lat: event.geometry[0].coordinates[1],
              lng: event.geometry[0].coordinates[0]
            }
          }))
      },
      
      // AI Image Generation actions
      generateEventImages: async (eventId: string) => {
        const event = get().events.find(e => e.id === eventId)
        if (!event) return
        
        // Mark as loading
        set(state => ({
          events: state.events.map(e =>
            e.id === eventId
              ? { ...e, aiImagesLoading: true, aiImagesError: undefined }
              : e
          )
        }))
        
        try {
          const response = await fetch(`http://localhost:8000/api/v1/eonet-ai-images/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_context: event,
              quality_level: 'high',
              include_location_context: true
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              // Update event with generated images
              set(state => ({
                events: state.events.map(e =>
                  e.id === eventId
                    ? {
                        ...e,
                        aiImages: data.data.generated_images,
                        hasAIImages: true,
                        aiImagesLoading: false,
                        aiImagesError: undefined
                      }
                    : e
                )
              }))
            } else {
              throw new Error(data.error_message || 'Failed to generate images')
            }
          } else {
            throw new Error('Server error')
          }
        } catch (error) {
          set(state => ({
            events: state.events.map(e =>
              e.id === eventId
                ? {
                    ...e,
                    aiImagesLoading: false,
                    aiImagesError: error instanceof Error ? error.message : 'Unknown error'
                  }
                : e
            )
          }))
        }
      },
      
      getEventImages: async (eventId: string) => {
        try {
          const response = await fetch(`http://localhost:8000/api/v1/eonet-ai-images/event/${eventId}`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              // Update event with cached images
              set(state => ({
                events: state.events.map(e =>
                  e.id === eventId
                    ? {
                        ...e,
                        aiImages: data.data.generated_images,
                        hasAIImages: true,
                        aiImagesLoading: false
                      }
                    : e
                )
              }))
            }
          }
        } catch (error) {
          console.error('Failed to get event images:', error)
        }
      },
      
      clearEventImages: (eventId: string) => {
        set(state => ({
          events: state.events.map(e =>
            e.id === eventId
              ? {
                  ...e,
                  aiImages: undefined,
                  hasAIImages: false,
                  aiImagesLoading: false,
                  aiImagesError: undefined
                }
              : e
          )
        }))
      }
    }),
    {
      name: 'earth-events-store'
    }
  )
)