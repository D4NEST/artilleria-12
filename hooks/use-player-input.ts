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

import { useEffect } from 'react'
import type { GameEngine } from '@/components/game-engine/engine'
import type { ViewMode } from '@/components/game-engine/game-provider'

/** Sensibilidad del ratón al apuntar (radianes por píxel). */
const AIM_SENSITIVITY = 0.0016

export function usePlayerInput(
  engine: GameEngine,
  viewMode: ViewMode,
  setViewMode: (m: ViewMode) => void,
) {
  useEffect(() => {
    const isHud = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest('[data-hud]')

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyV':
        case 'KeyP':
          setViewMode('periscope')
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

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [engine, viewMode, setViewMode])
}
