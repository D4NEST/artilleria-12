/**
 * ============================================================================
 *  CONTROLADOR — GameEngine
 * ============================================================================
 *  Núcleo del juego: turnos, viento, munición, física, IA y puntuación.
 *
 *  Reglas de la arquitectura (MVC / Hexagonal):
 *   1. El motor NO importa React ni Three.js. Es TypeScript puro y testeable.
 *   2. La Vista se suscribe a `subscribe()` y lee `getSnapshot()` para datos
 *      discretos (fase, turno, viento, HP...).
 *   3. Los datos que cambian 60 veces por segundo (posición del proyectil,
 *      estela, explosiones) se leen de forma IMPERATIVA desde `useFrame`,
 *      evitando re-renders de React por frame.
 *   4. El bucle lo empuja la Vista con `update(dt)`, así el motor no depende
 *      de requestAnimationFrame ni del navegador.
 * ============================================================================
 */

import { AMMO } from './ammunition'
import {
  FIXED_DT,
  aimDirection,
  laserRange,
  launchVelocity,
  solveSpeedForRange,
  stepProjectile,
  windVector,
} from './physics'
import { PLAYER_BATTERY, terrainHeight } from './terrain'
import type {
  Aim,
  AmmoId,
  GamePhase,
  GameState,
  ImpactEffect,
  Projectile,
  Target,
  Vec3,
} from './types'

/** Boca del cañón del jugador (origen de disparo y del telémetro). */
export const MUZZLE: Vec3 = {
  x: PLAYER_BATTERY.x,
  y: terrainHeight(PLAYER_BATTERY.x, PLAYER_BATTERY.z) + 4.5,
  z: PLAYER_BATTERY.z,
}

const AIM_LIMITS = {
  azimuth: 0.75, // ±43° de recorrido lateral
  elevationMin: 0.05,
  elevationMax: 1.25,
}

const CHARGE_RATE = 0.85 // potencia por segundo
const MAX_TRAIL = 320
const IMPACT_PAUSE = 1.5
const ENEMY_DELAY = 0.9

function createTargets(): Target[] {
  const defs: Array<{ id: string; x: number; z: number; kind: Target['kind']; hp: number }> = [
    { id: 'depot-a', x: 40, z: -38, kind: 'depot', hp: 100 },
    { id: 'tower-b', x: 92, z: 14, kind: 'tower', hp: 80 },
    { id: 'bunker-c', x: 126, z: -60, kind: 'bunker', hp: 130 },
  ]
  return defs.map((d) => ({
    id: d.id,
    kind: d.kind,
    position: { x: d.x, y: terrainHeight(d.x, d.z), z: d.z },
    radius: d.kind === 'tower' ? 5 : 7,
    hp: d.hp,
    maxHp: d.hp,
    alive: true,
  }))
}

function randomWind() {
  return {
    speed: 2 + Math.random() * 12,
    // Rumbo dominante lateral (±Z) con algo de componente frontal.
    direction: (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2) + (Math.random() - 0.5) * 1.4,
  }
}

export class GameEngine {
  // ---------------------------------------------------------------- estado
  private state: GameState
  private listeners = new Set<() => void>()
  /** Acumulador para volcar cambios continuos al snapshot a ~20 Hz. */
  private dirty = false
  private flushTimer = 0
  private accumulator = 0
  private phaseTimer = 0
  private nextId = 1
  private chargeDir = 1

  // Entidades "calientes": la Vista las lee cada frame sin pasar por React.
  readonly projectiles: Projectile[] = []
  readonly effects: ImpactEffect[] = []
  /** Estela del último proyectil (puntos en world space). */
  readonly trail: Vec3[] = []

  constructor() {
    this.state = this.initialState()
  }

  private initialState(): GameState {
    const aim: Aim = { azimuth: 0, elevation: 0.6 }
    return {
      phase: 'aiming',
      turn: 1,
      wind: randomWind(),
      aim,
      power: 0.55,
      charging: false,
      ammoId: 'he',
      targets: createTargets(),
      playerHp: 100,
      playerMaxHp: 100,
      shotsFired: 0,
      hits: 0,
      rangefinder: laserRange(MUZZLE, aim.azimuth, aim.elevation),
      lastShot: null,
      message: 'Batería lista. Use el periscopio para apuntar.',
      victory: false,
    }
  }

  // ------------------------------------------------------- store (Vista <->)
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = (): GameState => this.state

  /** Publica un nuevo snapshot inmutable. */
  private commit(patch: Partial<GameState>, immediate = true) {
    this.state = { ...this.state, ...patch }
    if (immediate) this.emit()
    else this.dirty = true
  }

  private emit() {
    this.dirty = false
    for (const fn of this.listeners) fn()
  }

  // ------------------------------------------------------------- comandos
  /** Ajuste relativo de puntería (mouse dentro del visor). */
  adjustAim(dAzimuth: number, dElevation: number) {
    if (this.state.phase !== 'aiming') return
    const azimuth = clamp(this.state.aim.azimuth + dAzimuth, -AIM_LIMITS.azimuth, AIM_LIMITS.azimuth)
    const elevation = clamp(
      this.state.aim.elevation + dElevation,
      AIM_LIMITS.elevationMin,
      AIM_LIMITS.elevationMax,
    )
    this.commit(
      { aim: { azimuth, elevation }, rangefinder: laserRange(MUZZLE, azimuth, elevation) },
      false,
    )
  }

  setAim(azimuth: number, elevation: number) {
    this.adjustAim(azimuth - this.state.aim.azimuth, elevation - this.state.aim.elevation)
  }

  setPower(power: number) {
    if (this.state.phase !== 'aiming') return
    this.commit({ power: clamp(power, 0, 1), charging: false }, false)
  }

  selectAmmo(ammoId: AmmoId) {
    if (this.state.phase !== 'aiming') return
    this.commit({ ammoId, message: `Munición ${AMMO[ammoId].code} cargada.` })
  }

  /** Empieza a "llenar" el dial de potencia (mantener pulsado). */
  startCharging() {
    if (this.state.phase !== 'aiming') return
    this.chargeDir = 1
    this.commit({ charging: true, power: 0 })
  }

  /** Suelta el dial y dispara con la potencia acumulada. */
  releaseAndFire() {
    if (this.state.phase !== 'aiming' || !this.state.charging) return
    this.commit({ charging: false })
    this.fire()
  }

  fire() {
    if (this.state.phase !== 'aiming') return
    const ammo = AMMO[this.state.ammoId]
    const { azimuth, elevation } = this.state.aim
    const dir = aimDirection(azimuth, elevation)

    this.trail.length = 0
    this.projectiles.length = 0
    this.projectiles.push({
      id: this.nextId++,
      // Sale ligeramente adelantado a la boca para no colisionar con el búnker.
      position: { x: MUZZLE.x + dir.x * 3, y: MUZZLE.y + dir.y * 3, z: MUZZLE.z + dir.z * 3 },
      velocity: launchVelocity(azimuth, elevation, this.state.power, ammo),
      ammo,
      hostile: false,
      alive: true,
      age: 0,
    })

    this.commit({
      phase: 'flying',
      shotsFired: this.state.shotsFired + 1,
      message: 'Proyectil en vuelo…',
    })
  }

  reset() {
    this.projectiles.length = 0
    this.effects.length = 0
    this.trail.length = 0
    this.phaseTimer = 0
    this.hostileResolved = false
    this.enemyFired = false
    this.state = this.initialState()
    this.emit()
  }

  // ---------------------------------------------------------------- bucle
  /**
   * Avanza la simulación. Lo llama la Vista (useFrame) pero el motor es
   * agnóstico: solo necesita el delta en segundos.
   */
  update(rawDt: number) {
    const dt = Math.min(rawDt, 0.05) // anti "spiral of death" al cambiar de pestaña
    const wind = windVector(this.state.wind)

    // 1. Carga de potencia (ping-pong: obliga a cronometrar el disparo).
    if (this.state.charging) {
      let p = this.state.power + CHARGE_RATE * this.chargeDir * dt
      if (p >= 1) {
        p = 1
        this.chargeDir = -1
      } else if (p <= 0) {
        p = 0
        this.chargeDir = 1
      }
      this.commit({ power: p }, false)
    }

    // 2. Física con paso fijo.
    this.accumulator += dt
    let guard = 0
    while (this.accumulator >= FIXED_DT && guard++ < 240) {
      this.accumulator -= FIXED_DT
      this.simulate(wind, FIXED_DT)
    }

    // 3. Efectos visuales (vida decreciente).
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt
      if (this.effects[i].life <= 0) this.effects.splice(i, 1)
    }

    // 4. Máquina de estados de turno.
    this.updatePhase(dt)

    // 5. Volcado de cambios continuos a ~20 Hz.
    this.flushTimer += dt
    if (this.dirty && this.flushTimer > 0.05) {
      this.flushTimer = 0
      this.emit()
    }
  }

  private simulate(wind: Vec3, dt: number) {
    for (const p of this.projectiles) {
      if (!p.alive) continue
      const res = stepProjectile(p, wind, dt)
      if (!p.hostile) this.pushTrail(p.position)
      if (res.finished) {
        p.alive = false
        this.resolveImpact(p, res.impact!, res.outOfBounds === true)
      }
    }
    if (this.projectiles.length && this.projectiles.every((p) => !p.alive)) {
      this.projectiles.length = 0
    }
  }

  private pushTrail(pos: Vec3) {
    const last = this.trail[this.trail.length - 1]
    if (!last || dist2(last, pos) > 4) {
      this.trail.push({ ...pos })
      if (this.trail.length > MAX_TRAIL) this.trail.shift()
    }
  }

  private resolveImpact(p: Projectile, impact: Vec3, outOfBounds: boolean) {
    this.effects.push({
      id: this.nextId++,
      position: { ...impact },
      radius: p.ammo.blastRadius,
      life: 1.1,
      maxLife: 1.1,
      hostile: p.hostile,
    })

    if (p.hostile) {
      // Daño al búnker del jugador.
      const d = Math.hypot(impact.x - MUZZLE.x, impact.z - MUZZLE.z)
      let hp = this.state.playerHp
      if (d < p.ammo.blastRadius) {
        hp = Math.max(0, hp - Math.round(p.ammo.damage * (1 - d / p.ammo.blastRadius)))
      }
      this.commit({
        playerHp: hp,
        message:
          d < p.ammo.blastRadius
            ? `¡Impacto enemigo a ${d.toFixed(0)} m! Integridad ${hp}%`
            : `Fallo enemigo a ${d.toFixed(0)} m del búnker.`,
      })
      this.phaseTimer = IMPACT_PAUSE
      this.hostileResolved = true
      this.commit({ phase: hp <= 0 ? 'gameover' : 'impact' })
      return
    }

    // Daño a objetivos enemigos por proximidad.
    let nearest = Number.POSITIVE_INFINITY
    let hit = false
    let destroyed = false
    const targets = this.state.targets.map((t) => {
      if (!t.alive) return t
      const d = Math.hypot(impact.x - t.position.x, impact.z - t.position.z)
      nearest = Math.min(nearest, d)
      if (d <= p.ammo.blastRadius + t.radius) {
        hit = true
        const falloff = 1 - Math.min(1, d / (p.ammo.blastRadius + t.radius))
        const hp = Math.max(0, t.hp - Math.round(p.ammo.damage * (0.35 + 0.65 * falloff)))
        if (hp <= 0) destroyed = true
        return { ...t, hp, alive: hp > 0 }
      }
      return t
    })

    const remaining = targets.filter((t) => t.alive).length
    this.commit({
      targets,
      hits: hit ? this.state.hits + 1 : this.state.hits,
      lastShot: {
        distanceToTarget: Number.isFinite(nearest) ? nearest : 0,
        hit,
        destroyed,
        impact: { ...impact },
      },
      message: outOfBounds
        ? 'Proyectil fuera del sector. Corrija potencia.'
        : destroyed
          ? `¡Objetivo destruido! Quedan ${remaining}.`
          : hit
            ? `Impacto confirmado a ${nearest.toFixed(0)} m del centro.`
            : `Fallo. Desvío de ${nearest.toFixed(0)} m.`,
    })

    if (remaining === 0) {
      this.commit({ phase: 'gameover', victory: true, message: 'Sector despejado. Misión cumplida.' })
      return
    }

    this.phaseTimer = IMPACT_PAUSE
    this.commit({ phase: 'impact' })
  }

  /**
   * Máquina de estados:
   *   aiming -> flying -> impact -> enemy -> (impacto hostil) impact -> aiming
   */
  private updatePhase(dt: number) {
    if (this.state.phase === 'impact') {
      this.phaseTimer -= dt
      if (this.phaseTimer > 0) return
      if (this.hostileResolved) {
        // Ya respondió el enemigo: devolvemos el control al jugador.
        this.hostileResolved = false
        this.beginPlayerTurn()
      } else {
        this.phaseTimer = ENEMY_DELAY
        this.enemyFired = false
        this.commit({ phase: 'enemy', message: 'La batería enemiga responde…' })
      }
      return
    }

    if (this.state.phase === 'enemy') {
      this.phaseTimer -= dt
      if (!this.enemyFired && this.phaseTimer <= 0) {
        this.enemyFired = true
        this.enemyFire()
      }
      return
    }
  }

  private hostileResolved = false
  private enemyFired = false

  /** IA sencilla: la batería enemiga viva más cercana dispara con error. */
  private enemyFire() {
    const shooter = this.state.targets.find((t) => t.alive)
    if (!shooter) return

    const origin: Vec3 = {
      x: shooter.position.x,
      y: shooter.position.y + 4,
      z: shooter.position.z,
    }
    // Apunta al búnker del jugador con dispersión decreciente por turno.
    const spread = Math.max(4, 26 - this.state.turn * 3)
    const aimX = MUZZLE.x + (Math.random() - 0.5) * spread
    const aimZ = MUZZLE.z + (Math.random() - 0.5) * spread
    const dx = aimX - origin.x
    const dz = aimZ - origin.z
    const horizontal = Math.hypot(dx, dz)
    const elevation = 0.62
    const speed = solveSpeedForRange(horizontal, terrainHeight(aimX, aimZ) - origin.y, elevation)
    const azimuth = Math.atan2(dz, dx)
    const dir = aimDirection(azimuth, elevation)

    this.projectiles.push({
      id: this.nextId++,
      position: { x: origin.x + dir.x * 2, y: origin.y + dir.y * 2, z: origin.z + dir.z * 2 },
      velocity: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      ammo: AMMO.he,
      hostile: true,
      alive: true,
      age: 0,
    })
    this.commit({ message: 'Fuego entrante. ¡Cúbrase!' })
  }

  private beginPlayerTurn() {
    this.commit({
      phase: 'aiming',
      turn: this.state.turn + 1,
      wind: randomWind(),
      power: 0.55,
      charging: false,
      message: 'Su turno. El viento ha cambiado.',
    })
  }
}

// --------------------------------------------------------------- utilidades
function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function dist2(a: Vec3, b: Vec3) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
}

/** Fase legible para el HUD. */
export const PHASE_LABEL: Record<GamePhase, string> = {
  aiming: 'APUNTANDO',
  flying: 'EN VUELO',
  impact: 'IMPACTO',
  enemy: 'TURNO ENEMIGO',
  gameover: 'FIN',
}
