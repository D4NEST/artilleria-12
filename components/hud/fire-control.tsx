'use client'

/**
 * ============================================================================
 *  HUD — Control de tiro
 * ============================================================================
 *  Barra de potencia + selector de munición + estado del turno.
 *
 *  La barra de potencia se lee del snapshot (que el motor vuelca a ~20 Hz):
 *  suficiente para una barra, y evita re-renderizar React 60 veces/segundo.
 * ============================================================================
 */

import { AMMO_LIST } from '@/components/game-engine/ammunition'
import { PHASE_LABEL } from '@/components/game-engine/engine'
import { useEngine, useGameState } from '@/components/game-engine/game-provider'

function PowerBar() {
  const { power, charging } = useGameState()
  const pct = Math.round(power * 100)

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Potencia
        </span>
        <span className="font-mono text-sm tabular-nums text-primary">{pct}%</span>
      </div>
      <div
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Potencia de disparo"
        className="relative h-4 w-full border border-border bg-secondary"
      >
        <div
          className={`h-full ${charging ? 'bg-primary' : 'bg-primary/60'}`}
          style={{ width: `${pct}%` }}
        />
        {/* Marcas cada 25%: referencia para memorizar reglajes de tiro. */}
        {[25, 50, 75].map((m) => (
          <div key={m} className="absolute top-0 h-full w-px bg-background/70" style={{ left: `${m}%` }} />
        ))}
      </div>
    </div>
  )
}

function AmmoSelector() {
  const engine = useEngine()
  const { ammoId, phase } = useGameState()
  const disabled = phase !== 'aiming'

  return (
    <div>
      <span className="mb-1 block font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        Munición
      </span>
      <div className="flex gap-1">
        {AMMO_LIST.map((ammo, i) => {
          const active = ammo.id === ammoId
          return (
            <button
              key={ammo.id}
              type="button"
              disabled={disabled}
              onClick={() => engine.selectAmmo(ammo.id)}
              title={ammo.description}
              className={`flex-1 border px-1.5 py-1 font-mono text-[0.65rem] tracking-wider transition-colors disabled:opacity-40 ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-secondary text-secondary-foreground hover:border-primary/60'
              }`}
            >
              <span className="block">{ammo.code}</span>
              <span className="block text-[0.55rem] opacity-70">{i + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function FireControl() {
  const engine = useEngine()
  const { phase, message, turn, playerHp, playerMaxHp } = useGameState()
  const canFire = phase === 'aiming'

  return (
    <section
      data-hud
      aria-label="Control de tiro"
      className="w-72 border border-border bg-card/85 p-3 backdrop-blur-sm"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-primary">
          Control de tiro
        </h2>
        <span
          className={`font-mono text-[0.65rem] tracking-[0.15em] ${
            phase === 'enemy' ? 'text-destructive' : 'text-accent'
          }`}
        >
          {PHASE_LABEL[phase]}
        </span>
      </header>

      <div className="flex flex-col gap-3">
        <PowerBar />
        <AmmoSelector />

        <button
          type="button"
          disabled={!canFire}
          // Mantener pulsado llena el dial; al soltar, dispara.
          onPointerDown={() => engine.startCharging()}
          onPointerUp={() => engine.releaseAndFire()}
          onPointerLeave={() => engine.releaseAndFire()}
          className="border border-primary bg-primary py-2 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
        >
          Mantener para cargar
        </button>

        {/* Integridad del búnker */}
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              Integridad
            </span>
            <span className="font-mono text-xs tabular-nums text-foreground">{playerHp}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary">
            <div
              className={playerHp > 40 ? 'h-full bg-accent' : 'h-full bg-destructive'}
              style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
            />
          </div>
        </div>

        <p className="border-t border-border/60 pt-2 font-mono text-[0.65rem] leading-relaxed text-foreground/80">
          <span className="text-muted-foreground">T{String(turn).padStart(2, '0')} · </span>
          {message}
        </p>
      </div>
    </section>
  )
}
