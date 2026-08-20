'use client'

/**
 * ============================================================================
 *  HUD — Telemetría (datos estratégicos)
 * ============================================================================
 *  Lecturas de solo lectura derivadas del snapshot del motor. Ningún cálculo
 *  de juego vive aquí: si un número hay que decidirlo, lo decide el modelo.
 * ============================================================================
 */

import { AMMO, muzzleSpeed } from '@/components/game-engine/ammunition'
import { useGameState } from '@/components/game-engine/game-provider'

/** Rumbo del viento en nomenclatura de brújula, para leerlo de un vistazo. */
function compass(direction: number): string {
  const deg = ((direction * 180) / Math.PI + 360) % 360
  const points = ['E', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE']
  return points[Math.round(deg / 45) % 8]
}

function Row({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'accent' | 'warn' }) {
  const toneClass =
    tone === 'accent' ? 'text-accent' : tone === 'warn' ? 'text-destructive' : 'text-foreground'
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className={`font-mono text-sm tabular-nums ${toneClass}`}>{value}</span>
    </div>
  )
}

export function Telemetry() {
  const state = useGameState()
  const ammo = AMMO[state.ammoId]
  const alive = state.targets.filter((t) => t.alive).length
  const accuracy = state.shotsFired > 0 ? Math.round((state.hits / state.shotsFired) * 100) : 0

  return (
    <section
      data-hud
      aria-label="Telemetría de tiro"
      className="w-60 border border-border bg-card/85 p-3 backdrop-blur-sm"
    >
      <header className="mb-2 flex items-center justify-between">
        <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-primary">
          Telemetría
        </h2>
        <span className="font-mono text-[0.65rem] text-muted-foreground">S-7</span>
      </header>

      <Row label="Alcance" value={state.rangefinder > 0 ? `${state.rangefinder.toFixed(0)} m` : '—'} tone="accent" />
      <Row
        label="Viento"
        value={`${state.wind.speed.toFixed(1)} m/s ${compass(state.wind.direction)}`}
        tone={state.wind.speed > 9 ? 'warn' : 'default'}
      />
      <Row label="Elevación" value={`${((state.aim.elevation * 180) / Math.PI).toFixed(1)}°`} />
      <Row label="Azimut" value={`${((state.aim.azimuth * 180) / Math.PI).toFixed(1)}°`} />
      <Row label="V. boca" value={`${muzzleSpeed(state.power, ammo).toFixed(0)} m/s`} />
      <Row label="Objetivos" value={`${alive} activos`} tone={alive > 0 ? 'default' : 'accent'} />
      <Row label="Precisión" value={`${accuracy}%`} />

      {/* Deriva prevista: la munición ligera acusa mucho más el viento. */}
      <p className="mt-2 border-t border-border/60 pt-2 font-mono text-[0.6rem] leading-relaxed text-muted-foreground">
        {ammo.code} · deriva {ammo.drag > 0.0015 ? 'ALTA' : ammo.drag > 0.0006 ? 'MEDIA' : 'BAJA'} ·
        radio {ammo.blastRadius} m
      </p>
    </section>
  )
}
