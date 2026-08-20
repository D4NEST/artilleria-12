import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Oswald, Geist_Mono } from 'next/font/google'
import './globals.css'

// Oswald: rotulación condensada de estarcido militar para los titulares.
const _display = Oswald({ subsets: ['latin'], weight: ['400', '600'] })
// Geist Mono: cifras tabulares para toda lectura de instrumento.
const _mono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Batería 12 — Artillería por turnos',
  description:
    'Juego de artillería por turnos en primera persona: dirige el fuego desde un cuarto de guerra low-poly, corrige por viento y despeja el Sector 7.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#191c20',
  // Es un juego a pantalla completa: el zoom por pinza estorba al apuntar.
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <body className="overflow-hidden antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
