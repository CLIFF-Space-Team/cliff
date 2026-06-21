'use client';

import {
  Activity,
  AlertCircle,
  CloudLightning,
  Droplets,
  Factory,
  Flame,
  type LucideIcon,
  Mountain,
  MountainSnow,
  Snowflake,
  Sun,
  ThermometerSun,
  Waves,
  Wind,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  flame: Flame,
  activity: Activity,
  'mountain-snow': MountainSnow,
  mountain: Mountain,
  'cloud-lightning': CloudLightning,
  droplets: Droplets,
  sun: Sun,
  'thermometer-sun': ThermometerSun,
  snowflake: Snowflake,
  wind: Wind,
  factory: Factory,
  waves: Waves,
};

interface EventCategoryIconProps {
  /** `EarthCategoryMeta.icon` — Lucide icon name. */
  icon: string;
  className?: string;
  size?: number;
}

/**
 * Resolves a category icon name into a Lucide component. Falls back to a
 * neutral alert circle for any unmapped icon.
 */
export function EventCategoryIcon({ icon, className, size = 16 }: EventCategoryIconProps) {
  const Component = ICON_MAP[icon] ?? AlertCircle;
  return <Component className={className} size={size} aria-hidden="true" />;
}
