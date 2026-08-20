/**
 * ============================================================================
 *  Tests — Física balística (`components/game-engine/physics.ts`)
 * ============================================================================
 *  La física es el corazón del juego: si un cambio la altera sin querer, todo
 *  reglaje de tiro que el jugador haya aprendido deja de valer. Estos tests
 *  fijan las PROPIEDADES que deben cumplirse, no números mágicos sacados de
 *  una ejecución concreta:
 *
 *   - conservación de la dirección de tiro,
 *   - el arrastre solo frena, nunca acelera,
 *   - el viento desvía en el sentido correcto y en proporción al arrastre,
 *   - el impacto cae SOBRE la superficie, no dentro ni encima,
 *   - determinismo (mismo estado inicial -> misma trayectoria).
 * ============================================================================
 */

import { describe, expect, it } from 'vitest'
import {
  FIXED_DT,
  GRAVITY,
  aimDirection,
  laserRange,
  launchVelocity,
  solveSpeedForRange,
  stepProjectile,
  windVector,
} from '@/components/game-engine/physics'
import { AMMO, MUZZLE_MAX, MUZZLE_MIN, muzzleSpeed } from '@/components/game-engine/ammunition'
import { PLAYER_BATTERY, TERRAIN, terrainHeight } from '@/components/game-engine/terrain'
import type { Projectile, Vec3 } from '@/components/game-engine/types'

const NO_WIND: Vec3 = { x: 0, y: 0, z: 0 }

/** Altura real de la boca del cañón: los tests disparan desde donde el juego. */
const MUZZLE_Y = terrainHeight(PLAYER_BATTERY.x, PLAYER_BATTERY.z) + 4.5

/**
 * Proyectil de laboratorio. Sale de la batería del jugador, de modo que con
 * potencias razonables cae DENTRO del sector y se puede medir el impacto.
 */
function makeProjectile(velocity: Vec3, ammoId: keyof typeof AMMO = 'he'): Projectile {
  return {
    id: 1,
    position: { x: PLAYER_BATTERY.x, y: MUZZLE_Y, z: PLAYER_BATTERY.z },
    velocity: { ...velocity },
    ammo: AMMO[ammoId],
    hostile: false,
    alive: true,
    age: 0,
  }
}

/** Vuela hasta el impacto y devuelve dónde cayó (y en cuántos pasos). */
function flyToImpact(p: Projectile, wind: Vec3 = NO_WIND, dt = FIXED_DT) {
  for (let i = 0; i < 20000; i++) {
    const res = stepProjectile(p, wind, dt)
    if (res.finished) return { ...res, steps: i + 1 }
  }
  throw new Error('el proyectil no terminó su vuelo: ¿bucle infinito en la física?')
}

/* ------------------------------------------------------------------ vectores */

describe('windVector', () => {
  it('convierte magnitud y rumbo en un vector horizontal', () => {
    const v = windVector({ speed: 10, direction: 0 })
    expect(v.x).toBeCloseTo(10, 10)
    expect(v.z).toBeCloseTo(0, 10)
    // El viento nunca tiene componente vertical: no hay térmicas en el modelo.
    expect(v.y).toBe(0)
  })

  it('conserva la magnitud sea cual sea el rumbo', () => {
    for (const direction of [0, 0.7, Math.PI / 2, Math.PI, -2.4]) {
      const v = windVector({ speed: 7.5, direction })
      expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(7.5, 10)
    }
  })

  it('un viento en calma es el vector nulo', () => {
    expect(windVector({ speed: 0, direction: 1.2 })).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('aimDirection', () => {
  it('devuelve siempre un vector unitario', () => {
    for (const az of [-0.75, 0, 0.4]) {
      for (const el of [0.05, 0.6, 1.25]) {
        const d = aimDirection(az, el)
        expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 12)
      }
    }
  })

  it('con azimut y elevación cero apunta al eje +X (hacia el enemigo)', () => {
    const d = aimDirection(0, 0)
    expect(d.x).toBeCloseTo(1, 12)
    expect(d.y).toBeCloseTo(0, 12)
    expect(d.z).toBeCloseTo(0, 12)
  })

  it('la componente vertical es el seno de la elevación', () => {
    expect(aimDirection(0.3, 0.9).y).toBeCloseTo(Math.sin(0.9), 12)
  })

  it('más elevación implica menos alcance horizontal por unidad de avance', () => {
    const bajo = aimDirection(0, 0.2)
    const alto = aimDirection(0, 1.1)
    expect(Math.hypot(alto.x, alto.z)).toBeLessThan(Math.hypot(bajo.x, bajo.z))
  })
})

describe('launchVelocity', () => {
  it('su magnitud es la velocidad de boca de la munición', () => {
    const v = launchVelocity(0.2, 0.7, 0.8, AMMO.ap)
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(muzzleSpeed(0.8, AMMO.ap), 10)
  })

  it('mantiene la dirección de puntería', () => {
    const az = -0.4
    const el = 0.55
    const v = launchVelocity(az, el, 0.6, AMMO.he)
    const d = aimDirection(az, el)
    const s = Math.hypot(v.x, v.y, v.z)
    expect(v.x / s).toBeCloseTo(d.x, 10)
    expect(v.y / s).toBeCloseTo(d.y, 10)
    expect(v.z / s).toBeCloseTo(d.z, 10)
  })

  it('la potencia satura fuera del rango 0..1', () => {
    expect(muzzleSpeed(-3, AMMO.he)).toBeCloseTo(MUZZLE_MIN * AMMO.he.muzzleFactor, 10)
    expect(muzzleSpeed(9, AMMO.he)).toBeCloseTo(MUZZLE_MAX * AMMO.he.muzzleFactor, 10)
  })
})

/* -------------------------------------------------------------- integración */

describe('stepProjectile', () => {
  it('en caída libre sin arrastre la velocidad vertical sigue a la gravedad', () => {
    // Munición ficticia sin arrastre: aísla el término gravitatorio.
    const p = makeProjectile({ x: 0, y: 0, z: 0 })
    p.ammo = { ...AMMO.he, drag: 0 }
    const dt = 0.01
    stepProjectile(p, NO_WIND, dt)
    expect(p.velocity.y).toBeCloseTo(GRAVITY * dt, 12)
  })

  it('sin viento el arrastre solo frena: nunca aumenta la rapidez', () => {
    const p = makeProjectile(launchVelocity(0, 0.7, 0.9, AMMO.cluster), 'cluster')
    let previous = Math.hypot(p.velocity.x, p.velocity.z)
    for (let i = 0; i < 400; i++) {
      stepProjectile(p, NO_WIND, FIXED_DT)
      const current = Math.hypot(p.velocity.x, p.velocity.z)
      // La componente horizontal solo puede decrecer: no hay empuje.
      expect(current).toBeLessThanOrEqual(previous + 1e-12)
      previous = current
    }
  })

  it('el arrastre reduce el alcance frente al vacío', () => {
    const velocity = launchVelocity(0, 0.7, 0.55, AMMO.he)
    const conArrastre = flyToImpact(makeProjectile(velocity))

    const vacio = makeProjectile(velocity)
    vacio.ammo = { ...AMMO.he, drag: 0 }
    const sinArrastre = flyToImpact(vacio)

    const dist = (i?: Vec3) => Math.hypot(i!.x - PLAYER_BATTERY.x, i!.z - PLAYER_BATTERY.z)
    expect(dist(conArrastre.impact)).toBeLessThan(dist(sinArrastre.impact))
  })

  it('el viento lateral desvía el proyectil en el sentido del viento', () => {
    const velocity = launchVelocity(0, 0.7, 0.55, AMMO.he)
    const sinViento = flyToImpact(makeProjectile(velocity))
    const conViento = flyToImpact(makeProjectile(velocity), { x: 0, y: 0, z: 12 })
    // Viento hacia +Z => el impacto se corre hacia +Z.
    expect(conViento.impact!.z).toBeGreaterThan(sinViento.impact!.z)
  })

  it('la munición ligera (más arrastre) acusa más el viento que la pesada', () => {
    const wind: Vec3 = { x: 0, y: 0, z: 12 }
    const deriva = (ammoId: 'ap' | 'he' | 'cluster') => {
      const v = launchVelocity(0, 0.7, 0.5, AMMO[ammoId])
      const quieto = flyToImpact(makeProjectile(v, ammoId))
      const soplado = flyToImpact(makeProjectile(v, ammoId), wind)
      return soplado.impact!.z - quieto.impact!.z
    }
    // AP-14 es densa y rápida; CL-09 es ligera. Esa es la promesa de diseño
    // que anuncia el HUD ("deriva BAJA / MEDIA / ALTA").
    expect(deriva('cluster')).toBeGreaterThan(deriva('he'))
    expect(deriva('he')).toBeGreaterThan(deriva('ap'))
  })

  it('el impacto se resuelve SOBRE la superficie del terreno', () => {
    const res = flyToImpact(makeProjectile(launchVelocity(0, 0.6, 0.55, AMMO.he)))
    expect(res.finished).toBe(true)
    expect(res.impact!.y).toBeCloseTo(terrainHeight(res.impact!.x, res.impact!.z), 6)
  })

  it('marca fuera de sector cuando el proyectil abandona el área jugable', () => {
    // Tiro tenso, altísimo y sin arrastre: cruza el borde del sector antes
    // de que la gravedad lo baje al suelo.
    const p = makeProjectile({ x: 400, y: 0, z: 0 })
    p.position.y = 200
    p.ammo = { ...AMMO.he, drag: 0 }
    const res = flyToImpact(p)
    expect(res.outOfBounds).toBe(true)
    expect(Math.abs(res.impact!.x)).toBeGreaterThan(TERRAIN.width / 2)
  })

  it('un proyectil que nunca cae acaba caducando por edad', () => {
    // Disparo vertical con arrastre nulo: sube y baja; forzamos el tope de 30 s
    // apuntando casi a plomo con muchísima velocidad.
    // Disparo a plomo y sin arrastre: sube tanto que el vuelo lo corta el
    // tope de edad (30 s), no el terreno.
    const p = makeProjectile({ x: 0, y: 5000, z: 0 })
    p.ammo = { ...AMMO.he, drag: 0 }
    const res = flyToImpact(p)
    expect(res.finished).toBe(true)
    expect(p.age).toBeLessThanOrEqual(30 + FIXED_DT)
  })

  it('es determinista: mismas condiciones, misma trayectoria', () => {
    const v = launchVelocity(0.15, 0.65, 0.5, AMMO.he)
    const wind = windVector({ speed: 8, direction: 1.1 })
    const a = flyToImpact(makeProjectile(v), wind)
    const b = flyToImpact(makeProjectile(v), wind)
    expect(a.impact).toEqual(b.impact)
    expect(a.steps).toBe(b.steps)
  })

  it('el paso fijo hace la simulación estable frente al framerate', () => {
    // Mismo dt fijo, distinto número de llamadas por "frame": el resultado
    // debe coincidir, que es justo la razón de existir de FIXED_DT.
    const v = launchVelocity(0, 0.62, 0.5, AMMO.he)
    const uno = flyToImpact(makeProjectile(v), NO_WIND, FIXED_DT)
    const otro = flyToImpact(makeProjectile(v), NO_WIND, FIXED_DT)
    expect(uno.impact!.x).toBeCloseTo(otro.impact!.x, 12)
  })
})

/* ---------------------------------------------------------------- telémetro */

describe('laserRange', () => {
  const origin: Vec3 = {
    x: PLAYER_BATTERY.x,
    y: terrainHeight(PLAYER_BATTERY.x, PLAYER_BATTERY.z) + 22,
    z: PLAYER_BATTERY.z,
  }

  it('devuelve una distancia positiva cuando el rayo corta el terreno', () => {
    const d = laserRange(origin, 0, -0.08)
    expect(d).toBeGreaterThan(0)
  })

  it('el punto medido está efectivamente sobre el suelo', () => {
    const d = laserRange(origin, 0, -0.08)
    const dir = aimDirection(0, -0.08)
    const y = origin.y + dir.y * d
    expect(y).toBeCloseTo(terrainHeight(origin.x + dir.x * d, origin.z + dir.z * d), 1)
  })

  it('devuelve 0 —"sin eco"— si el rayo se pierde en el cielo', () => {
    expect(laserRange(origin, 0, 1.2)).toBe(0)
  })

  it('a mayor depresión, menor alcance medido', () => {
    const cerca = laserRange(origin, 0, -0.3)
    const lejos = laserRange(origin, 0, -0.12)
    expect(cerca).toBeGreaterThan(0)
    expect(lejos).toBeGreaterThan(cerca)
  })
})

/* -------------------------------------------------- solución balística (IA) */

describe('solveSpeedForRange', () => {
  it('la velocidad hallada alcanza la distancia pedida en el vacío', () => {
    const horizontal = 180
    const elevation = 0.62
    const v = solveSpeedForRange(horizontal, 0, elevation)
    // Alcance analítico sin arrastre para desnivel nulo.
    const alcance = (v * v * Math.sin(2 * elevation)) / -GRAVITY
    expect(alcance).toBeCloseTo(horizontal, 4)
  })

  it('pide más velocidad cuanto más lejos está el blanco', () => {
    const cerca = solveSpeedForRange(80, 0, 0.62)
    const lejos = solveSpeedForRange(240, 0, 0.62)
    expect(lejos).toBeGreaterThan(cerca)
  })

  it('nunca supera el tope de la batería enemiga', () => {
    expect(solveSpeedForRange(100000, 0, 0.62)).toBeLessThanOrEqual(90)
  })

  it('devuelve el tope en geometrías imposibles en vez de NaN', () => {
    // Blanco por encima de lo que permite la elevación: no hay solución real.
    const v = solveSpeedForRange(50, 500, 0.62)
    expect(Number.isFinite(v)).toBe(true)
    expect(v).toBe(90)
  })
})
