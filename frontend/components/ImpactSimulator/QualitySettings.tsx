'use client'
import React, { useState, useEffect } from 'react'
import { Settings, Zap, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
export type QualityPreset = 'low' | 'medium' | 'high' | 'auto'
export interface QualitySettings {
  preset: QualityPreset
  particles: number
  effects: boolean
  postProcessing: boolean
  autoAdjust: boolean
}
interface QualitySettingsProps {
  currentFps: number
  onSettingsChange: (settings: QualitySettings) => void
}
function detectGPU(): QualityPreset {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  if (!gl) return 'low'
  const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info')
  if (debugInfo) {
    const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
    if (renderer.includes('nvidia') && (renderer.includes('rtx') || renderer.includes('gtx 16') || renderer.includes('gtx 20'))) {
      return 'high'
    }
    if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) {
      return 'medium'
    }
  }
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if (maxTextureSize >= 16384) return 'high'
  if (maxTextureSize >= 8192) return 'medium'
  return 'low'
}
export function QualitySettings({ currentFps, onSettingsChange }: QualitySettingsProps) {
  const [settings, setSettings] = useState<QualitySettings>({
    preset: 'auto',
    particles: 100,
    effects: true,
    postProcessing: true,
    autoAdjust: true
  })
  const [detectedQuality, setDetectedQuality] = useState<QualityPreset>('medium')
  useEffect(() => {
    const detected = detectGPU()
    setDetectedQuality(detected)
    if (settings.preset === 'auto') {
      updateSettingsForPreset(detected)
    }
  }, [])
  useEffect(() => {
    if (settings.autoAdjust && currentFps < 30) {
      const lowerPreset = settings.preset === 'high' ? 'medium' : 'low'
      updateSettingsForPreset(lowerPreset)
    }
  }, [currentFps, settings.autoAdjust])
  const updateSettingsForPreset = (preset: QualityPreset) => {
    const presetConfigs = {
      low: { particles: 50, effects: false, postProcessing: false },
      medium: { particles: 100, effects: true, postProcessing: false },
      high: { particles: 200, effects: true, postProcessing: true },
      auto: { particles: 100, effects: true, postProcessing: true }
    }
    const config = presetConfigs[preset]
    const newSettings = { ...settings, preset, ...config }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }
  const handlePresetChange = (preset: QualityPreset) => {
    updateSettingsForPreset(preset)
  }
  const toggleEffect = (key: keyof QualitySettings) => {
    const newSettings = { ...settings, [key]: !settings[key] }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-pure-black/80 backdrop-blur-md border-cliff-white/20 text-cliff-white hover:bg-cliff-white/10"
        >
          <Settings className="h-4 w-4 mr-2" />
          Grafik Ayarları
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-pure-black/95 backdrop-blur-xl border-cliff-white/20 text-cliff-white">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Kalite Ayarları
            </h4>
            <p className="text-xs text-cliff-light-gray">
              GPU: {detectedQuality.toUpperCase()} algılandı
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-cliff-light-gray">Preset</Label>
            <Select value={settings.preset} onValueChange={handlePresetChange}>
              <SelectTrigger className="bg-pure-black/50 border-cliff-white/20 text-cliff-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3" />
                    Otomatik (Önerilen)
                  </div>
                </SelectItem>
                <SelectItem value="low">Düşük (Eski PC)</SelectItem>
                <SelectItem value="medium">Orta (Dengeli)</SelectItem>
                <SelectItem value="high">Yüksek (Güçlü GPU)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 pt-2 border-t border-cliff-white/10">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Efektler</Label>
              <Switch
                checked={settings.effects}
                onCheckedChange={() => toggleEffect('effects')}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Post-Processing</Label>
              <Switch
                checked={settings.postProcessing}
                onCheckedChange={() => toggleEffect('postProcessing')}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Otomatik Ayarlama</Label>
              <Switch
                checked={settings.autoAdjust}
                onCheckedChange={() => toggleEffect('autoAdjust')}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-cliff-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-cliff-light-gray">Parçacık Sayısı:</span>
              <span className="text-cliff-white font-mono">{settings.particles}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-cliff-light-gray">Mevcut FPS:</span>
              <span className={`font-mono ${
                currentFps >= 55 ? 'text-green-400' :
                currentFps >= 30 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {currentFps}
              </span>
            </div>
          </div>
          {settings.autoAdjust && currentFps < 30 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
              <p className="text-xs text-yellow-400">
                ⚡ Düşük FPS tespit edildi. Kalite otomatik düşürüldü.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
