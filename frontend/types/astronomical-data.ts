// CLIFF 3D Solar System - BasitleÅŸtirilmiÅŸ Astronomi Veri Tipleri
// KullanÄ±cÄ± dostu 3D gÃ¼neÅŸ sistemi gÃ¶sterimi iÃ§in basit veri yapÄ±larÄ±

// ==============================================================================
// BASIT 3D VECTOR VE TEMEL TÄ°PLER
// ==============================================================================

export interface SimpleVector3D {
  x: number
  y: number
  z: number
}

export interface SimpleCoordinates {
  lat: number
  lon: number
}

// ==============================================================================
// BASITLEÅTIRILMIÅ ORBÄ°T BÄ°LGÄ°LERÄ°
// ==============================================================================

export interface SimpleOrbit {
  distance_from_sun: number    // AU cinsinden mesafe
  orbital_period_days: number  // YÃ¶rÃ¼nge periyodu (gÃ¼n)
  rotation_period_hours: number // DÃ¶nÃ¼ÅŸ periyodu (saat)
  tilt_degrees: number         // Eksen eÄŸimi (derece)
}

// ==============================================================================
// BASIT GÃ–KSEL CÄ°SÄ°M Ã–ZELLÄ°KLERÄ°
// ==============================================================================

export interface SimplePlanetInfo {
  radius_km: number           // YarÄ±Ã§ap (km)
  mass_relative_to_earth: number  // DÃ¼nya'ya gÃ¶re kÃ¼tle oranÄ±
  gravity_relative_to_earth: number // DÃ¼nya'ya gÃ¶re yerÃ§ekimi oranÄ±
  has_atmosphere: boolean     // Atmosferi var mÄ±?
  has_rings: boolean         // HalkalarÄ± var mÄ±?
  moon_count: number         // Uydu sayÄ±sÄ±
  surface_temp_celsius: {
    min: number
    max: number
    average: number
  }
}

// ==============================================================================
// BASÄ°T GÃ–KSEL CÄ°SÄ°M MODELÄ°
// ==============================================================================

export interface SimpleCelestialBody {
  id: string
  name: string
  turkish_name: string        // TÃ¼rkÃ§e isim
  type: 'star' | 'planet' | 'dwarf_planet' | 'moon' | 'asteroid' | 'comet'
  
  // Temel Ã¶zellikler
  info: SimplePlanetInfo
  orbit: SimpleOrbit
  
  // GÃ¶rselleÅŸtirme
  color: string              // Ana renk
  texture_url?: string       // Doku dosyasÄ±
  has_clouds?: boolean       // Bulut katmanÄ± var mÄ±?
  
  // Ä°liÅŸkiler
  parent_id?: string         // Hangi gezegenin uydusu?
  moons?: string[]          // Uydu ID'leri
  
  // EÄŸitim iÃ§eriÄŸi
  description: string        // KÄ±sa aÃ§Ä±klama
  interesting_facts: string[] // Ä°lginÃ§ bilgiler
  
  // Tehdit değerlendirmesi (asteroitler için)
  threat_level?: 'Düşük' | 'Orta' | 'Yüksek'
  is_hazardous?: boolean
  orbital_data?: { [key: string]: any }
}

// ==============================================================================
// BASIT GÃœNEÅ SÄ°STEMÄ° VERÄ°LERÄ°
// ==============================================================================

export const SIMPLE_PLANETS: Record<string, SimpleCelestialBody> = {
  sun: {
    id: 'sun',
    name: 'Sun',
    turkish_name: 'GÃ¼neÅŸ',
    type: 'star',
    info: {
      radius_km: 695700,
      mass_relative_to_earth: 333000,
      gravity_relative_to_earth: 28,
      has_atmosphere: true,
      has_rings: false,
      moon_count: 0,
      surface_temp_celsius: { min: 5500, max: 5500, average: 5500 }
    },
    orbit: {
      distance_from_sun: 0,
      orbital_period_days: 0,
      rotation_period_hours: 609,
      tilt_degrees: 7.25
    },
    color: '#FFD700',
    description: 'GÃ¼neÅŸ sistemimizin merkezindeki yÄ±ldÄ±z',
    interesting_facts: [
      'GÃ¼neÅŸ sisteminin kÃ¼tlesinin %99.86\'sÄ±nÄ± oluÅŸturur',
      'Her saniye 600 milyon ton hidrojen helyuma dÃ¶nÃ¼ÅŸÃ¼r',
      'IÅŸÄ±ÄŸÄ±n GÃ¼neÅŸ\'ten DÃ¼nya\'ya ulaÅŸmasÄ± 8 dakika 20 saniye sÃ¼rer'
    ]
  },

  mercury: {
    id: 'mercury',
    name: 'Mercury',
    turkish_name: 'MerkÃ¼r',
    type: 'planet',
    info: {
      radius_km: 2440,
      mass_relative_to_earth: 0.055,
      gravity_relative_to_earth: 0.38,
      has_atmosphere: false,
      has_rings: false,
      moon_count: 0,
      surface_temp_celsius: { min: -173, max: 427, average: 167 }
    },
    orbit: {
      distance_from_sun: 0.39,
      orbital_period_days: 88,
      rotation_period_hours: 1408,
      tilt_degrees: 0.03
    },
    color: '#8C7853',
    texture_url: '/textures/mercury-surface.jpg',
    description: 'GÃ¼neÅŸ\'e en yakÄ±n gezegen',
    interesting_facts: [
      'GÃ¼neÅŸ sisteminin en kÃ¼Ã§Ã¼k gezegeni',
      'GÃ¼ndÃ¼z ve gece arasÄ±nda 600Â°C sÄ±caklÄ±k farkÄ± var',
      'Bir yÄ±lÄ± bir gÃ¼nÃ¼nden kÄ±sa (88 gÃ¼n yÄ±l, 176 gÃ¼n gÃ¼ndÃ¼z)'
    ]
  },

  venus: {
    id: 'venus',
    name: 'Venus',
    turkish_name: 'VenÃ¼s',
    type: 'planet',
    info: {
      radius_km: 6052,
      mass_relative_to_earth: 0.815,
      gravity_relative_to_earth: 0.91,
      has_atmosphere: true,
      has_rings: false,
      moon_count: 0,
      surface_temp_celsius: { min: 462, max: 462, average: 462 }
    },
    orbit: {
      distance_from_sun: 0.72,
      orbital_period_days: 225,
      rotation_period_hours: -5832, // Ters dÃ¶nÃ¼ÅŸ
      tilt_degrees: 177
    },
    color: '#FFC649',
    texture_url: '/textures/venus-surface.jpg',
    has_clouds: true,
    description: 'Sabah ve akÅŸam yÄ±ldÄ±zÄ±',
    interesting_facts: [
      'GÃ¼neÅŸ sisteminin en sÄ±cak gezegeni',
      'Ters yÃ¶nde dÃ¶ner (retrograd rotasyon)',
      'YoÄŸun CO2 atmosferi sera etkisi yaratÄ±r'
    ]
  },

  earth: {
    id: 'earth',
    name: 'Earth',
    turkish_name: 'DÃ¼nya',
    type: 'planet',
    info: {
      radius_km: 6371,
      mass_relative_to_earth: 1.0,
      gravity_relative_to_earth: 1.0,
      has_atmosphere: true,
      has_rings: false,
      moon_count: 1,
      surface_temp_celsius: { min: -89, max: 58, average: 15 }
    },
    orbit: {
      distance_from_sun: 1.0,
      orbital_period_days: 365.25,
      rotation_period_hours: 24,
      tilt_degrees: 23.4
    },
    color: '#6B93D6',
    texture_url: '/textures/earth-day.jpg',
    has_clouds: true,
    moons: ['moon'],
    description: 'Bilinen tek yaÅŸanabilir gezegen',
    interesting_facts: [
      'YÃ¼zeyinin %71\'i su ile kaplÄ±',
      'YaÅŸam iÃ§in ideal sÄ±caklÄ±k ve atmosfere sahip',
      'GÃ¼Ã§lÃ¼ manyetik alan radyasyondan koruyor'
    ]
  },

  mars: {
    id: 'mars',
    name: 'Mars',
    turkish_name: 'Mars',
    type: 'planet',
    info: {
      radius_km: 3390,
      mass_relative_to_earth: 0.107,
      gravity_relative_to_earth: 0.38,
      has_atmosphere: true,
      has_rings: false,
      moon_count: 2,
      surface_temp_celsius: { min: -87, max: -5, average: -63 }
    },
    orbit: {
      distance_from_sun: 1.52,
      orbital_period_days: 687,
      rotation_period_hours: 24.6,
      tilt_degrees: 25.2
    },
    color: '#CD5C5C',
    texture_url: '/textures/mars-surface.jpg',
    moons: ['phobos', 'deimos'],
    description: 'KÄ±zÄ±l gezegen',
    interesting_facts: [
      'Demir oksit nedeniyle kÄ±zÄ±l renkte',
      'GÃ¼neÅŸ sisteminin en bÃ¼yÃ¼k yanardaÄŸÄ± Olympus Mons burada',
      'KutuplarÄ±nda donmuÅŸ su ve kuru buz'
    ]
  },

  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    turkish_name: 'JÃ¼piter',
    type: 'planet',
    info: {
      radius_km: 69911,
      mass_relative_to_earth: 318,
      gravity_relative_to_earth: 2.36,
      has_atmosphere: true,
      has_rings: true,
      moon_count: 79,
      surface_temp_celsius: { min: -108, max: -108, average: -108 }
    },
    orbit: {
      distance_from_sun: 5.20,
      orbital_period_days: 4333,
      rotation_period_hours: 9.9,
      tilt_degrees: 3.1
    },
    color: '#D8CA9D',
    texture_url: '/textures/jupiter-surface.jpg',
    description: 'GÃ¼neÅŸ sisteminin dev gezegeni',
    interesting_facts: [
      'DiÄŸer tÃ¼m gezegenlerin toplam kÃ¼tlesinden daha aÄŸÄ±r',
      'BÃ¼yÃ¼k KÄ±rmÄ±zÄ± Leke 300 yÄ±ldÄ±r sÃ¼ren fÄ±rtÄ±na',
      'Asteroitleri Ã§ekerek DÃ¼nya\'yÄ± koruyor'
    ]
  },

  saturn: {
    id: 'saturn',
    name: 'Saturn',
    turkish_name: 'SatÃ¼rn',
    type: 'planet',
    info: {
      radius_km: 58232,
      mass_relative_to_earth: 95,
      gravity_relative_to_earth: 0.916,
      has_atmosphere: true,
      has_rings: true,
      moon_count: 82,
      surface_temp_celsius: { min: -139, max: -139, average: -139 }
    },
    orbit: {
      distance_from_sun: 9.54,
      orbital_period_days: 10759,
      rotation_period_hours: 10.7,
      tilt_degrees: 26.7
    },
    color: '#FAD5A5',
    texture_url: '/textures/saturn-surface.jpg',
    description: 'MuhteÅŸem halkalarÄ± olan gezegen',
    interesting_facts: [
      'Su Ã¼zerinde yÃ¼zebilecek kadar hafif',
      'HalkalarÄ± milyarlarca buz ve kaya parÃ§asÄ±ndan oluÅŸur',
      'Titan uydusu DÃ¼nya\'dan bÃ¼yÃ¼k'
    ]
  },

  uranus: {
    id: 'uranus',
    name: 'Uranus',
    turkish_name: 'UranÃ¼s',
    type: 'planet',
    info: {
      radius_km: 25362,
      mass_relative_to_earth: 14.5,
      gravity_relative_to_earth: 0.886,
      has_atmosphere: true,
      has_rings: true,
      moon_count: 27,
      surface_temp_celsius: { min: -197, max: -197, average: -197 }
    },
    orbit: {
      distance_from_sun: 19.19,
      orbital_period_days: 30687,
      rotation_period_hours: -17.2, // Ters dÃ¶nÃ¼ÅŸ
      tilt_degrees: 97.8
    },
    color: '#4FD0E7',
    texture_url: '/textures/uranus-surface.jpg',
    description: 'Yan yatmÄ±ÅŸ buzlu dev',
    interesting_facts: [
      'Yan yatarak dÃ¶ner (98Â° eÄŸim)',
      'Metan gazÄ± nedeniyle mavi-yeÅŸil renkte',
      'En soÄŸuk gezegen atmosferi'
    ]
  },

  neptune: {
    id: 'neptune',
    name: 'Neptune',
    turkish_name: 'NeptÃ¼n',
    type: 'planet',
    info: {
      radius_km: 24622,
      mass_relative_to_earth: 17.1,
      gravity_relative_to_earth: 1.13,
      has_atmosphere: true,
      has_rings: true,
      moon_count: 14,
      surface_temp_celsius: { min: -201, max: -201, average: -201 }
    },
    orbit: {
      distance_from_sun: 30.07,
      orbital_period_days: 60182,
      rotation_period_hours: 16.1,
      tilt_degrees: 28.3
    },
    color: '#4B70DD',
    texture_url: '/textures/neptune-surface.jpg',
    description: 'RÃ¼zgarlÄ± mavi dev',
    interesting_facts: [
      'GÃ¼neÅŸ sisteminin en rÃ¼zgarlÄ± gezegeni (2100 km/h)',
      'Matematiksel hesaplamalarla keÅŸfedilen ilk gezegen',
      'Triton uydusu ters yÃ¶nde dÃ¶nÃ¼yor'
    ]
  }
}

// ==============================================================================
// TEMEL UYDULAR
// ==============================================================================

export const SIMPLE_MOONS: Record<string, SimpleCelestialBody> = {
  moon: {
    id: 'moon',
    name: 'Moon',
    turkish_name: 'Ay',
    type: 'moon',
    parent_id: 'earth',
    info: {
      radius_km: 1737,
      mass_relative_to_earth: 0.012,
      gravity_relative_to_earth: 0.166,
      has_atmosphere: false,
      has_rings: false,
      moon_count: 0,
      surface_temp_celsius: { min: -173, max: 127, average: -23 }
    },
    orbit: {
      distance_from_sun: 1.0, // DÃ¼nya'nÄ±n etrafÄ±nda
      orbital_period_days: 27.3,
      rotation_period_hours: 655, // AynÄ± yÃ¼zÃ¼ gÃ¶sterir
      tilt_degrees: 6.7
    },
    color: '#C8C8C8',
    texture_url: '/textures/moon-surface.jpg',
    description: 'DÃ¼nya\'nÄ±n tek doÄŸal uydusu',
    interesting_facts: [
      'Her zaman aynÄ± yÃ¼zÃ¼nÃ¼ DÃ¼nya\'ya gÃ¶sterir',
      'DÃ¼nya\'dan uzaklaÅŸmaya devam ediyor',
      'Okyanus gelgitlerine neden olur'
    ]
  }
}

// ==============================================================================
// PERFORMANS OPTÄ°MÄ°ZASYONU Ä°Ã‡Ä°N AYARLAR
// ==============================================================================

export interface SimpleRenderSettings {
  quality: 'low' | 'medium' | 'high'
  show_orbits: boolean
  show_labels: boolean
  show_atmosphere: boolean
  animation_speed: number // 0.1 - 5.0
}

export const DEFAULT_RENDER_SETTINGS: SimpleRenderSettings = {
  quality: 'medium',
  show_orbits: true,
  show_labels: true,
  show_atmosphere: true,
  animation_speed: 1.0
}

// ==============================================================================
// KALÄ°TE PRESETS - BASITLEÅTIRILMIÅ
// ==============================================================================

export interface QualityPreset {
  name: string
  sphere_segments: number    // KÃ¼re geometrisi detayÄ±
  texture_size: number       // Doku Ã§Ã¶zÃ¼nÃ¼rlÃ¼ÄŸÃ¼
  effects_enabled: boolean   // Efektler aÃ§Ä±k mÄ±?
  max_fps: number           // Hedef FPS
}

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  low: {
    name: 'DÃ¼ÅŸÃ¼k',
    sphere_segments: 16,
    texture_size: 512,
    effects_enabled: false,
    max_fps: 30
  },
  medium: {
    name: 'Orta',
    sphere_segments: 32,
    texture_size: 1024,
    effects_enabled: true,
    max_fps: 60
  },
  high: {
    name: 'YÃ¼ksek',
    sphere_segments: 64,
    texture_size: 2048,
    effects_enabled: true,
    max_fps: 60
  }
}

// ==============================================================================
// SABIT DEÄERLER - BASITLEÅTIRILMIÅ
// ==============================================================================

export const SOLAR_SYSTEM_CONSTANTS = {
  AU_IN_KM: 149597870.7,           // 1 AU = km
  EARTH_RADIUS_KM: 6371,           // DÃ¼nya yarÄ±Ã§apÄ±
  LIGHT_SPEED_KMH: 1079252849000,  // IÅŸÄ±k hÄ±zÄ± km/h
  SECONDS_PER_DAY: 86400,          // Bir gÃ¼ndeki saniye
  
  // 3D gÃ¶sterim iÃ§in Ã¶lÃ§ekler
  DISTANCE_SCALE: 0.1,             // Mesafeleri kÃ¼Ã§Ã¼ltme oranÄ±
  SIZE_SCALE: 1000,                // BoyutlarÄ± bÃ¼yÃ¼tme oranÄ± (gÃ¶rÃ¼nÃ¼r olmasÄ± iÃ§in)
  TIME_SCALE: 365                  // Zaman hÄ±zlandÄ±rma
} as const

// ==============================================================================
// KAMERA VE KONTROL AYARLARI
// ==============================================================================

export interface CameraSettings {
  position: SimpleVector3D
  target: SimpleVector3D
  zoom_speed: number
  rotation_speed: number
  auto_rotate: boolean
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  position: { x: 0, y: 5, z: 10 },
  target: { x: 0, y: 0, z: 0 },
  zoom_speed: 1.0,
  rotation_speed: 0.5,
  auto_rotate: false
}

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

export const getTurkishPlanetName = (englishName: string): string => {
  const names: Record<string, string> = {
    'Mercury': 'MerkÃ¼r',
    'Venus': 'VenÃ¼s', 
    'Earth': 'DÃ¼nya',
    'Mars': 'Mars',
    'Jupiter': 'JÃ¼piter',
    'Saturn': 'SatÃ¼rn',
    'Uranus': 'UranÃ¼s',
    'Neptune': 'NeptÃ¼n',
    'Sun': 'GÃ¼neÅŸ',
    'Moon': 'Ay'
  }
  return names[englishName] || englishName
}

export const getPlanetColor = (planetId: string): string => {
  const planet = SIMPLE_PLANETS[planetId]
  return planet?.color || '#FFFFFF'
}

export const calculateDistance = (planet1: SimpleVector3D, planet2: SimpleVector3D): number => {
  const dx = planet1.x - planet2.x
  const dy = planet1.y - planet2.y
  const dz = planet1.z - planet2.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export const scaleForDisplay = (realValue: number, scale: number): number => {
  return realValue * scale
}

// ==============================================================================
// EXPORT HELPERS
// ==============================================================================

export type PlanetId = keyof typeof SIMPLE_PLANETS
export type MoonId = keyof typeof SIMPLE_MOONS

export const getAllCelestialBodies = (): SimpleCelestialBody[] => {
  return [
    ...Object.values(SIMPLE_PLANETS),
    ...Object.values(SIMPLE_MOONS)
  ]
}

export const getPlanetsByType = (type: SimpleCelestialBody['type']): SimpleCelestialBody[] => {
  return getAllCelestialBodies().filter(body => body.type === type)
}

// İhtiyaç duyulan alias exportlar - Updated with math constants
export const ASTRONOMICAL_CONSTANTS = {
  ...SOLAR_SYSTEM_CONSTANTS,
  DEGREES_TO_RADIANS: Math.PI / 180,
  RADIANS_TO_DEGREES: 180 / Math.PI,
  J2000_EPOCH: 2451545.0, // Julian day number for J2000.0 epoch
  GRAVITATIONAL_CONSTANT: 6.67430e-11, // m^3 kg^-1 s^-2
  SOLAR_MASS: 1.98847e30, // kg
  SOLAR_MU: 1.32712442076e20 // Standard gravitational parameter of the Sun (m^3/s^2)
} as const

export const SOLAR_SYSTEM_DATA = getAllCelestialBodies()

// Geriye dÃ¶nÃ¼k uyumluluk iÃ§in eski tipler
/**
 * @deprecated Yeni SimpleCelestialBody kullanÄ±n
 */
export interface CelestialBody extends SimpleCelestialBody {}

/**
 * @deprecated Yeni SimpleOrbit kullanÄ±n  
 */
export interface OrbitalElements extends SimpleOrbit {}

/**
 * @deprecated Yeni SimplePlanetInfo kullanÄ±n
 */
export interface PhysicalProperties extends SimplePlanetInfo {}

// Ana export
export default {
  SIMPLE_PLANETS,
  SIMPLE_MOONS,
  SOLAR_SYSTEM_CONSTANTS,
  DEFAULT_RENDER_SETTINGS,
  QUALITY_PRESETS
}  
  
// ==============================================================================   
// BACKWARD COMPATIBILITY EXPORTS   
// ==============================================================================   
  
// Vector3D export for OrbitalMechanicsEngine compatibility   
export type Vector3D = SimpleVector3D   
  
// OrbitalElements interface for OrbitalMechanicsEngine   
export interface OrbitalElements {   
  semiMajorAxis: number   
  eccentricity: number   
  inclination: number   
  longitudeOfAscendingNode: number   
  argumentOfPeriapsis: number   
  meanAnomalyAtEpoch: number   
  epoch: number   
  orbitalPeriod: number   
  meanMotion: number   
}   
  
// Extended CelestialBody with orbital property   
export interface CelestialBody extends SimpleCelestialBody {   
  orbital: OrbitalElements   
  physical?: {   
    radius: number   
    mass: number   
    density: number   
    gravity: number   
    escapeVelocity: number   
    rotationPeriod: number   
    axialTilt: number   
    albedo: number   
  }   
  atmosphere?: { hasAtmosphere: boolean }   
  textures?: {
    diffuse: string
    normal?: string
    specular?: string
    emissive?: string
    displacement?: string
    clouds?: string
    nightLights?: string
  }
}   
  
// Note: ASTRONOMICAL_CONSTANTS is already defined above to avoid duplication
