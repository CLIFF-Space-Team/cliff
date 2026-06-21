'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Locale = 'tr' | 'en';

const dictionaries = {
  tr: {
    'app.name': 'CLIFF',
    'app.tagline': 'Kozmik seviye akıllı tahmin çerçevesi',
    'nav.dashboard': 'Mission Control',
    'nav.earth': 'Dünya Canlı',
    'nav.impact': 'Çarpma Simülatörü',
    'status.connected': 'Bağlı',
    'status.reconnecting': 'Yeniden bağlanıyor',
    'status.offline': 'Çevrimdışı',
    'threat.critical': 'Kritik',
    'threat.high': 'Yüksek',
    'threat.moderate': 'Orta',
    'threat.low': 'Düşük',
    'threat.minimal': 'Minimal',
    'threat.none': 'Yok',
    'panel.risk_snapshot': 'Risk Anlık Görünümü',
    'panel.alerts': 'Tehdit Uyarıları',
    'panel.watchlist': 'NEO İzleme Listesi',
    'cta.explain': 'Açıkla',
    'cta.refresh': 'Yenile',
    'cta.go_dashboard': 'Mission Control',
  },
  en: {
    'app.name': 'CLIFF',
    'app.tagline': 'Cosmic level intelligent forecast framework',
    'nav.dashboard': 'Mission Control',
    'nav.earth': 'Earth Live',
    'nav.impact': 'Impact Simulator',
    'status.connected': 'Connected',
    'status.reconnecting': 'Reconnecting',
    'status.offline': 'Offline',
    'threat.critical': 'Critical',
    'threat.high': 'High',
    'threat.moderate': 'Moderate',
    'threat.low': 'Low',
    'threat.minimal': 'Minimal',
    'threat.none': 'None',
    'panel.risk_snapshot': 'Risk Snapshot',
    'panel.alerts': 'Threat Alerts',
    'panel.watchlist': 'NEO Watchlist',
    'cta.explain': 'Explain',
    'cta.refresh': 'Refresh',
    'cta.go_dashboard': 'Mission Control',
  },
} as const;

type MessageKey = keyof (typeof dictionaries)['tr'];

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}

const Context = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  defaultLocale = 'tr',
}: {
  children: ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  const t = useCallback(
    (key: MessageKey): string => dictionaries[locale][key] ?? dictionaries.tr[key] ?? key,
    [locale],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, t],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLanguage() {
  const ctx = useContext(Context);
  if (ctx === null) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
