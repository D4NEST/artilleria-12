'use client'

/**
 * ============================================================================
 *  PUENTE Vista <-> Modelo
 * ============================================================================
 *  Único punto donde React "toca" el motor. Expone:
 *    - useEngine()    -> instancia del motor (comandos + lectura imperativa)
 *    - useGameState() -> snapshot reactivo vía useSyncExternalStore
 *    - useViewMode()  -> estado propio de la VISTA (dónde mira la cámara)
 *
 *  Nótese que `viewMode` NO vive en el motor: mirar por el periscopio es una
 *  decisión de presentación, no de reglas de juego.
 * ============================================================================
 */

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { GameEngine } from './engine'
import type { GameState } from './types'

/** Estaciones del cuarto de guerra a las que puede acercarse la cámara. */
export type ViewMode = 'room' | 'monitor' | 'periscope'

interface GameContextValue {
  engine: GameEngine
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  // Una sola instancia por montaje. El motor sobrevive a los re-renders.
  const engine = useMemo(() => new GameEngine(), [])
  const [viewMode, setViewMode] = useState<ViewMode>('room')

  // El motor nace con una semilla FIJA para que el HTML del servidor y el
  // primer render del cliente sean byte a byte iguales (si no, el viento
  // aleatorio provoca el clásico "Hydration failed"). Ya montados en el
  // navegador, se resiembra: cada partida real es distinta.
  useEffect(() => {
    engine.reseed(Date.now())
  }, [engine])

  const value = useMemo(() => ({ engine, viewMode, setViewMode }), [engine, viewMode])
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

function useGameContext() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameContext debe usarse dentro de <GameProvider>')
  return ctx
}

export function useEngine(): GameEngine {
  return useGameContext().engine
}

export function useViewMode() {
  const { viewMode, setViewMode } = useGameContext()
  return { viewMode, setViewMode }
}

/** Snapshot reactivo del estado del juego. */
export function useGameState(): GameState {
  const engine = useEngine()
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
}
