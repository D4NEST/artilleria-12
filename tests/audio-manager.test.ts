/**
 * ============================================================================
 *  Tests — Reglas de audio (`components/game-engine/audio-manager.ts`)
 * ============================================================================
 *  El audio todavía no está integrado, pero SUS REGLAS ya lo están: qué suena
 *  y cuándo es una función pura sobre dos snapshots. Estos tests dejan esa
 *  parte cerrada para que integrar el reproductor sea trivial.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest'
import {
  createSilentAudioManager,
  createWebAudioManager,
  resolveAudioEvents,
  type AudioEventId,
} from '@/components/game-engine/audio-manager'
import { GameEngine } from '@/components/game-engine/engine'
import type { GameState } from '@/components/game-engine/types'

const BASE: GameState = new GameEngine({ seed: 1 }).getSnapshot()

const ids = (a: GameState, b: GameState): AudioEventId[] =>
  resolveAudioEvents(a, b).map((e) => e.id)

describe('resolveAudioEvents', () => {
  it('sin cambios no suena nada', () => {
    expect(resolveAudioEvents(BASE, BASE)).toEqual([])
  })

  it('anuncia el disparo propio', () => {
    expect(ids(BASE, { ...BASE, shotsFired: BASE.shotsFired + 1 })).toContain('shot')
  })

  it('anuncia el fuego entrante al empezar el turno enemigo', () => {
    expect(ids(BASE, { ...BASE, phase: 'enemy' })).toContain('incoming')
  })

  it('no repite el aviso mientras dura el turno enemigo', () => {
    const enemigo: GameState = { ...BASE, phase: 'enemy' }
    expect(ids(enemigo, enemigo)).not.toContain('incoming')
  })

  it('distingue impacto de fallo', () => {
    const impacto = { distanceToTarget: 3, hit: true, destroyed: false, impact: { x: 0, y: 0, z: 0 } }
    const fallo = { ...impacto, hit: false, distanceToTarget: 40 }
    expect(ids(BASE, { ...BASE, lastShot: impacto })).toContain('impactHit')
    expect(ids(BASE, { ...BASE, lastShot: fallo })).toContain('impactMiss')
  })

  it('añade el sonido de objetivo destruido sobre el de impacto', () => {
    const destruido = { distanceToTarget: 1, hit: true, destroyed: true, impact: { x: 0, y: 0, z: 0 } }
    const salida = ids(BASE, { ...BASE, lastShot: destruido })
    expect(salida).toContain('impactHit')
    expect(salida).toContain('targetDestroyed')
  })

  it('suena el búnker al recibir daño, y más fuerte cuanto más duele', () => {
    const leve = resolveAudioEvents(BASE, { ...BASE, playerHp: BASE.playerHp - 5 })
    const grave = resolveAudioEvents(BASE, { ...BASE, playerHp: BASE.playerHp - 45 })
    const gain = (list: ReturnType<typeof resolveAudioEvents>) =>
      list.find((e) => e.id === 'bunkerHit')!.gain!
    expect(gain(grave)).toBeGreaterThan(gain(leve))
  })

  it('la ganancia nunca se sale de 0..1', () => {
    const brutal = resolveAudioEvents(BASE, { ...BASE, playerHp: 0 })
    for (const e of brutal) {
      if (e.gain !== undefined) {
        expect(e.gain).toBeGreaterThanOrEqual(0)
        expect(e.gain).toBeLessThanOrEqual(1)
      }
    }
  })

  it('acompaña el cambio de munición y el nuevo turno', () => {
    expect(ids(BASE, { ...BASE, ammoId: 'ap' })).toContain('ammoSwitch')
    expect(ids(BASE, { ...BASE, turn: BASE.turn + 1 })).toContain('turnStart')
  })

  it('distingue victoria de derrota, y solo en la transición', () => {
    expect(ids(BASE, { ...BASE, phase: 'gameover', victory: true })).toContain('victory')
    expect(ids(BASE, { ...BASE, phase: 'gameover', victory: false })).toContain('defeat')
    const fin: GameState = { ...BASE, phase: 'gameover', victory: true }
    expect(ids(fin, fin)).not.toContain('victory')
  })

  it('encadena varios sonidos si varias cosas pasan a la vez', () => {
    const salida = ids(BASE, {
      ...BASE,
      shotsFired: BASE.shotsFired + 1,
      ammoId: 'cluster',
      turn: BASE.turn + 1,
    })
    expect(salida).toEqual(expect.arrayContaining(['shot', 'ammoSwitch', 'turnStart']))
  })
})

describe('managers', () => {
  it('el manager mudo cumple el contrato sin lanzar', async () => {
    const audio = createSilentAudioManager()
    expect(() => audio.play('shot')).not.toThrow()
    expect(() => audio.play({ id: 'victory', gain: 0.5 })).not.toThrow()
    await audio.unlock()
    audio.setVolume(0.3)
    audio.setMuted(true)
    expect(audio.isMuted()).toBe(true)
    audio.dispose()
  })

  it('sin navegador, el manager de WebAudio degrada a mudo sin romper', () => {
    // Este test corre en Node: `window` no existe. El juego debe seguir vivo.
    const audio = createWebAudioManager()
    expect(() => audio.play('shot')).not.toThrow()
    audio.dispose()
  })
})
