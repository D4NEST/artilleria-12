/**
 * ============================================================================
 *  Tests — IA enemiga (`components/game-engine/enemy-ai.ts`)
 * ============================================================================
 *  La IA se extrajo de `engine.ts` precisamente para poder escribir esto: al
 *  inyectarle un `Rng` sembrado, el "disparo aleatorio" del enemigo pasa a ser
 *  una función pura y se puede afirmar dónde cae el proyectil.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ENEMY_PROFILE,
  ENEMY_AI_PROFILES,
  type EnemyAiProfile,
  aimPointFor,
  muzzleOf,
  planEnemyShot,
  selectShooter,
  simulateImpact,
  solveSpeedWithDrag,
  spreadForTurn,
} from '@/components/game-engine/enemy-ai'
import { createRng } from '@/components/game-engine/rng'
import { AMMO } from '@/components/game-engine/ammunition'
import { PLAYER_BATTERY, terrainHeight } from '@/components/game-engine/terrain'
import type { Target, Vec3 } from '@/components/game-engine/types'

const PLAYER: Vec3 = {
  x: PLAYER_BATTERY.x,
  y: terrainHeight(PLAYER_BATTERY.x, PLAYER_BATTERY.z) + 4.5,
  z: PLAYER_BATTERY.z,
}

const NO_WIND: Vec3 = { x: 0, y: 0, z: 0 }

function target(id: string, x: number, z: number, alive = true): Target {
  return {
    id,
    kind: 'bunker',
    position: { x, y: terrainHeight(x, z), z },
    radius: 7,
    hp: alive ? 100 : 0,
    maxHp: 100,
    alive,
  }
}

const CAMPO: Target[] = [
  target('depot-a', 40, -38),
  target('tower-b', 92, 14),
  target('bunker-c', 126, -60),
]

/* ------------------------------------------------------------- selección */

describe('selectShooter', () => {
  it('elige la batería viva más cercana al jugador', () => {
    expect(selectShooter(CAMPO, PLAYER)?.id).toBe('depot-a')
  })

  it('ignora las baterías destruidas', () => {
    const campo = [target('depot-a', 40, -38, false), target('tower-b', 92, 14)]
    expect(selectShooter(campo, PLAYER)?.id).toBe('tower-b')
  })

  it('devuelve null cuando no queda ninguna viva', () => {
    expect(selectShooter([target('x', 40, 0, false)], PLAYER)).toBeNull()
  })

  it('devuelve null con el campo vacío', () => {
    expect(selectShooter([], PLAYER)).toBeNull()
  })
})

describe('muzzleOf', () => {
  it('sitúa la boca sobre la estructura, no dentro', () => {
    const t = target('a', 40, -38)
    expect(muzzleOf(t).y).toBeGreaterThan(t.position.y)
  })
})

/* ------------------------------------------------------------ dispersión */

describe('spreadForTurn', () => {
  const perfil = ENEMY_AI_PROFILES.veterano

  it('el artillero afina turno a turno', () => {
    expect(spreadForTurn(2, perfil)).toBeLessThan(spreadForTurn(1, perfil))
  })

  it('en el primer turno usa la dispersión base', () => {
    expect(spreadForTurn(1, perfil)).toBe(perfil.baseSpread)
  })

  it('nunca baja del suelo de dispersión, por muchos turnos que pasen', () => {
    expect(spreadForTurn(500, perfil)).toBe(perfil.minSpread)
  })

  it('el perfil élite dispersa menos que el recluta', () => {
    expect(spreadForTurn(3, ENEMY_AI_PROFILES.elite)).toBeLessThan(
      spreadForTurn(3, ENEMY_AI_PROFILES.recluta),
    )
  })
})

describe('aimPointFor', () => {
  it('el error de puntería cabe dentro de la dispersión declarada', () => {
    const perfil = ENEMY_AI_PROFILES.veterano
    const rng = createRng(99)
    const half = spreadForTurn(1, perfil) / 2
    for (let i = 0; i < 200; i++) {
      const p = aimPointFor(PLAYER, 1, perfil, rng)
      expect(Math.abs(p.x - PLAYER.x)).toBeLessThanOrEqual(half)
      expect(Math.abs(p.z - PLAYER.z)).toBeLessThanOrEqual(half)
    }
  })

  it('el punto de mira se apoya en el terreno', () => {
    const p = aimPointFor(PLAYER, 1, DEFAULT_ENEMY_PROFILE, createRng(7))
    expect(p.y).toBeCloseTo(terrainHeight(p.x, p.z), 10)
  })

  it('con la misma semilla apunta exactamente al mismo sitio', () => {
    const a = aimPointFor(PLAYER, 3, DEFAULT_ENEMY_PROFILE, createRng(4242))
    const b = aimPointFor(PLAYER, 3, DEFAULT_ENEMY_PROFILE, createRng(4242))
    expect(a).toEqual(b)
  })
})

/* --------------------------------------------------------- corrección de tiro */

describe('solveSpeedWithDrag', () => {
  const origin = muzzleOf(target('bunker-c', 126, -60))
  const azimuth = Math.atan2(PLAYER.z - origin.z, PLAYER.x - origin.x)
  const objetivo = Math.hypot(PLAYER.x - origin.x, PLAYER.z - origin.z)

  it('la carga hallada hace caer el proyectil sobre el blanco', () => {
    const dt = 1 / 60
    const v = solveSpeedWithDrag(origin, azimuth, 0.62, objetivo, AMMO.he, NO_WIND, 140, dt, 22)
    const impacto = simulateImpact(origin, azimuth, 0.62, v, AMMO.he, NO_WIND, dt)
    const alcance = Math.hypot(impacto!.x - origin.x, impacto!.z - origin.z)
    // Menos de 5 m de error a ~250 m: suficiente para que el radio de daño
    // del HE-72 (14 m) llegue al búnker del jugador.
    expect(Math.abs(alcance - objetivo)).toBeLessThan(5)
  })

  it('compensa el arrastre: pide más carga que la solución en vacío', () => {
    const dt = 1 / 60
    const conArrastre = solveSpeedWithDrag(
      origin, azimuth, 0.62, objetivo, AMMO.he, NO_WIND, 140, dt, 20,
    )
    const enVacio = solveSpeedWithDrag(
      origin, azimuth, 0.62, objetivo, { ...AMMO.he, drag: 0 }, NO_WIND, 140, dt, 20,
    )
    expect(conArrastre).toBeGreaterThan(enVacio)
  })

  it('satura en la carga máxima si el blanco queda fuera de alcance', () => {
    const v = solveSpeedWithDrag(origin, azimuth, 0.62, 100000, AMMO.he, NO_WIND, 140, 1 / 60)
    expect(v).toBe(140)
  })
})

/* ------------------------------------------------------------ plan de tiro */

describe('planEnemyShot', () => {
  const base = { targets: CAMPO, playerPosition: PLAYER, turn: 1, wind: NO_WIND }

  it('devuelve null si no queda ninguna batería enemiga', () => {
    const plan = planEnemyShot({ ...base, targets: [], rng: createRng(1) })
    expect(plan).toBeNull()
  })

  it('el disparo sale de la batería seleccionada', () => {
    const plan = planEnemyShot({ ...base, rng: createRng(1) })
    expect(plan!.shooterId).toBe('depot-a')
  })

  it('la velocidad inicial apunta hacia el jugador (componente -X)', () => {
    const plan = planEnemyShot({ ...base, rng: createRng(1) })
    // El jugador está en -X respecto de todas las baterías enemigas.
    expect(plan!.velocity.x).toBeLessThan(0)
    expect(plan!.velocity.y).toBeGreaterThan(0)
  })

  it('el módulo de la velocidad coincide con la carga calculada', () => {
    const plan = planEnemyShot({ ...base, rng: createRng(5) })
    const modulo = Math.hypot(plan!.velocity.x, plan!.velocity.y, plan!.velocity.z)
    expect(modulo).toBeCloseTo(plan!.speed, 8)
  })

  it('nunca excede la carga máxima del perfil', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const plan = planEnemyShot({ ...base, rng: createRng(seed) })
      expect(plan!.speed).toBeLessThanOrEqual(DEFAULT_ENEMY_PROFILE.maxSpeed)
    }
  })

  it('es reproducible con la misma semilla', () => {
    const a = planEnemyShot({ ...base, rng: createRng(31337) })
    const b = planEnemyShot({ ...base, rng: createRng(31337) })
    expect(a).toEqual(b)
  })

  it('el perfil que corrige por arrastre acierta mucho más que el que no', () => {
    const dt = 1 / 60
    const errorMedio = (profile: EnemyAiProfile) => {
      let suma = 0
      const n = 12
      for (let seed = 1; seed <= n; seed++) {
        const plan = planEnemyShot({ ...base, turn: 9, rng: createRng(seed), profile, dt })!
        const impacto = simulateImpact(
          plan.origin, plan.azimuth, plan.elevation, plan.speed, plan.ammo, NO_WIND, dt,
        )!
        suma += Math.hypot(impacto.x - PLAYER.x, impacto.z - PLAYER.z)
      }
      return suma / n
    }
    // Este es el bug de jugabilidad que arregla la refactorización: la IA
    // original disparaba con la fórmula del vacío y se quedaba SIEMPRE corta,
    // así que el jugador era invulnerable.
    expect(errorMedio(ENEMY_AI_PROFILES.veterano)).toBeLessThan(
      errorMedio(ENEMY_AI_PROFILES.recluta),
    )
  })

  it('en turnos avanzados el veterano cae dentro del radio de daño', () => {
    const dt = 1 / 60
    let cerca = 0
    for (let seed = 1; seed <= 20; seed++) {
      const plan = planEnemyShot({ ...base, turn: 12, rng: createRng(seed), dt })!
      const impacto = simulateImpact(
        plan.origin, plan.azimuth, plan.elevation, plan.speed, plan.ammo, NO_WIND, dt,
      )!
      if (Math.hypot(impacto.x - PLAYER.x, impacto.z - PLAYER.z) < AMMO.he.blastRadius) cerca++
    }
    // No hace falta que acierte siempre —la gracia es la dispersión— pero sí
    // que el jugador pueda perder la partida.
    expect(cerca).toBeGreaterThan(0)
  })
})
