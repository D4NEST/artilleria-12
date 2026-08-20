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
  DEFAULT_ENEMY_PROFILE,
  type EnemyAiProfile,
  type EnemyShotPlan,
  planEnemyShot,
} from './enemy-ai'
import {
  FIXED_DT,
  aimDirection,
  laserRange,
  launchVelocity,
  stepProjectile,
  windVector,
} from './physics'
import { DEFAULT_SEED, type Rng, createRng } from './rng'
import { PLAYER_BATTERY, insideTerrain, terrainHeight } from './terrain'
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

/**
 * Cabeza del periscopio: un mástil de observación sobre el búnker.
 *
 * No coincide con la boca del cañón. Desde la altura del tubo (6,5 m) la loma
 * que hay a ~160 m tapa por completo el Sector 7: no se veía ni un objetivo.
 * A 24 m los tres objetivos quedan en línea de visión franca, que es
 * justamente para lo que existe un periscopio.
 */
export const SIGHT: Vec3 = {
  x: PLAYER_BATTERY.x,
  y: terrainHeight(PLAYER_BATTERY.x, PLAYER_BATTERY.z) + 22,
  z: PLAYER_BATTERY.z,
}

/**
 * Elevación de la LÍNEA DE MIRA, en radianes (una ligera depresión).
 *
 * No es la elevación del tubo. Antes, periscopio y telémetro apuntaban por el
 * eje del cañón: a 34° de elevación —el valor inicial— el jugador solo veía
 * cielo y el telémetro devolvía 0, "SIN ECO", siempre. Como en la artillería
 * real, el visor va desacoplado del tubo y la elevación es un dato de
 * dirección de tiro que se lee en el dial, no algo que mueva la óptica.
 */
export const SIGHT_ELEVATION = -0.08

const AIM_LIMITS = {
  azimuth: 0.75, // ±43° de recorrido lateral
  elevationMin: 0.05,
  elevationMax: 1.25,
}

const CHARGE_RATE = 0.85 // potencia por segundo
const MAX_TRAIL = 320
const IMPACT_PAUSE = 1.5
const ENEMY_DELAY = 0.9

/** Velocidad de movimiento del vehículo en metros por segundo. */
const VEHICLE_SPEED = 12
/** Velocidad de rotación del chasis en radianes por segundo. */
const CHASSIS_ROTATION_SPEED = 1.2
/** Velocidad de rotación de la torreta en radianes por segundo. */
const TURRET_ROTATION_SPEED = 1.5

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

/**
 * Viento del turno. Recibe el generador por parámetro: sin `Math.random()`
 * suelto, el motor es determinista y no rompe la hidratación de React.
 */
function rollWind(rng: Rng) {
  return {
    speed: 2 + rng() * 12,
    // Rumbo dominante lateral (±Z) con algo de componente frontal.
    direction: (rng() < 0.5 ? 1 : -1) * (Math.PI / 2) + (rng() - 0.5) * 1.4,
  }
}

export interface GameEngineOptions {
  /** Semilla del generador. Fija por defecto: servidor y cliente coinciden. */
  seed?: number
  /** Perfil de la IA enemiga. Permite inyectar dificultad desde fuera. */
  enemyProfile?: EnemyAiProfile
}

export class GameEngine {
  // ---------------------------------------------------------------- estado
  private state: GameState
  private listeners = new Set<() => void>()
  private seed: number
  private rng: Rng
  private enemyProfile: EnemyAiProfile
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

  constructor(options: GameEngineOptions = {}) {
    this.seed = options.seed ?? DEFAULT_SEED
    this.rng = createRng(this.seed)
    this.enemyProfile = options.enemyProfile ?? DEFAULT_ENEMY_PROFILE
    this.state = this.initialState()
  }

  /**
   * Cambia la semilla y reinicia la partida. La Vista lo llama UNA vez tras
   * montar en el navegador (`useEffect`), de modo que el HTML del servidor y
   * el del primer render del cliente son idénticos —no hay mismatch— y aun
   * así cada partida real es distinta.
   */
  reseed(seed: number) {
    this.seed = seed
    this.reset()
  }

  /** Semilla en uso. Útil para reproducir una partida concreta o un bug. */
  getSeed(): number {
    return this.seed
  }

  private initialState(): GameState {
    const aim: Aim = { azimuth: 0, elevation: 0.6 }
    return {
      phase: 'aiming',
      turn: 1,
      wind: rollWind(this.rng),
      aim,
      power: 0.55,
      charging: false,
      ammoId: 'he',
      targets: createTargets(),
      playerHp: 100,
      playerMaxHp: 100,
      shotsFired: 0,
      hits: 0,
      rangefinder: laserRange(SIGHT, aim.azimuth, SIGHT_ELEVATION),
      lastShot: null,
      message: 'Batería lista. Use el periscopio para apuntar.',
      victory: false,
      vehicle: {
        position: { x: PLAYER_BATTERY.x, y: 0, z: PLAYER_BATTERY.z },
        chassisRotation: 0,
        turretRotation: 0,
        canMove: true,
      },
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
      { aim: { azimuth, elevation }, rangefinder: laserRange(SIGHT, azimuth, SIGHT_ELEVATION) },
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

  // ------------------------------------------------------------- movimiento
  /** Mueve el vehículo hacia adelante (dirección del chasis). */
  moveForward(distance: number) {
    if (this.state.phase !== 'aiming' || !this.state.vehicle.canMove) return
    const { chassisRotation, position } = this.state.vehicle
    const newX = position.x + Math.cos(chassisRotation) * distance
    const newZ = position.z + Math.sin(chassisRotation) * distance
    
    // Validar límites del terreno
    if (!insideTerrain(newX, newZ)) return
    
    const newY = terrainHeight(newX, newZ)
    this.commit({
      vehicle: {
        ...this.state.vehicle,
        position: { x: newX, y: newY, z: newZ },
      },
    }, false)
  }

  /** Mueve el vehículo hacia atrás. */
  moveBackward(distance: number) {
    if (this.state.phase !== 'aiming' || !this.state.vehicle.canMove) return
    const { chassisRotation, position } = this.state.vehicle
    const newX = position.x - Math.cos(chassisRotation) * distance
    const newZ = position.z - Math.sin(chassisRotation) * distance
    
    // Validar límites del terreno
    if (!insideTerrain(newX, newZ)) return
    
    const newY = terrainHeight(newX, newZ)
    this.commit({
      vehicle: {
        ...this.state.vehicle,
        position: { x: newX, y: newY, z: newZ },
      },
    }, false)
  }

  /** Rota el chasis a la izquierda (sentido antihorario). */
  rotateChassisLeft(angle: number) {
    if (this.state.phase !== 'aiming' || !this.state.vehicle.canMove) return
    this.commit({
      vehicle: {
        ...this.state.vehicle,
        chassisRotation: this.state.vehicle.chassisRotation + angle,
      },
    }, false)
  }

  /** Rota el chasis a la derecha (sentido horario). */
  rotateChassisRight(angle: number) {
    if (this.state.phase !== 'aiming' || !this.state.vehicle.canMove) return
    this.commit({
      vehicle: {
        ...this.state.vehicle,
        chassisRotation: this.state.vehicle.chassisRotation - angle,
      },
    }, false)
  }

  /** Rota la torreta a la izquierda (independiente del chasis). */
  rotateTurretLeft(angle: number) {
    if (this.state.phase !== 'aiming') return
    this.commit({
      vehicle: {
        ...this.state.vehicle,
        turretRotation: this.state.vehicle.turretRotation + angle,
      },
    }, false)
  }

  /** Rota la torreta a la derecha (independiente del chasis). */
  rotateTurretRight(angle: number) {
    if (this.state.phase !== 'aiming') return
    this.commit({
      vehicle: {
        ...this.state.vehicle,
        turretRotation: this.state.vehicle.turretRotation - angle,
      },
    }, false)
  }

  fire() {
    if (this.state.phase !== 'aiming') return
    const ammo = AMMO[this.state.ammoId]
    const { azimuth, elevation } = this.state.aim
    const dir = aimDirection(azimuth, elevation)
    
    // El proyectil sale desde la posición actual del vehículo
    const vehiclePos = this.state.vehicle.position
    const muzzleY = vehiclePos.y + 4.5

    this.trail.length = 0
    this.projectiles.length = 0
    this.projectiles.push({
      id: this.nextId++,
      // Sale ligeramente adelantado a la boca para no colisionar con el búnker.
      position: { x: vehiclePos.x + dir.x * 3, y: muzzleY + dir.y * 3, z: vehiclePos.z + dir.z * 3 },
      velocity: launchVelocity(azimuth, elevation, this.state.power, ammo),
      ammo,
      hostile: false,
      alive: true,
      age: 0,
    })

    // Al disparar, se desactiva el movimiento hasta el siguiente turno
    this.commit({
      phase: 'flying',
      shotsFired: this.state.shotsFired + 1,
      message: 'Proyectil en vuelo…',
      vehicle: {
        ...this.state.vehicle,
        canMove: false,
      },
    })
  }

  reset() {
    this.projectiles.length = 0
    this.effects.length = 0
    this.trail.length = 0
    this.phaseTimer = 0
    this.accumulator = 0
    this.flushTimer = 0
    this.hostileResolved = false
    this.enemyFired = false
    // Se rebobina el generador: una misma semilla reproduce la misma partida.
    this.rng = createRng(this.seed)
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
      // ==============================================================
      // CORRECCIÓN: Calcular la distancia desde la posición actual del vehículo
      // en lugar de MUZZLE (posición fija).
      // ==============================================================
      const vehiclePos = this.state.vehicle.position
      const d = Math.hypot(impact.x - vehiclePos.x, impact.z - vehiclePos.z)
      
      let hp = this.state.playerHp
      if (d < p.ammo.blastRadius) {
        hp = Math.max(0, hp - Math.round(p.ammo.damage * (1 - d / p.ammo.blastRadius)))
      }
      this.commit({
        playerHp: hp,
        message:
          d < p.ammo.blastRadius
            ? `¡Impacto enemigo a ${d.toFixed(0)} m! Integridad ${hp}%`
            : `Fallo enemigo a ${d.toFixed(0)} m del vehículo.`,
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

  /**
   * Turno enemigo. Toda la decisión vive en `enemy-ai.ts`: aquí solo se
   * materializa el plan como proyectil. Cambiar la IA no toca el motor.
   */
  private enemyFire() {
    const plan = this.planEnemyShot()
    if (!plan) {
      // Sin baterías vivas no hay respuesta: devolver el control o el turno
      // enemigo se quedaría colgado para siempre.
      this.beginPlayerTurn()
      return
    }

    const dir = aimDirection(plan.azimuth, plan.elevation)
    this.projectiles.push({
      id: this.nextId++,
      position: {
        x: plan.origin.x + dir.x * 2,
        y: plan.origin.y + dir.y * 2,
        z: plan.origin.z + dir.z * 2,
      },
      velocity: { ...plan.velocity },
      ammo: plan.ammo,
      hostile: true,
      alive: true,
      age: 0,
    })
    this.commit({ message: 'Fuego entrante. ¡Cúbrase!' })
  }

  /** Expuesto para tests y para futuros modos (previsualizar el tiro enemigo). */
  planEnemyShot(): EnemyShotPlan | null {
    // ==============================================================
    // CORRECCIÓN: Pasar la posición actual del vehículo para que la IA
    // apunte correctamente al jugador en movimiento.
    // ==============================================================
    const playerPos = this.state.vehicle.position
    // Ajustar la altura de la posición del jugador al nivel de la torreta
    const adjustedPlayerPos: Vec3 = {
      x: playerPos.x,
      y: playerPos.y + 4.5,
      z: playerPos.z,
    }
    
    return planEnemyShot({
      targets: this.state.targets,
      playerPosition: adjustedPlayerPos,
      turn: this.state.turn,
      wind: windVector(this.state.wind),
      rng: this.rng,
      profile: this.enemyProfile,
      dt: FIXED_DT * 4, // paso grueso: solo es una estimación de puntería
    })
  }

  private beginPlayerTurn() {
    this.commit({
      phase: 'aiming',
      turn: this.state.turn + 1,
      wind: rollWind(this.rng),
      power: 0.55,
      charging: false,
      message: 'Su turno. El viento ha cambiado.',
      vehicle: {
        ...this.state.vehicle,
        canMove: true,
      },
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