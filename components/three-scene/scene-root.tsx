'use client'

/**
 * ============================================================================
 *  VISTA — Raíz de la escena
 * ============================================================================
 *  Aquí se cierra el circuito de la arquitectura:
 *
 *      usePlayerInput  ──comandos──▶  GameEngine  ──snapshot──▶  React
 *            ▲                            │
 *            │                            └──lectura por frame──▶ useFrame
 *          eventos DOM
 *
 *  <GameLoop> es el ÚNICO lugar que hace avanzar la simulación. Si mañana se
 *  sustituye Three.js por otro renderizador, basta con llamar a engine.update
 *  desde el nuevo bucle: el modelo no cambia.
 * ============================================================================
 */

import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, Preload } from '@react-three/drei'
import { useEngine, useViewMode } from '@/components/game-engine/game-provider'
import { PlayerCamera } from './player-camera'
import { WarRoom } from './war-room'

/** Empuja el reloj del motor. No renderiza nada. */
function GameLoop() {
  const engine = useEngine()
  useFrame((_, dt) => engine.update(dt))
  return null
}

export function SceneRoot() {
  const { viewMode } = useViewMode()

  return (
    <Canvas
      // Sin antialias y con DPR limitado: es lo que hace que esto vuele en
      // equipos modestos, coherente con el estilo low-poly.
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      shadows={false}
      flat
      onCreated={({ gl }) => {
        gl.setClearColor('#101215')
      }}
    >
      <GameLoop />
      <PlayerCamera viewMode={viewMode} />

      {/* Iluminación de la cabina: barata y de aspecto "consola militar".
          Subida respecto de la versión anterior: con 0.55 de ambiente los
          materiales Lambert oscuros del cuarto quedaban casi en negro y no se
          distinguía ni la consola ni los instrumentos. */}
      <ambientLight intensity={1.5} color="#8fa3b8" />
      <directionalLight position={[2, 4, 3]} intensity={1.1} color="#ffe6bd" />

      <WarRoom />

      <AdaptiveDpr pixelated />
      <Preload all />
    </Canvas>
  )
}
