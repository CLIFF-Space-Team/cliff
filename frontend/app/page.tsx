import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { StartDemoHeroButton } from '@/components/demo/StartDemoButton';
import { Badge, Button } from '@/components/ui';

export default function HomePage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-surface-0 px-4 py-12 text-center">
      <div className="flex flex-col items-center gap-6 sm:gap-8">
        <Badge
          variant="ghost"
          className="font-mono-tnum text-[10px] uppercase tracking-[0.3em]"
        >
          v2.0 · asteroid threat platform
        </Badge>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-text-primary sm:text-5xl md:text-7xl">
          CLIFF
          <br />
          <span className="text-text-secondary">Mission Control</span>
        </h1>
        <p className="mx-auto max-w-md text-balance text-sm text-text-secondary sm:text-base">
          NASA verisi, hibrit risk skorlaması ve 3D görselleştirme ile asteroit
          tehdit izleme.
        </p>

        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="min-w-52">
            <Link id="cliff-hero-cta" href="/dashboard">
              Mission Control&apos;a Git
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {/* Otomatik tanıtım turu — sesli, ~5 dk, kiosk/etkinlik için. */}
          <StartDemoHeroButton />
        </div>
      </div>
    </main>
  );
}
