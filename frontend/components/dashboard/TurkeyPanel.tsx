'use client';

import { CityStatusCard } from '@/components/turkey/CityStatusCard';
import { IssPassesWidget } from '@/components/turkey/IssPassesWidget';
import { ObservableNeosWidget } from '@/components/turkey/ObservableNeosWidget';
import { PressWidget } from '@/components/turkey/PressWidget';

/**
 * Türkiye odağı — şehir durumu, gözlemlenebilir NEO'lar, ISS geçişleri ve
 * basın. Eskiden dashboard ana görünümüne yığılıydı; artık tek bir sekmede
 * toplanarak ana ekran sakin tutuluyor.
 */
export function TurkeyPanel() {
  return (
    <div className="scrollbar-thin flex h-full flex-col gap-3 overflow-y-auto pr-0.5">
      <CityStatusCard />
      <ObservableNeosWidget />
      <IssPassesWidget />
      <PressWidget />
    </div>
  );
}
