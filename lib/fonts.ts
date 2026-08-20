/**
 * Ruta pública de la tipografía que se dibuja DENTRO del canvas 3D.
 *
 * Vive en `lib/` (y no en `app/fonts.ts`) para que los componentes de cliente
 * puedan importar la constante sin arrastrar `next/font/local` al bundle.
 * La fuente se sirve desde `public/fonts/`: ver `app/fonts.ts`.
 */
export const MONO_TTF = '/fonts/GeistMono-Regular.ttf'
