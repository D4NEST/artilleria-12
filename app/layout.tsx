import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { display, mono } from './fonts'
import './globals.css'

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
    // Las variables de fuente DEBEN colgar del <html>: sin esta clase las
    // familias declaradas en globals.css se quedan sin resolver y todo cae al
    // fallback del sistema (era el bug de "no se ve la GeistMono").
    <html lang="es" className={`${display.variable} ${mono.variable} bg-background`}>
      <body className="overflow-hidden font-mono antialiased">
        {children}
        {/* Solo en despliegues de Vercel: en un `next start` local el script
            no existe y ensucia la consola con un 404 en cada carga. */}
        {Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV) && <Analytics />}
      </body>
    </html>
  )
}
