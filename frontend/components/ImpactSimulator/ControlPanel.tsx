'use client'
import React, { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AsteroidParams, ImpactLocation } from './types'
import { Rocket, MapPin, Settings, Map } from 'lucide-react'
import { LocationPicker } from './LocationPicker'
interface ControlPanelProps {
  asteroid: AsteroidParams
  onAsteroidChange: (asteroid: AsteroidParams) => void
  location: ImpactLocation
  onLocationChange: (location: ImpactLocation) => void
  onSimulate: () => void
  isSimulating: boolean
}
const PRESET_ASTEROIDS = [
  { name: '2020 CD3', diameter: 6, velocity: 11 },
  { name: 'Apophis', diameter: 340, velocity: 12.6 },
  { name: 'Bennu', diameter: 490, velocity: 28 },
  { name: 'Tunguska (1908)', diameter: 60, velocity: 15 },
  { name: 'Chicxulub (Dinozor)', diameter: 10000, velocity: 20 },
]
const PRESET_LOCATIONS = [
  { name: 'İstanbul', lat: 41.0082, lng: 28.9784, population: 15000000, isOcean: false },
  { name: 'Ankara', lat: 39.9334, lng: 32.8597, population: 5700000, isOcean: false },
  { name: 'İzmir', lat: 38.4192, lng: 27.1287, population: 4400000, isOcean: false },
  { name: 'Akdeniz', lat: 36.0, lng: 30.0, population: 0, isOcean: true, depth: 1500 },
  { name: 'Karadeniz', lat: 42.0, lng: 35.0, population: 0, isOcean: true, depth: 2200 },
]
export function ControlPanel({
  asteroid,
  onAsteroidChange,
  location,
  onLocationChange,
  onSimulate,
  isSimulating
}: ControlPanelProps) {
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<string | undefined>(undefined)
  const [selectedAsteroidIndex, setSelectedAsteroidIndex] = useState<string | undefined>(undefined)
  return (
    <>
      <LocationPicker
        open={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={(newLocation) => {
          onLocationChange(newLocation)
          setSelectedLocationIndex(undefined) // Haritadan seçildi, dropdown'u temizle
        }}
        initialLocation={location}
      />
    <Card className="bg-pure-black/80 backdrop-blur-md border-cliff-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cliff-white">
          <Settings className="h-5 w-5" />
          Simülasyon Parametreleri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {}
        <div className="space-y-2">
          <Label className="text-cliff-white">Hazır Asteroid Seç</Label>
          <Select
            value={selectedAsteroidIndex}
            onValueChange={(value) => {
              setSelectedAsteroidIndex(value)
              const preset = PRESET_ASTEROIDS[parseInt(value)]
              onAsteroidChange({
                ...asteroid,
                diameter_m: preset.diameter,
                velocity_kms: preset.velocity
              })
            }}
          >
            <SelectTrigger className="bg-pure-black/50 border-cliff-white/20 text-cliff-white">
              <SelectValue placeholder="Asteroid seçin..." />
            </SelectTrigger>
            <SelectContent className="bg-pure-black border-cliff-white/20 text-cliff-white">
              {PRESET_ASTEROIDS.map((preset, index) => (
                <SelectItem 
                  key={index} 
                  value={index.toString()}
                  className="text-cliff-white hover:bg-cliff-white/10 focus:bg-cliff-white/20 cursor-pointer"
                >
                  {preset.name} ({preset.diameter}m)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-cliff-white flex justify-between">
              <span>Çap</span>
              <span className="text-accent-info">{asteroid.diameter_m}m</span>
            </Label>
            <Slider
              value={[asteroid.diameter_m]}
              onValueChange={([value]) => onAsteroidChange({ ...asteroid, diameter_m: value })}
              min={10}
              max={1000}
              step={10}
              className="cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-cliff-white flex justify-between">
              <span>Hız</span>
              <span className="text-accent-warning">{asteroid.velocity_kms} km/s</span>
            </Label>
            <Slider
              value={[asteroid.velocity_kms]}
              onValueChange={([value]) => onAsteroidChange({ ...asteroid, velocity_kms: value })}
              min={5}
              max={70}
              step={1}
              className="cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-cliff-white flex justify-between">
              <span>Çarpma Açısı</span>
              <span className="text-accent-success">{asteroid.angle_deg}°</span>
            </Label>
            <Slider
              value={[asteroid.angle_deg]}
              onValueChange={([value]) => onAsteroidChange({ ...asteroid, angle_deg: value })}
              min={0}
              max={90}
              step={5}
              className="cursor-pointer"
            />
            <p className="text-xs text-cliff-light-gray">0° = yatay, 90° = dikey</p>
          </div>
        </div>
        {}
        <div className="space-y-2">
          <Label className="text-cliff-white">Hedef Konum</Label>
          <div className="flex gap-2">
            <Select
              value={selectedLocationIndex}
              onValueChange={(value) => {
                setSelectedLocationIndex(value)
                const preset = PRESET_LOCATIONS[parseInt(value)]
                onLocationChange({
                  lat: preset.lat,
                  lng: preset.lng,
                  isOcean: preset.isOcean,
                  population: preset.population,
                  depth: preset.depth,
                  cityName: preset.name
                })
              }}
            >
              <SelectTrigger className="flex-1 bg-pure-black/50 border-cliff-white/20 text-cliff-white">
                <SelectValue placeholder="Konum seçin..." />
              </SelectTrigger>
              <SelectContent className="bg-pure-black border-cliff-white/20 text-cliff-white">
                {PRESET_LOCATIONS.map((preset, index) => (
                  <SelectItem 
                    key={index} 
                    value={index.toString()}
                    className="text-cliff-white hover:bg-cliff-white/10 focus:bg-cliff-white/20 cursor-pointer"
                  >
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowLocationPicker(true)}
              variant="outline"
              size="icon"
              className="bg-pure-black/50 border-cliff-white/20 text-cliff-white hover:bg-cliff-white/10"
              title="Haritadan seç"
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {}
        {location.cityName && (
          <div className="bg-pure-black/50 p-3 rounded border border-cliff-white/20">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-red-400" />
              <p className="text-cliff-white font-semibold">{location.cityName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-cliff-light-gray">Enlem</p>
                <p className="text-cliff-white font-mono">{location.lat.toFixed(4)}°</p>
              </div>
              <div>
                <p className="text-cliff-light-gray">Boylam</p>
                <p className="text-cliff-white font-mono">{location.lng.toFixed(4)}°</p>
              </div>
            </div>
          </div>
        )}
        {}
        <Button
          onClick={onSimulate}
          disabled={isSimulating}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-6"
        >
          <Rocket className="mr-2 h-5 w-5" />
          {isSimulating ? 'Simülasyon Çalışıyor...' : 'Simülasyonu Başlat'}
        </Button>
        {}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-xs text-yellow-400">
            ⚠️ Bu bir eğitim simülasyonudur. Gerçek etki birçok faktöre bağlıdır.
          </p>
        </div>
      </CardContent>
    </Card>
    </>
  )
}
