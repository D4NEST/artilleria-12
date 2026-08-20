/**
 * ============================================================================
 *  MODELO — IA de la batería enemiga
 * ============================================================================
 *  Extraído de `engine.ts` para que la IA sea:
 *
 *   - TESTEABLE: son funciones puras. Se les inyecta el estado y un `Rng`
 *     sembrado, así que un test puede afirmar exactamente dónde cae el
 *     proyectil enemigo.
 *   - EXTENSIBLE: el comportamiento vive en un `EnemyAiProfile`. Añadir un
 *     nivel de dificultad, un artillero que prefiera la torre o una batería
 *     que dispare en salva no obliga a tocar el motor.
 *
 *  El motor solo pregunta: «¿qué disparo hace el enemigo?» y recibe un plan.
 *  No sabe cómo se ha decidido.
 * ============================================================================
 */

import { AMMO } from './ammunition'
import { aimDirection, solveSpeedForRange, stepProjectile } from './physics'
import { terrainHeight } from './terrain'
import type { Rng } from './rng'
import type { AmmoSpec, Projectile, Target, Vec3 } from './types'

/* -------------------------------------------------------------- perfiles */

/** Cómo se comporta una batería enemiga. Cambiar esto cambia la dificultad. */
export interface EnemyAiProfile {
  id: string
  /** Elevación fija del tubo enemigo, en radianes. */
  elevation: number
  /** Dispersión (en metros) en el primer turno. */
  baseSpread: number
  /** Cuánto se estrecha la dispersión por cada turno transcurrido. */
  spreadPerTurn: number
  /** Suelo de dispersión: por bueno que sea, el artillero nunca es perfecto. */
  minSpread: number
  /**
   * Si es `true`, el artillero "corrige tiro": simula su propio disparo con
   * arrastre y viento y ajusta la carga. Si es `false` usa la solución
   * balística en vacío y siempre se queda corto (es el error del novato).
   */
  compensateDrag: boolean
  /** Velocidad máxima de boca de la batería enemiga (m/s). */
  maxSpeed: number
  /** Munición que emplea. */
  ammo: AmmoSpec
}

export const ENEMY_AI_PROFILES = {
  recluta: {
    id: 'recluta',
    elevation: 0.62,
    baseSpread: 34,
    spreadPerTurn: 3,
    minSpread: 10,
    compensateDrag: false,
    maxSpeed: 90,
    ammo: AMMO.he,
  },
  veterano: {
    id: 'veterano',
    // Perfil por defecto. Los números están calibrados CONTRA el radio de
    // daño del HE-72 (14 m): al corregir por arrastre la IA ya no se queda
    // corta siempre, así que con la dispersión original (4 m de suelo)
    // acertaba de pleno cada turno y el jugador moría en tres. Ahora falla a
    // menudo al principio y va afinando el tiro turno a turno.
    elevation: 0.62,
    baseSpread: 46,
    spreadPerTurn: 3,
    minSpread: 22,
    compensateDrag: true,
    maxSpeed: 110,
    ammo: AMMO.he,
  },
  elite: {
    id: 'elite',
    elevation: 0.7,
    baseSpread: 14,
    spreadPerTurn: 4,
    minSpread: 2,
    compensateDrag: true,
    maxSpeed: 130,
    ammo: AMMO.he,
  },
} as const satisfies Record<string, EnemyAiProfile>

export const DEFAULT_ENEMY_PROFILE: EnemyAiProfile = ENEMY_AI_PROFILES.veterano

/* ------------------------------------------------------------- selección */

/**
 * Qué batería enemiga abre fuego. Estrategia por defecto: la viva más cercana
 * al jugador, que es la que tendría línea de tiro real.
 */
export function selectShooter(targets: readonly Target[], playerPosition: Vec3): Target | null {
  let best: Target | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const t of targets) {
    if (!t.alive) continue
    const d = Math.hypot(t.position.x - playerPosition.x, t.position.z - playerPosition.z)
    if (d < bestDistance) {
      bestDistance = d
      best = t
    }
  }
  return best
}

/** Dispersión del artillero en el turno dado (metros). Nunca negativa. */
export function spreadForTurn(turn: number, profile: EnemyAiProfile): number {
  const raw = profile.baseSpread - Math.max(0, turn - 1) * profile.spreadPerTurn
  return Math.max(profile.minSpread, raw)
}

/** Punto al que apunta el artillero: el búnker más un error aleatorio. */
export function aimPointFor(
  playerPosition: Vec3,
  turn: number,
  profile: EnemyAiProfile,
  rng: Rng,
): Vec3 {
  const spread = spreadForTurn(turn, profile)
  const x = playerPosition.x + (rng() - 0.5) * spread
  const z = playerPosition.z + (rng() - 0.5) * spread
  return { x, y: terrainHeight(x, z), z }
}

/* ------------------------------------------------------ solución de tiro */

/** Boca del tubo enemigo: sobre la estructura, no dentro de ella. */
export function muzzleOf(shooter: Target): Vec3 {
  return { x: shooter.position.x, y: shooter.position.y + 4, z: shooter.position.z }
}

const MAX_SIM_STEPS = 4000

/**
 * Dispara "en seco": simula el proyectil con la MISMA física del juego y
 * devuelve dónde cae. Es lo que permite a la IA corregir por arrastre y
 * viento sin fórmulas cerradas (que no existen con arrastre cuadrático).
 */
export function simulateImpact(
  origin: Vec3,
  azimuth: number,
  elevation: number,
  speed: number,
  ammo: AmmoSpec,
  wind: Vec3,
  dt: number,
): Vec3 | null {
  const dir = aimDirection(azimuth, elevation)
  const probe: Projectile = {
    id: -1,
    position: { x: origin.x, y: origin.y, z: origin.z },
    velocity: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    ammo,
    hostile: true,
    alive: true,
    age: 0,
  }
  for (let i = 0; i < MAX_SIM_STEPS; i++) {
    const res = stepProjectile(probe, wind, dt)
    if (res.finished) return res.impact ?? null
  }
  return null
}

/**
 * Ajusta la carga por bisección hasta que el impacto simulado cae sobre el
 * punto de mira. Doce iteraciones bastan para bajar del metro de error y
 * cuestan menos que un frame.
 *
 * Es deliberadamente una "corrección de tiro" y no una fórmula: si mañana la
 * física cambia (viento en altura, densidad del aire), la IA se adapta sola.
 */
export function solveSpeedWithDrag(
  origin: Vec3,
  azimuth: number,
  elevation: number,
  targetDistance: number,
  ammo: AmmoSpec,
  wind: Vec3,
  maxSpeed: number,
  dt: number,
  iterations = 12,
): number {
  const rangeAt = (speed: number) => {
    const impact = simulateImpact(origin, azimuth, elevation, speed, ammo, wind, dt)
    if (!impact) return Number.POSITIVE_INFINITY // se fue del sector: pasado
    return Math.hypot(impact.x - origin.x, impact.z - origin.z)
  }

  let lo = 1
  let hi = maxSpeed
  // Si ni a tope llega, no hay nada que buscar: se dispara con todo.
  if (rangeAt(hi) < targetDistance) return hi

  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2
    if (rangeAt(mid) < targetDistance) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/* ------------------------------------------------------------ plan de tiro */

/** Todo lo que el motor necesita para materializar el disparo enemigo. */
export interface EnemyShotPlan {
  shooterId: string
  origin: Vec3
  aimPoint: Vec3
  azimuth: number
  elevation: number
  speed: number
  velocity: Vec3
  ammo: AmmoSpec
}

export interface EnemyShotInput {
  targets: readonly Target[]
  /** Posición del búnker del jugador (objetivo de la IA). */
  playerPosition: Vec3
  turn: number
  /** Viento YA convertido a vector (el motor lo tiene calculado). */
  wind: Vec3
  rng: Rng
  profile?: EnemyAiProfile
  /** Paso de integración de la simulación de puntería. */
  dt?: number
}

/**
 * Decide el disparo enemigo completo. Devuelve `null` si no queda ninguna
 * batería viva (el motor lo interpreta como "no hay respuesta").
 */
export function planEnemyShot(input: EnemyShotInput): EnemyShotPlan | null {
  const profile = input.profile ?? DEFAULT_ENEMY_PROFILE
  const dt = input.dt ?? 1 / 60

  const shooter = selectShooter(input.targets, input.playerPosition)
  if (!shooter) return null

  const origin = muzzleOf(shooter)
  const aimPoint = aimPointFor(input.playerPosition, input.turn, profile, input.rng)

  const dx = aimPoint.x - origin.x
  const dz = aimPoint.z - origin.z
  const horizontal = Math.hypot(dx, dz)
  const azimuth = Math.atan2(dz, dx)
  const elevation = profile.elevation

  const speed = profile.compensateDrag
    ? solveSpeedWithDrag(
        origin,
        azimuth,
        elevation,
        horizontal,
        profile.ammo,
        input.wind,
        profile.maxSpeed,
        dt,
      )
    : Math.min(
        profile.maxSpeed,
        solveSpeedForRange(horizontal, aimPoint.y - origin.y, elevation),
      )

  const dir = aimDirection(azimuth, elevation)
  return {
    shooterId: shooter.id,
    origin,
    aimPoint,
    azimuth,
    elevation,
    speed,
    velocity: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    ammo: profile.ammo,
  }
}
