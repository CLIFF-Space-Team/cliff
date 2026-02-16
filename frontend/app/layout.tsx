import './globals.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/providers/theme-provider'
import { QueryProvider } from '@/providers/query-provider'
import { WebSocketProvider } from '@/providers/websocket-provider'
import { LanguageProvider } from '@/providers/LanguageProvider'
import { AccessibilityProvider } from '@/providers/AccessibilityProvider'
export const metadata: Metadata = {
  title: 'CLIFF - Kozmik Seviye Akıllı Tahmin Çerçevesi | VERİCİLER Takımı',
  description: 'CLIFF, NASA verilerini ve yapay zeka teknolojilerini kullanarak Dünya\'yı tehdit eden kozmik cisimleri izleyen, analiz eden ve olası çarpışma senaryolarını simüle eden kapsamlı bir uzay tehdit izleme platformudur. VERİCİLER Takımı tarafından geliştirilmiştir.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'CLIFF - Gezegen Savunma ve Erken Uyarı Sistemi',
    description: 'NASA Space Apps Challenge 2025 Aksaray Birincisi. Yapay zeka destekli uzay tehdit izleme ve analiz platformu.',
    siteName: 'CLIFF - VERİCİLER Takımı',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLIFF - Kozmik Tehdit İzleme Platformu',
    description: 'NASA verileri ve yapay zeka ile uzay tehditlerini izleyin, analiz edin ve simüle edin.',
  },
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen bg-pure-black text-white overflow-x-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LanguageProvider>
            <QueryProvider>
              <AccessibilityProvider>
                <WebSocketProvider>
                  <div id="root" className="relative min-h-screen">
                    {children}
                  </div>
                </WebSocketProvider>
              </AccessibilityProvider>
            </QueryProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
