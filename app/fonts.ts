/**
 * ============================================================================
 *  Tipografías auto-alojadas
 * ============================================================================
 *  Se sirven desde `public/fonts/` con `next/font/local` en lugar de
 *  `next/font/google` por dos razones:
 *
 *   1. `next/font/google` descarga la fuente EN TIEMPO DE BUILD. Sin red (CI
 *      aislado, proxy corporativo, avión) el build falla entero.
 *   2. El cuarto de guerra dibuja texto DENTRO del canvas 3D con troika
 *      (<Text> de drei), y troika necesita un fichero .ttf/.woff accesible por
 *      URL. Al alojar la fuente nosotros, el DOM y el 3D comparten la MISMA
 *      tipografía: `public/fonts/GeistMono-Regular.ttf`.
 * ============================================================================
 */

import localFont from 'next/font/local'

/** Oswald: rotulación condensada de estarcido militar para los titulares. */
export const display = localFont({
  src: [
    { path: '../public/fonts/Oswald-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Oswald-SemiBold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

/** Geist Mono: cifras tabulares para toda lectura de instrumento. */
export const mono = localFont({
  src: [{ path: '../public/fonts/GeistMono-Regular.woff2', weight: '400', style: 'normal' }],
  variable: '--font-instrument',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
})

export { MONO_TTF } from '@/lib/fonts'
