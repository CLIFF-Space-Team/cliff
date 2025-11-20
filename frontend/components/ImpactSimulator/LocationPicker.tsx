'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2 } from 'lucide-react'
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

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !MAPBOX_TOKEN) return
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
    if (!open) return
    
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      markerRef.current = null
    }

    setMapLoading(true)

    const initMapWithRetry = async (retryCount = 0) => {
      if (!mapContainerRef.current && retryCount < 10) {
        console.warn(`Map container henüz hazır değil, deneme ${retryCount + 1}/10`)
        setTimeout(() => initMapWithRetry(retryCount + 1), 100)
        return
      }

      if (!mapContainerRef.current) {
        console.error('Map container 1 saniye sonra bile hazır olmadı!')
        setMapLoading(false)
        return
      }
      try {
        if (!MAPBOX_TOKEN) {
            console.error('❌ Mapbox token eksik! NEXT_PUBLIC_MAPBOX_TOKEN environment variable tanımlı değil.')
            setMapLoading(false) 
            return
        }

        console.log('✅ Mapbox token bulundu:', MAPBOX_TOKEN.substring(0, 20) + '...')
        console.log('📦 Container boyutu:', {
          width: mapContainerRef.current?.offsetWidth,
          height: mapContainerRef.current?.offsetHeight
        })
        
        const mapboxgl = (await import('mapbox-gl')).default
        mapboxgl.accessToken = MAPBOX_TOKEN

        console.log('🗺️ Harita nesnesi oluşturuluyor...')

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [initialLocation?.lng || 28.9784, initialLocation?.lat || 41.0082],
          zoom: 10,
          attributionControl: false,
          renderWorldCopies: false
        })

        console.log('🔍 Map nesnesi oluşturuldu, event listener\'lar bekleniyor...')

        map.on('styledata', () => {
          console.log('🎨 Harita stili yüklendi')
        })

        map.on('load', () => {
          console.log('✅ Harita tamamen yüklendi!')
          setMapLoading(false)
          setTimeout(() => {
            map.resize()
          }, 100)
        })

        map.on('error', (e) => {
          console.error('❌ Mapbox harita hatası:', e)
          console.error('Hata detayı:', e.error)
          setMapLoading(false)
        })

        const marker = new mapboxgl.Marker({ color: '#FF4444', draggable: true })
          .setLngLat([initialLocation?.lng || 28.9784, initialLocation?.lat || 41.0082])
          .addTo(map)

        marker.on('dragend', async () => {
          const { lng, lat } = marker.getLngLat()
          await handleLocationUpdate(lng, lat)
        })

        map.on('click', async (e: any) => {
          const { lng, lat } = e.lngLat
          marker.setLngLat([lng, lat])
          map.flyTo({ center: [lng, lat], zoom: 12 })
          await handleLocationUpdate(lng, lat)
        })

        mapRef.current = map
        markerRef.current = marker

        console.log('🎯 Harita event listener\'ları kuruldu')

      } catch (error) {
        console.error('❌ Mapbox başlatma hatası:', error)
        setMapLoading(false)
      }
    }

    initMapWithRetry()

    return () => {
      if (mapRef.current) {
        console.log('🧹 Harita temizleniyor...')
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [open, MAPBOX_TOKEN, initialLocation])

  const reverseGeocode = async (lng: number, lat: number): Promise<string | null> => {
    if (!MAPBOX_TOKEN) return null
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

  const handleLocationUpdate = async (lng: number, lat: number) => {
    const cityName = await reverseGeocode(lng, lat)
    setSelectedLocation({
      lat,
      lng,
      isOcean: false,
      population: 0,
      cityName: cityName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    })
  }

  const handleSelectSearchResult = (feature: MapboxFeature) => {
    const [lng, lat] = feature.center
    
    if (markerRef.current && mapRef.current) {
        markerRef.current.setLngLat([lng, lat])
        mapRef.current.flyTo({ center: [lng, lat], zoom: 12 })
    }

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
            <div className="bg-pure-black/80 border border-cliff-white/20 rounded-lg max-h-40 overflow-y-auto z-50 absolute w-[calc(100%-3rem)] mt-12">
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

          <div className="flex-1 relative rounded-lg overflow-hidden border border-cliff-white/20" style={{ minHeight: '400px', height: '100%' }}>
            <div 
              ref={mapContainerRef} 
              className="absolute inset-0"
              style={{ width: '100%', height: '100%' }}
            />
            {mapLoading && (
              <div className="absolute inset-0 bg-pure-black/80 flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-cliff-white text-sm">Harita yükleniyor...</p>
                  {!MAPBOX_TOKEN && (
                      <p className="text-red-500 text-xs mt-2">API Anahtarı Eksik!</p>
                  )}
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