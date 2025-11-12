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
  title: 'CLIFF - Cosmic Level Intelligent Forecast Framework',
  description: 'Advanced AI-powered space threat monitoring and analysis system',
  icons: {
    icon: '/favicon.ico',
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
