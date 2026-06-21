/**
 * Impact physics — Collins/Holsapple/Glasstone scaling laws.
 *
 * This is the source of truth for the impact simulator — every result the UI
 * shows is computed here, client-side, as the user drags sliders. The backend
 * `POST /api/v1/impact/calculate` is an independent, simpler reference solver
 * (and a public API); this client model is intentionally richer
 * (airburst / ocean / tsunami / damage zones) and is not derived from it.
 *
 * References:
 *   - Collins, Melosh, Marcus (2005), "Earth Impact Effects Program"
 *   - Holsapple (1993), crater pi-scaling
 *   - Glasstone & Dolan (1977), nuclear weapon effects (overpressure / thermal)
 */

const JOULES_PER_MEGATON = 4.184e15;
const G = 9.81;
const HIROSHIMA_KT = 15;
const HIROSHIMA_MT = HIROSHIMA_KT / 1000;

export type Composition = 'iron' | 'stony' | 'carbonaceous' | 'icy';

export interface CompositionProfile {
  id: Composition;
  label: string;
  density_kg_m3: number;
  /** Atmospheric strength — higher = survives entry to ground impact. */
  strength_pa: number;
  description: string;
}

export const COMPOSITIONS: Record<Composition, CompositionProfile> = {
  iron: {
    id: 'iron',
    label: 'Demir',
    density_kg_m3: 7800,
    strength_pa: 5e7,
    description: 'M-tipi metalik. Atmosferden geçer, ağır krater açar.',
  },
  stony: {
    id: 'stony',
    label: 'Taşlı',
    density_kg_m3: 3000,
    strength_pa: 1e7,
    description: 'S-tipi silikat. En yaygın NEO sınıfı.',
  },
  carbonaceous: {
    id: 'carbonaceous',
    label: 'Karbonlu',
    density_kg_m3: 1500,
    strength_pa: 1e6,
    description: 'C-tipi rubble pile. Atmosferde dağılma eğilimi yüksek.',
  },
  icy: {
    id: 'icy',
    label: 'Buzul / Komet',
    density_kg_m3: 600,
    strength_pa: 1e5,
    description: 'Komet çekirdeği. Atmosferik patlama olasılığı çok yüksek.',
  },
};

export interface ImpactInput {
  diameterM: number;
  velocityKms: number;
  angleDeg: number;
  composition: Composition;
  /** Soft target (sediment) vs hard (crystalline rock). */
  targetType: 'sedimentary' | 'crystalline' | 'water';
  /** Geliş yönü — kuzeyden saat yönü açı, derece (0..360). Default: 90 (doğu).
   *  Fiziği etkilemez (görsel-only); crater elongation, ejecta butterfly,
   *  asimetrik termal halo bu değerden türetilir. */
  impactAzimuthDeg?: number;
}

export interface DamageRadius {
  label: string;
  /** km — distance at which this effect occurs. */
  radius_km: number;
  /** Short description of the effect. */
  description: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
}

export type ImpactMode = 'airburst' | 'crater' | 'ocean';

export interface ImpactResult {
  // Asteroid intrinsics
  mass_kg: number;
  energy_joules: number;
  energy_megatons: number;
  hiroshima_equivalents: number;

  // Atmospheric entry
  mode: ImpactMode;
  airburst_altitude_km: number | null;
  /** Energy fraction that reached the ground (0..1). */
  ground_coupling: number;

  // Crater (only if mode === 'crater')
  crater_diameter_km: number;
  crater_depth_km: number;
  crater_volume_km3: number;

  // Damage radii
  thermal_radius_km: number;       // 3rd-degree burns
  overpressure_5psi_km: number;    // total destruction
  overpressure_1psi_km: number;    // window damage
  seismic_magnitude: number;
  seismic_felt_radius_km: number;

  // Tsunami (only if ocean impact)
  tsunami_initial_wave_m: number;

  // Aggregated zones for UI
  damage_zones: DamageRadius[];

  // Reference scaling
  comparisons: ReferenceComparison[];

  // Verdict
  verdict: ImpactVerdict;

  /** Geliş azimut'u (input'tan paslandı; visual-only). 0..360°. */
  impact_azimuth_deg: number;
  /** Geliş açısı (input'tan paslandı; sahnede crater/ejecta asimetri için). */
  impact_angle_deg: number;
}

export interface ReferenceComparison {
  label: string;
  ratio: number;
  description: string;
}

export interface ImpactVerdict {
  severity: 'critical' | 'high' | 'moderate' | 'low';
  headline: string;
  detail: string;
}

const TARGET_DENSITIES: Record<ImpactInput['targetType'], number> = {
  sedimentary: 2500,
  crystalline: 2750,
  water: 1000,
};

export function calculateImpact(input: ImpactInput): ImpactResult {
  const profile = COMPOSITIONS[input.composition];
  const targetDensity = TARGET_DENSITIES[input.targetType];

  // 1. Mass + kinetic energy
  const radius_m = input.diameterM / 2;
  const volume_m3 = (4 / 3) * Math.PI * radius_m ** 3;
  const mass_kg = volume_m3 * profile.density_kg_m3;
  const velocity_ms = input.velocityKms * 1000;
  const energy_j = 0.5 * mass_kg * velocity_ms ** 2;
  const energy_mt = energy_j / JOULES_PER_MEGATON;

  // 2. Atmospheric breakup — Chyba/Thomas/Zahnle pancake model.
  //    Strength = profile.strength_pa, dynamic pressure breaks up at burst altitude.
  //    Approximation: airburst altitude scales with diameter and strength.
  //    Larger objects punch through; small/weak ones explode high.
  const sinAngle = Math.max(0.05, Math.sin((input.angleDeg * Math.PI) / 180));
  const breakup_dynamic_pressure_pa = profile.strength_pa;
  const sea_level_air_density = 1.225; // kg/m^3
  // Velocity at which break-up occurs (full velocity since we don't decelerate yet)
  const breakup_air_density = breakup_dynamic_pressure_pa / (velocity_ms ** 2);
  // Density profile: rho = rho0 * exp(-h / H), H ≈ 8000 m
  const scale_height_m = 8000;
  let burst_altitude_m =
    breakup_air_density >= sea_level_air_density
      ? 0
      : scale_height_m * Math.log(sea_level_air_density / Math.max(1e-9, breakup_air_density));
  burst_altitude_m = Math.max(0, burst_altitude_m);

  // Composition-aware airburst eligibility. Strong/large impactors always
  // reach the ground. Empirical thresholds calibrated against historical events
  // (Chelyabinsk 20 m airburst; Tunguska 60 m airburst; Meteor Crater 50 m
  // iron ground impact; Apophis 370 m stony → ground impact).
  const airburst_diameter_cap: Record<Composition, number> = {
    iron: 30,
    stony: 100,
    carbonaceous: 200,
    icy: 400,
  };
  const airburstEligible = input.diameterM <= airburst_diameter_cap[input.composition];

  let mode: ImpactMode = 'crater';
  let airburst_altitude_km: number | null = null;
  let ground_coupling = 1.0;

  if (airburstEligible && burst_altitude_m > input.diameterM * 5) {
    mode = 'airburst';
    airburst_altitude_km = burst_altitude_m / 1000;
    // Ground coupling decreases exponentially with burst altitude (Tunguska
    // burst at ~8 km had near-zero ground coupling).
    ground_coupling = Math.max(0.05, Math.exp(-burst_altitude_m / 6000));
  } else if (input.targetType === 'water' && !airburstEligible) {
    mode = 'ocean';
    ground_coupling = 0.6;
  }

  // 3. Crater (Holsapple π-scaling, ground impact only)
  let crater_d_m = 0;
  if (mode !== 'airburst') {
    crater_d_m =
      1.161 *
      Math.cbrt(profile.density_kg_m3 / targetDensity) *
      Math.pow(input.diameterM, 0.78) *
      Math.pow(velocity_ms, 0.44) *
      Math.pow(G, -0.22) *
      Math.pow(sinAngle, 0.33);
  }
  const crater_diameter_km = crater_d_m / 1000;
  const crater_depth_km = crater_diameter_km * 0.2;
  const crater_volume_km3 = (Math.PI / 6) * crater_diameter_km ** 2 * crater_depth_km;

  // 4. Thermal radiation (Glasstone scaling, 3rd-degree burn radius)
  const effective_mt = energy_mt * ground_coupling;
  const thermal_radius_km = 1.5 * Math.pow(Math.max(0.001, effective_mt), 0.41);

  // 5. Overpressure (Glasstone)
  //    5 psi: heavy structural damage, fatalities likely
  //    1 psi: window damage, light injuries
  const overpressure_5psi_km = 2.2 * Math.pow(Math.max(0.001, effective_mt), 0.33);
  const overpressure_1psi_km = 5.5 * Math.pow(Math.max(0.001, effective_mt), 0.33);

  // 6. Seismic
  const seismic_magnitude =
    energy_j > 0 ? Math.max(0, 0.67 * Math.log10(Math.max(1, energy_j * ground_coupling)) - 5.87) : 0;
  const seismic_felt_radius_km = Math.max(0, 100 * Math.pow(Math.max(0.001, effective_mt), 0.25));

  // 7. Tsunami (very simplified — initial wave height in deep ocean)
  let tsunami_initial_wave_m = 0;
  if (mode === 'ocean') {
    tsunami_initial_wave_m = Math.min(1000, 0.1 * Math.pow(effective_mt, 0.3) * input.diameterM ** 0.5);
  }

  // 8. Damage zones
  const damage_zones: DamageRadius[] = [];
  if (mode === 'crater' && crater_diameter_km > 0) {
    damage_zones.push({
      label: 'Krater',
      radius_km: crater_diameter_km / 2,
      description: 'Total vaporization',
      severity: 'critical',
    });
  }
  if (thermal_radius_km > 0.1) {
    damage_zones.push({
      label: 'Termal radyasyon',
      radius_km: thermal_radius_km,
      description: '3. derece yanık eşiği',
      severity: 'critical',
    });
  }
  if (overpressure_5psi_km > 0.1) {
    damage_zones.push({
      label: 'Aşırı basınç (5 psi)',
      radius_km: overpressure_5psi_km,
      description: 'Yapısal çöküş, ağır kayıp',
      severity: 'high',
    });
  }
  if (overpressure_1psi_km > 0.1) {
    damage_zones.push({
      label: 'Şok dalgası (1 psi)',
      radius_km: overpressure_1psi_km,
      description: 'Cam kırılması, hafif yaralanma',
      severity: 'moderate',
    });
  }
  if (seismic_felt_radius_km > 0.1) {
    damage_zones.push({
      label: 'Sismik hissedilme',
      radius_km: seismic_felt_radius_km,
      description: `M${seismic_magnitude.toFixed(1)} eşdeğeri sarsıntı`,
      severity: 'low',
    });
  }
  damage_zones.sort((a, b) => b.radius_km - a.radius_km);

  // 9. Reference comparisons
  const comparisons: ReferenceComparison[] = [
    {
      label: 'Hiroşima bombası',
      ratio: energy_mt / HIROSHIMA_MT,
      description: '15 kt TNT (1945)',
    },
    {
      label: 'Tunguska olayı',
      ratio: energy_mt / 12, // ~10-15 Mt estimated
      description: '1908 hava patlaması, ~12 Mt',
    },
    {
      label: 'Krakatoa volkanı',
      ratio: energy_mt / 200,
      description: '1883, ~200 Mt eşdeğeri',
    },
    {
      label: 'Tsar Bomba (en büyük H-bombası)',
      ratio: energy_mt / 50,
      description: '1961, 50 Mt',
    },
  ].filter((c) => c.ratio > 0.001);

  // 10. Verdict
  const verdict = makeVerdict(input, energy_mt, mode, airburst_altitude_km, damage_zones);

  return {
    mass_kg,
    energy_joules: energy_j,
    energy_megatons: round(energy_mt, 4),
    hiroshima_equivalents: round(energy_mt / HIROSHIMA_MT, 1),
    mode,
    airburst_altitude_km: airburst_altitude_km !== null ? round(airburst_altitude_km, 2) : null,
    ground_coupling: round(ground_coupling, 3),
    crater_diameter_km: round(crater_diameter_km, 3),
    crater_depth_km: round(crater_depth_km, 3),
    crater_volume_km3: round(crater_volume_km3, 4),
    thermal_radius_km: round(thermal_radius_km, 2),
    overpressure_5psi_km: round(overpressure_5psi_km, 2),
    overpressure_1psi_km: round(overpressure_1psi_km, 2),
    seismic_magnitude: round(seismic_magnitude, 2),
    seismic_felt_radius_km: round(seismic_felt_radius_km, 1),
    tsunami_initial_wave_m: round(tsunami_initial_wave_m, 1),
    damage_zones,
    comparisons,
    verdict,
    impact_azimuth_deg: ((input.impactAzimuthDeg ?? 90) % 360 + 360) % 360,
    impact_angle_deg: input.angleDeg,
  };
}

function makeVerdict(
  input: ImpactInput,
  energyMt: number,
  mode: ImpactMode,
  airburstKm: number | null,
  zones: DamageRadius[],
): ImpactVerdict {
  const largestRadius = zones[0]?.radius_km ?? 0;

  if (energyMt < 0.001) {
    return {
      severity: 'low',
      headline: 'Atmosferde yanıp tükeniyor',
      detail: 'Bu boyut ve hızdaki bir cisim atmosferde meteor olarak parçalanır; yer etkisi yok.',
    };
  }

  if (mode === 'airburst' && airburstKm !== null && airburstKm > 20) {
    if (energyMt < 1) {
      return {
        severity: 'low',
        headline: `Yüksek hava patlaması · ${airburstKm.toFixed(0)} km`,
        detail: 'Görsel/işitsel etki güçlü olabilir, yapısal hasar minimum. Chelyabinsk-tarzı.',
      };
    }
    return {
      severity: 'moderate',
      headline: `Hava patlaması · ${airburstKm.toFixed(0)} km irtifa`,
      detail: `~${largestRadius.toFixed(0)} km yarıçapında pencere kırılması ve hafif yaralanma riski. Tunguska-tarzı.`,
    };
  }

  if (energyMt < 1) {
    return {
      severity: 'moderate',
      headline: 'Bölgesel hasar',
      detail: `~${largestRadius.toFixed(0)} km yarıçapta termal/şok etkisi. Yerleşim alanı varsa tahliye.`,
    };
  }

  if (energyMt < 100) {
    return {
      severity: 'high',
      headline: 'Ağır bölgesel felaket',
      detail: `Şehir ölçeğinde yıkım. Tahliye + uluslararası yardım gerekir.`,
    };
  }

  if (energyMt < 100_000) {
    return {
      severity: 'critical',
      headline: 'Kıtasal yıkım',
      detail: 'Iklim etkileri olası (toz, soğuma). Küresel acil durum.',
    };
  }

  return {
    severity: 'critical',
    headline: 'Yok-oluş seviyesi olay',
    detail: 'K-Pg sınırı (Chicxulub) seviyesi. Kitlesel canlı yok oluşu beklenir.',
  };
}

function round(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
