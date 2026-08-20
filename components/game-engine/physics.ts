/**
 * ============================================================================
 *  MODELO — Física balística
 * ============================================================================
 *  Integrador semi-implícito (Euler simpléctico) con:
 *    a = g  -  k · |v - w| · (v - w)
 *  donde `w` es el viento. Al calcular el arrastre respecto a la velocidad
 *  RELATIVA al aire, el viento desvía la trayectoria de forma natural y en
 *  tiempo real, sin hacks.
 *
 *  Es determinista y muy barato (sin motor de físicas de cuerpo rígido), lo
 *  cual encaja con un juego por turnos y con equipos de bajo rendimiento.
 *  Si en el futuro se necesitan colisiones complejas (cannon-es / rapier),
 *  basta con sustituir ESTE archivo: nadie más conoce la implementación.
 * ============================================================================
 */

import type { AmmoSpec, Projectile, Vec3, Wind } from './types'
import { insideTerrain, terrainHeight } from './terrain'
import { muzzleSpeed } from './ammunition'

export const GRAVITY = -9.81
/** Paso fijo de simulación: garantiza el mismo resultado a 30 o 144 fps. */
export const FIXED_DT = 1 / 120

/** Convierte el viento (magnitud + rumbo) en vector cartesiano. */
export function windVector(wind: Wind): Vec3 {
  return {
    x: Math.cos(wind.direction) * wind.speed,
    y: 0,
    z: Math.sin(wind.direction) * wind.speed,
  }
}

/** Dirección unitaria del cañón a partir de azimut y elevación. */
export function aimDirection(azimuth: number, elevation: number): Vec3 {
  const ce = Math.cos(elevation)
  return {
    x: ce * Math.cos(azimuth),
    y: Math.sin(elevation),
    z: ce * Math.sin(azimuth),
  }
}

/** Velocidad inicial del proyectil. */
export function launchVelocity(
  azimuth: number,
  elevation: number,
  power: number,
  ammo: AmmoSpec,
): Vec3 {
  const dir = aimDirection(azimuth, elevation)
  const s = muzzleSpeed(power, ammo)
  return { x: dir.x * s, y: dir.y * s, z: dir.z * s }
}

export interface StepResult {
  /** El proyectil terminó su vuelo en este paso. */
  finished: boolean
  /** Punto de impacto (si finished). */
  impact?: Vec3
  /** Salió del área jugable. */
  outOfBounds?: boolean
}

/**
 * Avanza un proyectil un paso fijo. Muta el proyectil por rendimiento
 * (se ejecuta hasta 120 veces/segundo y no queremos presión sobre el GC).
 */
export function stepProjectile(p: Projectile, wind: Vec3, dt: number): StepResult {
  const k = p.ammo.drag
  // Velocidad relativa al aire.
  const rx = p.velocity.x - wind.x
  const ry = p.velocity.y - wind.y
  const rz = p.velocity.z - wind.z
  const rmag = Math.hypot(rx, ry, rz)

  const ax = -k * rmag * rx
  const ay = GRAVITY - k * rmag * ry
  const az = -k * rmag * rz

  p.velocity.x += ax * dt
  p.velocity.y += ay * dt
  p.velocity.z += az * dt

  const prevY = p.position.y
  const prevX = p.position.x
  const prevZ = p.position.z

  p.position.x += p.velocity.x * dt
  p.position.y += p.velocity.y * dt
  p.position.z += p.velocity.z * dt
  p.age += dt

  if (!insideTerrain(p.position.x, p.position.z) || p.age > 30) {
    return { finished: true, outOfBounds: true, impact: { ...p.position } }
  }

  const ground = terrainHeight(p.position.x, p.position.z)
  if (p.position.y <= ground) {
    // Interpolación lineal para clavar el impacto en la superficie.
    const prevGround = terrainHeight(prevX, prevZ)
    const d0 = prevY - prevGround
    const d1 = p.position.y - ground
    const t = d0 === d1 ? 0 : d0 / (d0 - d1)
    const impact: Vec3 = {
      x: prevX + (p.position.x - prevX) * t,
      y: prevY + (p.position.y - prevY) * t,
      z: prevZ + (p.position.z - prevZ) * t,
    }
    impact.y = terrainHeight(impact.x, impact.z)
    return { finished: true, impact }
  }

  return { finished: false }
}

/**
 * Telémetro láser: marcha un rayo desde el cañón hasta cortar el terreno.
 * Devuelve la distancia en metros (0 si el rayo se pierde en el cielo).
 */
export function laserRange(origin: Vec3, azimuth: number, elevation: number): number {
  const dir = aimDirection(azimuth, elevation)
  const step = 2
  const max = 900
  let prev = 0
  for (let d = step; d < max; d += step) {
    const x = origin.x + dir.x * d
    const y = origin.y + dir.y * d
    const z = origin.z + dir.z * d
    if (!insideTerrain(x, z)) return 0
    if (y <= terrainHeight(x, z)) {
      // Refinado por bisección para una lectura estable en el HUD.
      let lo = prev
      let hi = d
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2
        const my = origin.y + dir.y * mid
        const mh = terrainHeight(origin.x + dir.x * mid, origin.z + dir.z * mid)
        if (my <= mh) hi = mid
        else lo = mid
      }
      return hi
    }
    prev = d
  }
  return 0
}

/**
 * Solución balística aproximada (sin arrastre) para la IA enemiga:
 * dada una distancia horizontal y un desnivel, devuelve la velocidad
 * necesaria a una elevación fija. Suficiente para una IA que "corrige tiro".
 */
export function solveSpeedForRange(
  horizontal: number,
  heightDelta: number,
  elevation: number,
): number {
  const c = Math.cos(elevation)
  const s = Math.sin(elevation)
  const denom = 2 * c * c * (horizontal * (s / c) - heightDelta)
  if (denom <= 0) return MAX_AI_SPEED
  const v = Math.sqrt((-GRAVITY * horizontal * horizontal) / denom)
  return Math.min(MAX_AI_SPEED, v)
}

const MAX_AI_SPEED = 90
