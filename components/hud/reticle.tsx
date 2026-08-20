'use client'

/**
 * ============================================================================
 *  HUD — Retículo del periscopio
 * ============================================================================
 *  Solo aparece cuando el jugador tiene el ojo pegado al ocular. La escala de
 *  elevación (mil-dots) se dibuja con divs: es más barato que geometría 3D y
 *  se mantiene nítido a cualquier resolución.
 * ============================================================================
 */

import { useGameState } from '@/components/game-engine/game-provider'

export function Reticle({ visible }: { visible: boolean }) {
  const { rangefinder, phase, aim } = useGameState()
  const locked = phase !== 'aiming'
  const elevationDeg = ((aim.elevation * 180) / Math.PI).toFixed(1)

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Viñeta circular del tubo óptico */}
      <div className="absolute inset-0 [background:radial-gradient(circle_at_center,transparent_38%,color-mix(in_oklch,var(--background)_92%,transparent)_78%)]" />

      <div className="relative h-64 w-64">
        {/* Cruz principal */}
        <div
          className={`absolute top-1/2 left-0 h-px w-full ${locked ? 'bg-destructive/70' : 'bg-accent/80'}`}
        />
        <div
          className={`absolute left-1/2 top-0 h-full w-px ${locked ? 'bg-destructive/70' : 'bg-accent/80'}`}
        />
        {/* Hueco central: deja ver el objetivo */}
        <div className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/60 bg-transparent" />

        {/* Escala de elevación (mil-dots) */}
        {[-3, -2, -1, 1, 2, 3].map((i) => (
          <div
            key={`v${i}`}
            className="absolute left-1/2 h-px w-3 -translate-x-1/2 bg-accent/70"
            style={{ top: `calc(50% + ${i * 22}px)` }}
          />
        ))}
        {[-3, -2, -1, 1, 2, 3].map((i) => (
          <div
            key={`h${i}`}
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-accent/50"
            style={{ left: `calc(50% + ${i * 22}px)` }}
          />
        ))}

        {/* Esquinas del encuadre */}
        {[
          'left-0 top-0 border-l border-t',
          'right-0 top-0 border-r border-t',
          'left-0 bottom-0 border-l border-b',
          'right-0 bottom-0 border-r border-b',
        ].map((cls) => (
          <div key={cls} className={`absolute size-5 border-primary/70 ${cls}`} />
        ))}

        {/* Lectura del telémetro, anclada bajo el retículo. La elevación va
            aquí porque la óptica está acoplada al horizonte: el tubo apunta
            más alto que la línea de mira y el artillero necesita el dato. */}
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-xs tracking-[0.2em] text-accent">
          {rangefinder > 0 ? `${rangefinder.toFixed(0)} M` : 'SIN ECO'}
          <span className="ml-3 text-primary">ELV {elevationDeg}°</span>
        </div>
      </div>
    </div>
  )
}
