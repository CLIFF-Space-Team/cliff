'use client'
import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Map, Layers, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEarthEventsStore } from '@/stores/earthEventsStore'
import { regionDetector } from '@/lib/geographic-region-detector'
import { GeographicRegion, REGION_COLORS } from '@/lib/geographic-regions'
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoia3ludXgiLCJhIjoiY21nczdqemU2MHJ5azJrczh3eTVoOHQzZCJ9.ZbSyFZQzYwri3XTOCee8xQ'
export default function View2D() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const selectedEventRef = useRef<any>(null)
  const {
    events,
    filteredEvents,
    regionColorMode,
    selectedEvent,
    selectEvent,
    mapCenter,
    mapZoom,
    setMapView
  } = useEarthEventsStore()
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(mapZoom)
  const [showHeatmap, setShowHeatmap] = useState(false)
  useEffect(() => {
    selectedEventRef.current = selectedEvent
  }, [selectedEvent])
  const buildEventsGeoJSON = () => {
    const sourceEvents = (filteredEvents && filteredEvents.length > 0) ? filteredEvents : events
    return {
      type: 'FeatureCollection' as const,
      features: sourceEvents.map(event => {
        const coords = event.geometry?.[0]?.coordinates || [0, 0]
        const region: GeographicRegion = regionDetector.detectRegion(coords[1], coords[0])
        const regionPrimary = REGION_COLORS[region]?.primary || '#FFA726'
        return {
          type: 'Feature' as const,
          properties: {
            eventId: event.id,
            title: event.title,
            category: event.categories?.[0]?.title || 'Unknown',
            date: event.created_date,
            description: event.description,
            region,
            regionPrimary
          },
          geometry: {
            type: 'Point' as const,
            coordinates: coords
          }
        }
      })
    }
  }
  const buildCategoryColorExpression = () => ([
    'match', ['get', 'category'],
    'Wildfires', '#FF6B35',
    'Volcanoes', '#D32F2F',
    'Severe Storms', '#7B68EE',
    'Floods', '#1E88E5',
    'Drought', '#FFB74D',
    'Earthquakes', '#8D6E63',
    '#FFA726'
  ]) as any
  const buildRegionColorExpression = () => ([
    'match', ['get', 'region'],
    GeographicRegion.EUROPE, REGION_COLORS[GeographicRegion.EUROPE].primary,
    GeographicRegion.ASIA, REGION_COLORS[GeographicRegion.ASIA].primary,
    GeographicRegion.NORTH_AMERICA, REGION_COLORS[GeographicRegion.NORTH_AMERICA].primary,
    GeographicRegion.SOUTH_AMERICA, REGION_COLORS[GeographicRegion.SOUTH_AMERICA].primary,
    GeographicRegion.AFRICA, REGION_COLORS[GeographicRegion.AFRICA].primary,
    GeographicRegion.OCEANIA, REGION_COLORS[GeographicRegion.OCEANIA].primary,
    GeographicRegion.MIDDLE_EAST, REGION_COLORS[GeographicRegion.MIDDLE_EAST].primary,
    GeographicRegion.ARCTIC, REGION_COLORS[GeographicRegion.ARCTIC].primary,
    '#FFA726'
  ]) as any
  const applyRegionColorMode = (map: mapboxgl.Map, enabled: boolean) => {
    const layerId = 'unclustered-point'
    if (!map.getLayer(layerId)) return
    map.setPaintProperty(
      layerId,
      'circle-color',
      enabled ? buildRegionColorExpression() : buildCategoryColorExpression()
    )
  }
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme
      center: mapCenter,
      zoom: currentZoom,
      projection: 'mercator' as any,
      attributionControl: false,
      renderWorldCopies: false,
      fadeDuration: 0,
      antialias: false,
      cooperativeGestures: true,
      pitchWithRotate: false
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right')
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left')
    map.on('load', () => {
      setMapLoaded(true)
      console.log('2D Map loaded successfully')
      map.addSource('events', {
        type: 'geojson',
        data: buildEventsGeoJSON(),
        cluster: true,
        clusterRadius: 60,
        clusterMaxZoom: 14
      })
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            '#10b981',
            20, '#0ea5e9',
            50, '#a78bfa',
            100, '#f59e0b'
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            14,
            20, 18,
            50, 24,
            100, 32
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0f766e'
        }
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'events',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12
        },
        paint: { 'text-color': '#ffffff' }
      })
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': buildCategoryColorExpression(),
          'circle-radius': 5,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff'
        }
      })
      applyRegionColorMode(map, regionColorMode)
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = '' })
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const feature: any = features[0]
        const clusterId = feature.properties.cluster_id
        const source = map.getSource('events') as mapboxgl.GeoJSONSource
        if (!source) return
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          map.easeTo({ center: feature.geometry.coordinates as any, zoom })
        })
      })
      map.on('click', 'unclustered-point', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] })
        const feature: any = features[0]
        if (!feature) return
        const { eventId, title, category, description } = feature.properties || {}
        const [lng, lat] = feature.geometry.coordinates
        const baseList = (filteredEvents && filteredEvents.length > 0) ? filteredEvents : events
        const fullEvent = baseList.find(ev => ev.id === eventId)
        if (fullEvent) selectEvent(fullEvent)
        const regionPrimary = feature.properties?.regionPrimary || '#22d3ee'
        const rawDate = (fullEvent?.created_date || fullEvent?.geometry?.[0]?.date || feature.properties?.date) as string | undefined
        const dt = rawDate ? new Date(rawDate) : null
        const dateText = (dt && !isNaN(dt.getTime())) ? dt.toLocaleString('tr-TR', { dateStyle: 'medium' }) : 'Tarih bilgisi yok'
        new mapboxgl.Popup({ offset: 16, className: 'glass-popup' })
          .setLngLat([lng, lat])
          .setHTML(`
            <div class="popup-card" style="--accent:${regionPrimary}">
              <div class="popup-header">
                <span class="popup-dot"></span>
                <h3 class="popup-title">${title || 'Bilinmeyen Olay'}</h3>
              </div>
              <div class="popup-meta">
                <div class="popup-row">🏷️ <span>${category || 'Unknown'}</span></div>
                ${description ? `<div class="popup-desc">${description}</div>` : ''}
                <div class="popup-row">📅 <span>${dateText}</span></div>
              </div>
            </div>
          `)
          .addTo(map)
      })
    })
    map.on('error', (e) => {
      console.error('Mapbox error:', e)
      setMapError(true)
    })
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom())
    })
    map.on('moveend', () => {
      const center = map.getCenter()
      setMapView([center.lng, center.lat], map.getZoom())
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const source = mapRef.current.getSource('events') as mapboxgl.GeoJSONSource
    if (source) {
      source.setData(buildEventsGeoJSON() as any)
    }
    if (mapRef.current.getSource('events-heatmap')) {
      const heatSrc = mapRef.current.getSource('events-heatmap') as mapboxgl.GeoJSONSource
      if (heatSrc) {
        heatSrc.setData({
          type: 'FeatureCollection',
          features: ((filteredEvents && filteredEvents.length > 0) ? filteredEvents : events).map(event => ({
            type: 'Feature' as const,
            properties: { weight: 1 },
            geometry: { type: 'Point' as const, coordinates: event.geometry?.[0]?.coordinates || [0, 0] }
          }))
        } as any)
      }
    }
  }, [events, filteredEvents, mapLoaded])
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    applyRegionColorMode(mapRef.current, regionColorMode)
  }, [regionColorMode, mapLoaded])
  const getEventColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'Wildfires': '#FF6B35',
      'Volcanoes': '#D32F2F',
      'Severe Storms': '#7B68EE',
      'Floods': '#1E88E5',
      'Drought': '#FFB74D',
      'Earthquakes': '#8D6E63'
    }
    return colors[category] || '#FFA726'
  }
  const handleZoomIn = () => {
    mapRef.current?.zoomIn()
  }
  const handleZoomOut = () => {
    mapRef.current?.zoomOut()
  }
  const handleReset = () => {
    mapRef.current?.flyTo({
      center: [0, 0],
      zoom: 2
    })
  }
  const toggleHeatmap = () => {
    if (!mapRef.current || !mapLoaded) return
    if (showHeatmap) {
      mapRef.current.removeLayer('heatmap')
      mapRef.current.removeSource('events-heatmap')
    } else {
      mapRef.current.addSource('events-heatmap', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: ((filteredEvents && filteredEvents.length > 0) ? filteredEvents : events).map(event => ({
            type: 'Feature' as const,
            properties: {
              weight: 1
            },
            geometry: {
              type: 'Point' as const,
              coordinates: event.geometry?.[0]?.coordinates || [0, 0]
            }
          }))
        }
      })
      mapRef.current.addLayer({
        id: 'heatmap',
        type: 'heatmap',
        source: 'events-heatmap',
        paint: {
          'heatmap-weight': {
            property: 'weight',
            type: 'exponential',
            stops: [
              [1, 0.6],
              [2, 1]
            ]
          },
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 1,
            15, 3
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
          ],
          'heatmap-radius': {
            stops: [
              [11, 15],
              [15, 20]
            ]
          },
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.6,
            15, 0
          ]
        }
      })
    }
    setShowHeatmap(!showHeatmap)
  }
  return (
    <div className="relative w-full h-full">
      {}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      {}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 left-4 z-10"
      >
        <div className="bg-black/80 backdrop-blur-md rounded-lg p-2 border border-white/20">
          <div className="flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleHeatmap}
              className={`p-2 rounded-lg transition-colors ${
                showHeatmap 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'text-white hover:bg-white/20'
              }`}
              title="Toggle Heatmap"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
      {}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Loading 2D Map...</p>
          </div>
        </div>
      )}
      {}
      <style jsx global>{`
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .mapboxgl-popup.glass-popup { max-width: 320px; }
        .mapboxgl-popup.glass-popup .mapboxgl-popup-content {
          background: #000000; 
          color: #f3f4f6; 
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 18px 44px rgba(0,0,0,0.6);
        }
        .mapboxgl-popup.glass-popup .mapboxgl-popup-close-button { color: #9ca3af; font-size: 16px; right: 8px; top: 6px; }
        .mapboxgl-popup.glass-popup .mapboxgl-popup-tip { border-top-color: #000000 !important; }
        .popup-card .popup-header { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
        .popup-card .popup-dot { width:8px; height:8px; border-radius:9999px; background: var(--accent, #22d3ee); box-shadow: 0 0 8px rgba(59,130,246,0.35); }
        .popup-card .popup-title { margin:0; font-weight:600; font-size:14px; color:#ffffff; line-height:1.3; }
        .popup-card .popup-meta { display:flex; flex-direction:column; gap:6px; }
        .popup-card .popup-row { display:flex; align-items:center; gap:8px; font-size:12px; color:#d1d5db; }
        .popup-card .popup-desc { font-size:12px; color:#d1d5db; line-height:1.4; max-width:260px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>
    </div>
  )
}