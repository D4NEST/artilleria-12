'use client'

/**
 * ============================================================================
 *  PUENTE — React <-> Motor
 * ============================================================================
 *  Único punto donde React "toca" el motor de juego. El motor vive aquí y se
 *  expone a la Vista mediante un Context. La Vista NUNCA crea instancias del
 *  motor directamente.
 * ============================================================================
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { GameEngine } from './engine'
import type { GameState } from './types'

export type ViewMode = 'room' | 'monitor' | 'periscope' | 'external'

interface GameContextValue {
  engine: GameEngine
  state: GameState
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  // Instancia única del motor. Se crea UNA vez al montar el componente.
  const engine = useMemo(() => new GameEngine(), [])
  const [viewMode, setViewMode] = useState<ViewMode>('room')

  // La semilla se cambia en el cliente para evitar mismatch de hidratación.
  useEffect(() => {
    // Si la semilla no se ha cambiado, usa una aleatoria (solo en cliente).
    if (engine.getSeed() === 0) {
      engine.reseed(Math.floor(Math.random() * 1000000))
    }
  }, [engine])

  // Suscripción reactiva al motor. El motor notifica cuando hay cambios en
  // el snapshot (turno, impacto, etc.) pero NO cuando cambia la posición
  // del proyectil (eso se lee imperativamente).
  const state = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    engine.getSnapshot, // SSR: usar el mismo estado inicial
  )

  const value = useMemo(
    () => ({ engine, state, viewMode, setViewMode }),
    [engine, state, viewMode],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useEngine() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useEngine must be used within GameProvider')
  return ctx.engine
}

export function useGameState() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameState must be used within GameProvider')
  return ctx.state
}

export function useViewMode() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useViewMode must be used within GameProvider')
  return { viewMode: ctx.viewMode, setViewMode: ctx.setViewMode }
}