'use client'

/**
 * ============================================================================
 *  CONTROLADOR DE ENTRADA (capa Vista)
 * ============================================================================
 *  Traduce eventos del navegador en COMANDOS del motor. El motor no sabe que
 *  existe un teclado o un ratón; si mañana añadimos gamepad o multijugador en
 *  red, solo se añade otro traductor como este.
 * ============================================================================
 */

import { useEffect, useRef } from 'react'
import type { GameEngine } from '@/components/game-engine/engine'
import type { ViewMode } from '@/components/game-engine/game-provider'

/** Sensibilidad del ratón al apuntar (radianes por píxel). */
const AIM_SENSITIVITY = 0.0016

/** Teclas de movimiento presionadas actualmente. */
interface MovementKeys {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  turretLeft: boolean
  turretRight: boolean
}

export function usePlayerInput(
  engine: GameEngine,
  viewMode: ViewMode,
  setViewMode: (m: ViewMode) => void,
) {
  const keys = useRef<MovementKeys>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    turretLeft: false,
    turretRight: false,
  })

  useEffect(() => {
    const isHud = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest('[data-hud]')

    const onKeyDown = (e: KeyboardEvent) => {
      // Manejar teclas de movimiento
      switch (e.code) {
        case 'KeyW':
          keys.current.forward = true
          e.preventDefault()
          return
        case 'KeyS':
          keys.current.backward = true
          e.preventDefault()
          return
        case 'KeyA':
          keys.current.left = true
          e.preventDefault()
          return
        case 'KeyD':
          keys.current.right = true
          e.preventDefault()
          return
        case 'ArrowLeft':
          keys.current.turretLeft = true
          e.preventDefault()
          return
        case 'ArrowRight':
          keys.current.turretRight = true
          e.preventDefault()
          return
      }

      // Manejar otras teclas
      switch (e.code) {
        case 'KeyV':
        case 'KeyP':
          // Alternar entre periscopio y vista externa
          if (viewMode === 'periscope') {
            setViewMode('external')
          } else {
            setViewMode('periscope')
          }
          break
        case 'Tab':
          e.preventDefault()
          // Alternar entre vista interna y externa
          if (viewMode === 'external') {
            setViewMode('room')
          } else {
            setViewMode('external')
          }
          break
        case 'KeyM':
          setViewMode('monitor')
          break
        case 'KeyR':
        case 'Escape':
          setViewMode('room')
          break
        case 'Digit1':
          engine.selectAmmo('he')
          break
        case 'Digit2':
          engine.selectAmmo('ap')
          break
        case 'Digit3':
          engine.selectAmmo('cluster')
          break
        case 'Space':
          e.preventDefault()
          if (!e.repeat) engine.startCharging()
          break
        case 'Enter':
          if (engine.getSnapshot().phase === 'gameover') engine.reset()
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      // Liberar teclas de movimiento
      switch (e.code) {
        case 'KeyW':
          keys.current.forward = false
          return
        case 'KeyS':
          keys.current.backward = false
          return
        case 'KeyA':
          keys.current.left = false
          return
        case 'KeyD':
          keys.current.right = false
          return
        case 'ArrowLeft':
          keys.current.turretLeft = false
          return
        case 'ArrowRight':
          keys.current.turretRight = false
          return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        engine.releaseAndFire()
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      // Solo se apunta mirando por el periscopio.
      if (viewMode !== 'periscope' || isHud(e.target)) return
      const dx = e.movementX || 0
      const dy = e.movementY || 0
      if (!dx && !dy) return
      engine.adjustAim(dx * AIM_SENSITIVITY, -dy * AIM_SENSITIVITY)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (isHud(e.target) || e.button !== 0) return
      if (viewMode === 'periscope') engine.startCharging()
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      engine.releaseAndFire()
    }

    // Loop de movimiento basado en deltaTime
    let lastTime = performance.now()
    let animationId: number | null = null

    const processMovement = () => {
      const now = performance.now()
      const dt = (now - lastTime) / 1000
      lastTime = now

      const state = engine.getSnapshot()
      
      // Solo procesar movimiento si estamos en fase de aiming y podemos movernos
      if (state.phase === 'aiming' && state.vehicle.canMove) {
        // Movimiento del chasis (WASD)
        if (keys.current.forward) {
          engine.moveForward(12 * dt)
        }
        if (keys.current.backward) {
          engine.moveBackward(12 * dt)
        }
        if (keys.current.left) {
          engine.rotateChassisLeft(1.2 * dt)
        }
        if (keys.current.right) {
          engine.rotateChassisRight(1.2 * dt)
        }
      }

      // Rotación de torreta (siempre disponible en aiming)
      if (state.phase === 'aiming') {
        if (keys.current.turretLeft) {
          engine.rotateTurretLeft(1.5 * dt)
        }
        if (keys.current.turretRight) {
          engine.rotateTurretRight(1.5 * dt)
        }
      }

      animationId = requestAnimationFrame(processMovement)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    
    // Iniciar loop de movimiento
    animationId = requestAnimationFrame(processMovement)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [engine, viewMode, setViewMode])
}