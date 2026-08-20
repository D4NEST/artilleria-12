'use client'

/**
 * ============================================================================
 *  Composición raíz
 * ============================================================================
 *  Une las tres capas sin que ninguna conozca a las otras dos:
 *    Modelo/Controlador -> <GameProvider>  (GameEngine, TypeScript puro)
 *    Vista 3D           -> <SceneRoot>     (React Three Fiber)
 *    Vista 2D           -> <Hud>           (DOM)
 *    Entrada            -> usePlayerInput  (DOM -> comandos del motor)
 * ============================================================================
 */

import { GameProvider, useEngine, useViewMode } from './game-engine/game-provider'
import { Hud } from './hud/hud'
import { SceneRoot } from './three-scene/scene-root'
import { usePlayerInput } from '@/hooks/use-player-input'

function GameSurface() {
  const engine = useEngine()
  const { viewMode, setViewMode } = useViewMode()
  usePlayerInput(engine, viewMode, setViewMode)

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <SceneRoot />
      <Hud />
    </main>
  )
}

export function Game() {
  return (
    <GameProvider>
      <GameSurface />
    </GameProvider>
  )
}
