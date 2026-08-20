'use client'

/**
 * ============================================================================
 *  HUD — Capa 2D sobre la cabina
 * ============================================================================
 *  Deliberadamente mínima: los datos "diegéticos" (viento, potencia, munición)
 *  ya existen como instrumentos físicos en el cuarto. Este HUD es el cuaderno
 *  del artillero, no el juego.
 *
 *  Todo elemento clicable lleva `data-hud` para que `usePlayerInput` ignore el
 *  evento y no dispare el cañón al pulsar un botón de interfaz.
 * ============================================================================
 */

import { useEngine, useGameState, useViewMode, type ViewMode } from '@/components/game-engine/game-provider'
import { FireControl } from './fire-control'
import { Reticle } from './reticle'
import { Telemetry } from './telemetry'

const STATIONS: Array<{ mode: ViewMode; label: string; key: string }> = [
  { mode: 'room', label: 'Cabina', key: 'R' },
  { mode: 'monitor', label: 'Monitor', key: 'M' },
  { mode: 'periscope', label: 'Periscopio', key: 'V' },
]

function StationSwitch() {
  const { viewMode, setViewMode } = useViewMode()
  return (
    <nav data-hud aria-label="Estaciones del cuarto de guerra" className="flex gap-1">
      {STATIONS.map((s) => {
        const active = s.mode === viewMode
        return (
          <button
            key={s.mode}
            type="button"
            onClick={() => setViewMode(s.mode)}
            aria-pressed={active}
            className={`border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] transition-colors ${
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card/80 text-muted-foreground hover:border-primary/60 hover:text-foreground'
            }`}
          >
            {s.label}
            <span className="ml-1.5 opacity-60">[{s.key}]</span>
          </button>
        )
      })}
    </nav>
  )
}

/** Cartel de fin de partida. Único momento en que el HUD tapa la escena. */
function Outcome() {
  const engine = useEngine()
  const { phase, victory, turn, shotsFired, hits } = useGameState()
  if (phase !== 'gameover') return null

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div data-hud className="w-80 border border-border bg-card p-6 text-center">
        <h2
          className={`font-mono text-lg uppercase tracking-[0.25em] ${
            victory ? 'text-accent' : 'text-destructive'
          }`}
        >
          {victory ? 'Sector despejado' : 'Búnker perdido'}
        </h2>
        <p className="mt-3 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
          {turn} turnos · {shotsFired} disparos · {hits} impactos
        </p>
        <button
          type="button"
          onClick={() => engine.reset()}
          className="mt-5 w-full border border-primary bg-primary py-2 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground"
        >
          Nueva misión [Enter]
        </button>
      </div>
    </div>
  )
}

export function Hud() {
  const { viewMode } = useViewMode()

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <Reticle visible={viewMode === 'periscope'} />

      {/* Barra superior: identidad de la estación y cambio de puesto */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-primary">
            Batería 12 · Cuarto de guerra
          </p>
          <p className="mt-0.5 font-mono text-[0.6rem] tracking-[0.15em] text-muted-foreground">
            Artillería por turnos — Sector 7
          </p>
        </div>
        <StationSwitch />
      </div>

      {/* Columna izquierda: telemetría */}
      <div className="pointer-events-auto absolute bottom-4 left-4">
        <Telemetry />
      </div>

      {/* Columna derecha: control de tiro */}
      <div className="pointer-events-auto absolute bottom-4 right-4">
        <FireControl />
      </div>

      {/* Ayuda de controles, centrada y discreta */}
      <p className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 font-mono text-[0.6rem] leading-relaxed tracking-[0.12em] text-muted-foreground lg:block">
        RATÓN apuntar · ESPACIO cargar y soltar para disparar · 1-3 munición
      </p>

      <div className="pointer-events-auto">
        <Outcome />
      </div>
    </div>
  )
}
