import { useQuery } from '@tanstack/react-query';
import { CelestialBody } from '@/types/astronomical-data';
const DISABLE_API_CALLS = true;
async function fetchSolarSystemData(): Promise<CelestialBody[]> {
  if (DISABLE_API_CALLS) {
    console.log('🚫 Solar System API çağrısı engellendi - mock veri modu');
    return Promise.resolve([]);
  }
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/v1/solar-system/bodies`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}
export function useSolarSystemData() {
  return useQuery<CelestialBody[], Error>({
    queryKey: ['solarSystemData'],
    queryFn: fetchSolarSystemData,
  });
}
