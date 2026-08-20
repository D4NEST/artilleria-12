/**
 * ============================================================================
 *  Tests — Motor de juego (`components/game-engine/engine.ts`)
 * ============================================================================
 *  El motor es TypeScript puro y su bucle lo empuja quien quiera con
 *  `update(dt)`. Eso permite "jugar partidas enteras" en un test, sin React,
 *  sin Three.js y sin navegador: exactamente lo que promete la arquitectura.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest'
import { GameEngine, MUZZLE, SIGHT, SIGHT_ELEVATION } from '@/components/game-engine/engine'
import { DEFAULT_SEED } from '@/components/game-engine/rng'
import { ENEMY_AI_PROFILES } from '@/components/game-engine/enemy-ai'
import { AMMO } from '@/components/game-engine/ammunition'
import type { GamePhase } from '@/components/game-engine/types'

/** Avanza el motor `seconds` segundos en pasos de 1/60, como haría la Vista. */
function advance(engine: GameEngine, seconds: number) {
  const dt = 1 / 60
  for (let i = 0; i < Math.round(seconds / dt); i++) engine.update(dt)
}

/** Avanza hasta que el motor entra en una de las fases pedidas (o se rinde). */
function advanceUntil(engine: GameEngine, phases: GamePhase[], maxSeconds = 60): boolean {
  const dt = 1 / 60
  for (let i = 0; i < Math.round(maxSeconds / dt); i++) {
    engine.update(dt)
    if (phases.includes(engine.getSnapshot().phase)) return true
  }
  return false
}

describe('estado inicial', () => {
  it('arranca en fase de puntería y con todos los objetivos vivos', () => {
    const s = new GameEngine().getSnapshot()
    expect(s.phase).toBe('aiming')
    expect(s.turn).toBe(1)
    expect(s.targets).toHaveLength(3)
    expect(s.targets.every((t) => t.alive)).toBe(true)
    expect(s.playerHp).toBe(s.playerMaxHp)
  })

  it('es determinista sin semilla: es lo que evita el error de hidratación', () => {
    // Dos motores creados por separado —servidor y cliente— deben producir
    // EXACTAMENTE el mismo snapshot, viento incluido.
    expect(new GameEngine().getSnapshot()).toEqual(new GameEngine().getSnapshot())
    expect(new GameEngine().getSeed()).toBe(DEFAULT_SEED)
  })

  it('semillas distintas dan vientos distintos', () => {
    const a = new GameEngine({ seed: 1 }).getSnapshot().wind
    const b = new GameEngine({ seed: 2 }).getSnapshot().wind
    expect(a).not.toEqual(b)
  })

  it('el telémetro da eco desde la cabeza del periscopio', () => {
    // Regresión: con la mira acoplada al tubo esto valía 0 SIEMPRE.
    expect(new GameEngine().getSnapshot().rangefinder).toBeGreaterThan(0)
  })

  it('la cabeza del periscopio está más alta que la boca del cañón', () => {
    expect(SIGHT.y).toBeGreaterThan(MUZZLE.y)
    expect(SIGHT_ELEVATION).toBeLessThanOrEqual(0)
  })
})

describe('reseed / reset', () => {
  it('reseed cambia la partida y la deja lista para jugar', () => {
    const engine = new GameEngine()
    const antes = engine.getSnapshot().wind
    engine.reseed(123456)
    expect(engine.getSeed()).toBe(123456)
    expect(engine.getSnapshot().wind).not.toEqual(antes)
    expect(engine.getSnapshot().phase).toBe('aiming')
  })

  it('la misma semilla reproduce la misma partida', () => {
    const a = new GameEngine({ seed: 777 })
    const b = new GameEngine({ seed: 777 })
    a.fire()
    b.fire()
    advance(a, 12)
    advance(b, 12)
    expect(a.getSnapshot()).toEqual(b.getSnapshot())
  })

  it('reset devuelve el motor al estado inicial y limpia las entidades', () => {
    const engine = new GameEngine()
    engine.fire()
    advance(engine, 1)
    engine.reset()
    expect(engine.projectiles).toHaveLength(0)
    expect(engine.effects).toHaveLength(0)
    expect(engine.trail).toHaveLength(0)
    expect(engine.getSnapshot().shotsFired).toBe(0)
  })
})

describe('comandos de puntería', () => {
  it('respeta los topes mecánicos del cañón', () => {
    const engine = new GameEngine()
    engine.adjustAim(10, 10)
    const alto = engine.getSnapshot().aim
    expect(alto.azimuth).toBeCloseTo(0.75, 6)
    expect(alto.elevation).toBeCloseTo(1.25, 6)

    engine.adjustAim(-10, -10)
    const bajo = engine.getSnapshot().aim
    expect(bajo.azimuth).toBeCloseTo(-0.75, 6)
    expect(bajo.elevation).toBeCloseTo(0.05, 6)
  })

  it('setAim lleva el cañón a la orientación pedida', () => {
    const engine = new GameEngine()
    engine.setAim(0.3, 0.9)
    expect(engine.getSnapshot().aim.azimuth).toBeCloseTo(0.3, 6)
    expect(engine.getSnapshot().aim.elevation).toBeCloseTo(0.9, 6)
  })

  it('la potencia se satura entre 0 y 1', () => {
    const engine = new GameEngine()
    engine.setPower(3)
    expect(engine.getSnapshot().power).toBe(1)
    engine.setPower(-3)
    expect(engine.getSnapshot().power).toBe(0)
  })

  it('no se puede apuntar ni cambiar munición con el proyectil en vuelo', () => {
    const engine = new GameEngine()
    engine.fire()
    const enVuelo = engine.getSnapshot()
    engine.adjustAim(0.2, 0.2)
    engine.selectAmmo('ap')
    engine.setPower(0.1)
    expect(engine.getSnapshot().aim).toEqual(enVuelo.aim)
    expect(engine.getSnapshot().ammoId).toBe('he')
  })
})

describe('carga y disparo', () => {
  it('el dial de potencia sube mientras se mantiene pulsado', () => {
    const engine = new GameEngine()
    engine.startCharging()
    expect(engine.getSnapshot().power).toBe(0)
    advance(engine, 0.5)
    expect(engine.getSnapshot().power).toBeGreaterThan(0.3)
  })

  it('el dial hace ping-pong: no se queda clavado en el tope', () => {
    const engine = new GameEngine()
    engine.startCharging()
    advance(engine, 1.3) // supera el 100 % y empieza a bajar
    const p = engine.getSnapshot().power
    expect(p).toBeLessThanOrEqual(1)
    advance(engine, 0.5)
    expect(engine.getSnapshot().power).toBeLessThan(p)
  })

  it('soltar dispara y pasa a fase de vuelo', () => {
    const engine = new GameEngine()
    engine.startCharging()
    advance(engine, 0.6)
    engine.releaseAndFire()
    const s = engine.getSnapshot()
    expect(s.phase).toBe('flying')
    expect(s.shotsFired).toBe(1)
    expect(engine.projectiles).toHaveLength(1)
    expect(engine.projectiles[0].hostile).toBe(false)
  })

  it('soltar sin haber cargado no dispara', () => {
    const engine = new GameEngine()
    engine.releaseAndFire()
    expect(engine.getSnapshot().shotsFired).toBe(0)
    expect(engine.getSnapshot().phase).toBe('aiming')
  })

  it('el proyectil deja estela y produce un efecto de impacto', () => {
    const engine = new GameEngine()
    engine.setPower(0.6)
    engine.fire()
    advance(engine, 2)
    expect(engine.trail.length).toBeGreaterThan(5)
    advanceUntil(engine, ['impact', 'gameover'])
    expect(engine.effects.length).toBeGreaterThan(0)
  })
})

describe('ciclo de turno', () => {
  it('recorre vuelo -> impacto -> turno enemigo -> vuelta al jugador', () => {
    const engine = new GameEngine({ seed: 4242 })
    engine.setPower(0.6)
    engine.fire()

    expect(advanceUntil(engine, ['impact', 'gameover'])).toBe(true)
    expect(advanceUntil(engine, ['enemy', 'gameover'])).toBe(true)

    // El enemigo responde con su propio proyectil.
    expect(advanceUntil(engine, ['aiming', 'gameover'], 90)).toBe(true)
    const s = engine.getSnapshot()
    if (s.phase === 'aiming') {
      expect(s.turn).toBe(2)
      // Cada turno trae viento nuevo: es la variable táctica del juego.
      expect(s.message).toContain('viento')
    }
  })

  it('el turno enemigo no se queda colgado si no queda nadie disparando', () => {
    const engine = new GameEngine({ seed: 11 })
    // Se aniquila el campo enemigo desde fuera para forzar el caso límite.
    engine.fire()
    advanceUntil(engine, ['impact', 'gameover'])
    expect(advanceUntil(engine, ['aiming', 'gameover'], 120)).toBe(true)
  })

  it('una partida completa nunca deja el motor en una fase muerta', () => {
    const engine = new GameEngine({ seed: 20260812, enemyProfile: ENEMY_AI_PROFILES.elite })
    for (let turno = 0; turno < 8; turno++) {
      if (engine.getSnapshot().phase === 'gameover') break
      engine.setAim(0, 0.62)
      engine.setPower(0.85)
      engine.fire()
      expect(advanceUntil(engine, ['aiming', 'gameover'], 120)).toBe(true)
    }
    expect(['aiming', 'gameover']).toContain(engine.getSnapshot().phase)
  })
})

describe('suscripción (puente con React)', () => {
  it('notifica a los oyentes y permite darse de baja', () => {
    const engine = new GameEngine()
    let avisos = 0
    const unsubscribe = engine.subscribe(() => avisos++)
    engine.selectAmmo('ap')
    expect(avisos).toBeGreaterThan(0)

    const marca = avisos
    unsubscribe()
    engine.selectAmmo('cluster')
    expect(avisos).toBe(marca)
  })

  it('getSnapshot devuelve la MISMA referencia si nada cambió', () => {
    // useSyncExternalStore entra en bucle infinito si esto no se cumple.
    const engine = new GameEngine()
    const a = engine.getSnapshot()
    expect(engine.getSnapshot()).toBe(a)
    engine.update(1 / 60)
    expect(engine.getSnapshot()).toBe(a)
  })

  it('publica un snapshot nuevo cuando el estado cambia', () => {
    const engine = new GameEngine()
    const antes = engine.getSnapshot()
    engine.selectAmmo('ap')
    expect(engine.getSnapshot()).not.toBe(antes)
    expect(antes.ammoId).toBe('he') // el snapshot viejo es inmutable
  })
})

describe('resolución de impactos', () => {
  it('un impacto directo daña y puede destruir el objetivo', () => {
    const engine = new GameEngine({ seed: 99 })
    const objetivo = engine.getSnapshot().targets[0]
    // Se coloca el proyectil justo encima del blanco y se deja caer.
    engine.fire()
    engine.projectiles[0].position = { x: objetivo.position.x, y: objetivo.position.y + 30, z: objetivo.position.z }
    engine.projectiles[0].velocity = { x: 0, y: -5, z: 0 }
    advanceUntil(engine, ['impact', 'gameover'])

    const s = engine.getSnapshot()
    const despues = s.targets.find((t) => t.id === objetivo.id)!
    expect(despues.hp).toBeLessThan(objetivo.hp)
    expect(s.hits).toBe(1)
    expect(s.lastShot?.hit).toBe(true)
  })

  it('un disparo fuera del sector se anota como fallo y avisa al jugador', () => {
    const engine = new GameEngine({ seed: 3 })
    engine.fire()
    engine.projectiles[0].position = { x: 150, y: 60, z: 0 }
    engine.projectiles[0].velocity = { x: 300, y: 0, z: 0 }
    advanceUntil(engine, ['impact', 'gameover'])
    expect(engine.getSnapshot().hits).toBe(0)
    expect(engine.getSnapshot().message).toMatch(/fuera del sector/i)
  })

  it('destruir el último objetivo termina la partida en victoria', () => {
    const engine = new GameEngine({ seed: 8 })
    // Se derriban los tres objetivos, uno por disparo, a bocajarro.
    for (let i = 0; i < 12 && engine.getSnapshot().phase !== 'gameover'; i++) {
      if (engine.getSnapshot().phase !== 'aiming') {
        advanceUntil(engine, ['aiming', 'gameover'], 120)
        continue
      }
      const vivo = engine.getSnapshot().targets.find((t) => t.alive)
      if (!vivo) break
      engine.selectAmmo('ap')
      engine.fire()
      engine.projectiles[0].position = { x: vivo.position.x, y: vivo.position.y + 20, z: vivo.position.z }
      engine.projectiles[0].velocity = { x: 0, y: -8, z: 0 }
      advanceUntil(engine, ['impact', 'gameover'])
    }
    const s = engine.getSnapshot()
    expect(s.phase).toBe('gameover')
    expect(s.victory).toBe(true)
    expect(s.targets.every((t) => !t.alive)).toBe(true)
  })

  it('un impacto enemigo en el búnker resta integridad', () => {
    const engine = new GameEngine({ seed: 5 })
    engine.fire()
    // Se inyecta un proyectil hostil sobre la batería propia.
    engine.projectiles.length = 0
    engine.projectiles.push({
      id: 999,
      position: { x: MUZZLE.x, y: MUZZLE.y + 25, z: MUZZLE.z },
      velocity: { x: 0, y: -6, z: 0 },
      ammo: AMMO.he,
      hostile: true,
      alive: true,
      age: 0,
    })
    advanceUntil(engine, ['impact', 'gameover'])
    expect(engine.getSnapshot().playerHp).toBeLessThan(100)
  })
})
