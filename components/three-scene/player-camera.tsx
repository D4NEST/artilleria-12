'use client'

/**
 * ============================================================================
 *  VISTA — Cámara del jugador (FPS dentro del cuarto de guerra)
 * ============================================================================
 *  La cámara son los ojos del artillero. Tres "estaciones" (room / monitor /
 *  periscope) definen una posición y un punto de mira; la transición entre
 *  ellas se interpola para que el movimiento se sienta corporal.
 *
 *  En `room` el jugador puede mirar alrededor libremente. En `periscope` la
 *  cabeza queda fija contra el ocular: el ratón pasa a mover el cañón (eso lo
 *  decide `usePlayerInput`, no este componente).
 * ============================================================================
 */

import { useEffect, useMemo, useRef } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ViewMode } from '@/components/game-engine/game-provider'

/** Estaciones de trabajo: desde dónde y hacia dónde mira el jugador. */
const STATIONS: Record<ViewMode, { position: THREE.Vector3; target: THREE.Vector3; fov: number }> = {
  room: {
    position: new THREE.Vector3(0, 1.68, 0.9),
    target: new THREE.Vector3(0, 1.75, -3.4),
    fov: 62,
  },
  monitor: {
    position: new THREE.Vector3(0, 2.05, -1.45),
    target: new THREE.Vector3(0, 2.05, -3.42),
    fov: 46,
  },
  periscope: {
    position: new THREE.Vector3(1.7, 1.62, -1.6),
    target: new THREE.Vector3(1.7, 1.62, -2.3),
    fov: 40,
  },
}

/** Amplitud del "mirar alrededor" con el ratón, en radianes. */
const LOOK_RANGE = { yaw: 0.55, pitch: 0.28 }

export function PlayerCamera({ viewMode }: { viewMode: ViewMode }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  /** Desviación de mirada deseada (normalizada -1..1). */
  const look = useRef({ x: 0, y: 0 })
  /** Valores suavizados que realmente se aplican a la cámara. */
  const smoothed = useRef({ x: 0, y: 0 })

  const position = useMemo(() => new THREE.Vector3().copy(STATIONS.room.position), [])
  const target = useMemo(() => new THREE.Vector3().copy(STATIONS.room.target), [])
  const desiredTarget = useMemo(() => new THREE.Vector3(), [])

  // Mirar alrededor: posición absoluta del puntero, no delta. Así no hace
  // falta capturar el cursor (pointer lock) para inspeccionar la cabina.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      look.current.x = (e.clientX / window.innerWidth) * 2 - 1
      look.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, dt) => {
    const cam = cameraRef.current
    if (!cam) return

    const station = STATIONS[viewMode]
    // Suavizado exponencial independiente del framerate.
    const ease = 1 - Math.exp(-6 * dt)
    const lookEase = 1 - Math.exp(-8 * dt)

    // En las estaciones acopladas la cabeza no vaga: se pega al instrumento.
    const freedom = viewMode === 'room' ? 1 : 0.12
    smoothed.current.x += (look.current.x * freedom - smoothed.current.x) * lookEase
    smoothed.current.y += (look.current.y * freedom - smoothed.current.y) * lookEase

    position.lerp(station.position, ease)

    // El punto de mira base de la estación, desplazado por la mirada libre.
    desiredTarget.copy(station.target)
    const forward = station.target.clone().sub(station.position)
    const distance = forward.length() || 1
    desiredTarget.x += Math.sin(smoothed.current.x * LOOK_RANGE.yaw) * distance
    desiredTarget.y += -Math.sin(smoothed.current.y * LOOK_RANGE.pitch) * distance

    target.lerp(desiredTarget, ease)
    cam.position.copy(position)
    cam.lookAt(target)

    if (Math.abs(cam.fov - station.fov) > 0.05) {
      cam.fov += (station.fov - cam.fov) * ease
      cam.updateProjectionMatrix()
    }
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={62} near={0.05} far={60} />
}
