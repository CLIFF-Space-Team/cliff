'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { ImpactLocation } from './types'
import 'mapbox-gl/dist/mapbox-gl.css'
interface LocationPickerProps {
  open: boolean
  onClose: () => void
  onLocationSelect: (location: ImpactLocation) => void
  initialLocation?: ImpactLocation
}
interface MapboxFeature {
  place_name: string
  center: [number, number]
  text: string
}
export function LocationPicker({ 
  open, 
  onClose, 
  onLocationSelect, 
  initialLocation 
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<ImpactLocation | null>(
    initialLocation || null
  )
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiY2xpZmYtc3BhY2UiLCJhIjoiY2xuZGF0ZXN0MDAwMDJrcGVyMnhxMGtwYyJ9.example'
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
      )
      const data = await response.json()
      setSearchResults(data.features || [])
    } catch (error) {
      console.error('Geocoding hatası:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, MAPBOX_TOKEN])
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch()
      }, 500)
    } else {
      setSearchResults([])
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, handleSearch])
  useEffect(() => {
    if (!open || !mapContainerRef.current) return
    if (typeof window === 'undefined') return
    setMapLoading(true)
    const loadMapbox = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default
        if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('example')) {
          console.error('❌ Mapbox token geçersiz! .env.local dosyasını kontrol edin.')
          console.log('Mevcut token:', MAPBOX_TOKEN?.substring(0, 20) + '...')
          setMapLoading(false)
          return
        }
        console.log('✅ Mapbox token bulundu, harita yükleniyor...')
        mapboxgl.accessToken = MAPBOX_TOKEN
        if (mapRef.current) {
          console.log('Harita zaten var, mevcut haritayı kullanıyor...')
          if (initialLocation) {
            mapRef.current.setCenter([initialLocation.lng, initialLocation.lat])
            mapRef.current.setZoom(10)
          }
          setMapLoading(false)
          return
        }
        console.log('Yeni harita oluşturuluyor...')
        
        // Timeout ile güvenlik
        const loadingTimeout = setTimeout(() => {
          console.warn('⚠️  Harita yükleme timeout (10 saniye), loading kapatılıyor...')
          setMapLoading(false)
        }, 10000) // 10 saniye timeout
        
        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [initialLocation?.lng || 28.9784, initialLocation?.lat || 41.0082],
          zoom: 10,
        })
        map.on('load', () => {
          console.log('✅ Mapbox haritası başarıyla yüklendi!')
          clearTimeout(loadingTimeout)
          setMapLoading(false)
        })
        map.on('error', (e) => {
          console.error('❌ Mapbox harita hatası:', e)
          clearTimeout(loadingTimeout)
          setMapLoading(false)
        })
        map.on('click', async (e: any) => {
          const { lng, lat } = e.lngLat
          updateMarker(lng, lat)
          const cityName = await reverseGeocode(lng, lat)
          setSelectedLocation({
            lat,
            lng,
            isOcean: false,
            population: 0,
            cityName: cityName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          })
        })
        const marker = new mapboxgl.Marker({ color: '#FF4444', draggable: true })
          .setLngLat([initialLocation?.lng || 28.9784, initialLocation?.lat || 41.0082])
          .addTo(map)
        marker.on('dragend', async () => {
          const { lng, lat } = marker.getLngLat()
          const cityName = await reverseGeocode(lng, lat)
          setSelectedLocation({
            lat,
            lng,
            isOcean: false,
            population: 0,
            cityName: cityName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          })
        })
        mapRef.current = map
        markerRef.current = marker
      } catch (error) {
        console.error('Mapbox yükleme hatası:', error)
        setMapLoading(false)
      }
    }
    loadMapbox()
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [open])
  const updateMarker = (lng: number, lat: number) => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLngLat([lng, lat])
      mapRef.current.flyTo({ center: [lng, lat], zoom: 12 })
    }
  }
  const reverseGeocode = async (lng: number, lat: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
      )
      const data = await response.json()
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name
      }
      return null
    } catch (error) {
      console.error('Reverse geocoding hatası:', error)
      return null
    }
  }
  const handleSelectSearchResult = (feature: MapboxFeature) => {
    const [lng, lat] = feature.center
    updateMarker(lng, lat)
    setSelectedLocation({
      lat,
      lng,
      isOcean: false,
      population: 0,
      cityName: feature.place_name
    })
    setSearchResults([])
    setSearchQuery('')
  }
  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation)
      onClose()
    }
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-pure-black border-cliff-white/20">
        <DialogHeader>
          <DialogTitle className="text-cliff-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-400" />
            Asteroid Çarpma Konumu Seç
          </DialogTitle>
          <DialogDescription className="text-cliff-light-gray">
            Harita üzerinde tıklayın veya arama yapın
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex gap-2">
            <Input
              placeholder="Adres veya konum ara... (örn: İstanbul, Türkiye)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-pure-black/50 border-cliff-white/20 text-cliff-white"
            />
            {loading && (
              <div className="flex items-center px-3">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              </div>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="bg-pure-black/80 border border-cliff-white/20 rounded-lg max-h-40 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full text-left px-4 py-2 hover:bg-cliff-white/10 transition-colors text-cliff-white text-sm border-b border-cliff-white/10 last:border-b-0"
                >
                  <MapPin className="inline h-3 w-3 mr-2 text-red-400" />
                  {result.place_name}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 relative rounded-lg overflow-hidden border border-cliff-white/20" style={{ minHeight: '400px' }}>
            <div 
              ref={mapContainerRef} 
              className="absolute inset-0"
            />
            {mapLoading && (
              <div className="absolute inset-0 bg-pure-black/80 flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-cliff-white text-sm">Harita yükleniyor...</p>
                </div>
              </div>
            )}
          </div>
          {selectedLocation && (
            <div className="bg-pure-black/80 border border-cliff-white/20 rounded-lg p-4">
              <p className="text-sm text-cliff-light-gray mb-2">Seçili Konum:</p>
              <p className="text-cliff-white font-semibold">{selectedLocation.cityName}</p>
              <p className="text-xs text-cliff-light-gray mt-1">
                {selectedLocation.lat.toFixed(4)}°N, {selectedLocation.lng.toFixed(4)}°E
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose} className="text-cliff-white">
              İptal
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="bg-gradient-to-r from-red-600 to-orange-600"
            >
              Konumu Seç
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
