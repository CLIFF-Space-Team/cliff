import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

import { DemoSpotlight } from '@/components/demo/DemoSpotlight';
import { DemoTour } from '@/components/demo/DemoTour';
import { StartDemoButton } from '@/components/demo/StartDemoButton';
import { AudioMuteToggle } from '@/components/effects/AudioMuteToggle';
import { ThreatAlertOrchestrator } from '@/components/effects/ThreatAlertOrchestrator';
import { PageNavMenu } from '@/components/layout/PageNavMenu';
import { PageviewTracker } from '@/components/PageviewTracker';
import { LanguageProvider } from '@/providers/LanguageProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { WebSocketProvider } from '@/providers/WebSocketProvider';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://notcome.app'),
  title: 'CLIFF — Cosmic Level Intelligent Forecast Framework',
  description:
    'Profesyonel asteroid tehdit izleme ve analiz platformu. NASA verisi, hibrit risk hesaplama ve gerçek zamanlı 3D görselleştirme.',
  // Next.js auto-resolves `app/icon.svg` and `app/apple-icon.svg` — these
  // explicit hints just keep the legacy .ico as a fallback for very old
  // browsers that don't read SVG favicons.
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CLIFF',
  },
  openGraph: {
    title: 'CLIFF — Asteroid Threat Monitoring',
    description: 'NASA-tabanlı, AI destekli, otonom asteroid tehdit platformu.',
    type: 'website',
    url: 'https://notcome.app',
    siteName: 'CLIFF',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLIFF — Asteroid Threat Monitoring',
    description: 'Asteroid tehdit izleme · NASA verisi · 3D mission control',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-surface-0 font-sans text-text-primary antialiased">
        <QueryProvider>
          <LanguageProvider>
            <WebSocketProvider>
              <Suspense fallback={null}>
                <PageviewTracker />
              </Suspense>
              <ThreatAlertOrchestrator />
              <PageNavMenu />
              <AudioMuteToggle />
              <StartDemoButton />
              <DemoTour />
              <DemoSpotlight />
              <div id="cliff-root" className="relative isolate">
                {children}
              </div>
              <Toaster
                theme="dark"
                position="top-right"
                toastOptions={{
                  className:
                    '!bg-surface-2 !border !border-white/10 !text-text-primary !shadow-panel',
                }}
              />
            </WebSocketProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
