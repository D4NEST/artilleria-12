/**
 * ============================================================================
 *  MODELO (Domain Layer) — Tipos puros del juego
 * ============================================================================
 *  Esta capa NO conoce React ni Three.js. Solo describe el dominio del juego.
 *  Cualquier renderizador (low-poly, high-poly, 2D, servidor headless...) puede
 *  consumir estos tipos sin acoplarse a una tecnología de dibujo concreta.
 * ============================================================================
 */

/** Vector 3D agnóstico del motor gráfico (world space: X derecha, Y arriba, Z fondo). */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Fases del ciclo de turno. La Vista reacciona a estas fases. */
export type GamePhase =
  | 'aiming' // El jugador ajusta ángulo / potencia / munición
  | 'flying' // Proyectil del jugador en vuelo
  | 'impact' // Resolución del impacto (pausa dramática)
  | 'enemy' // La batería enemiga responde
  | 'gameover'

export type AmmoId = 'he' | 'ap' | 'cluster'

/** Definición balística de un tipo de munición. */
export interface AmmoSpec {
  id: AmmoId
  name: string
  code: string
  /** Masa relativa: afecta la inercia frente al viento. */
  mass: number
  /** Coeficiente de arrastre aerodinámico (k en a = -k·|v-w|·(v-w)). */
  drag: number
  /** Multiplicador de velocidad inicial en boca de cañón. */
  muzzleFactor: number
  /** Radio de daño en metros. */
  blastRadius: number
  /** Daño en el epicentro. */
  damage: number
  description: string
}

/** Objetivo destructible en el campo de batalla. */
export interface Target {
  id: string
  position: Vec3
  radius: number
  hp: number
  maxHp: number
  alive: boolean
  /** Variante visual low-poly (la Vista decide cómo pintarla). */
  kind: 'bunker' | 'tower' | 'depot'
}

/** Estado del viento. `direction` en radianes sobre el plano XZ. */
export interface Wind {
  speed: number
  direction: number
}

/** Orientación del cañón. Radianes. */
export interface Aim {
  /** Giro horizontal respecto al eje +X (hacia el enemigo). */
  azimuth: number
  /** Elevación sobre el horizonte. */
  elevation: number
}

/** Proyectil simulado. Es efímero y se lee de forma imperativa cada frame. */
export interface Projectile {
  id: number
  position: Vec3
  velocity: Vec3
  ammo: AmmoSpec
  /** true si lo disparó la batería enemiga. */
  hostile: boolean
  alive: boolean
  age: number
}

/** Efecto de impacto. La Vista lo interpreta como explosión, humo, etc. */
export interface ImpactEffect {
  id: number
  position: Vec3
  radius: number
  life: number
  maxLife: number
  hostile: boolean
}

/** Resultado del último disparo, para telemetría en los paneles. */
export interface ShotReport {
  distanceToTarget: number
  hit: boolean
  destroyed: boolean
  impact: Vec3
}

/**
 * Snapshot inmutable del estado del juego.
 * La Vista se suscribe a él (useSyncExternalStore) y NUNCA lo muta.
 */
export interface GameState {
  phase: GamePhase
  turn: number
  wind: Wind
  aim: Aim
  /** 0..1 */
  power: number
  charging: boolean
  ammoId: AmmoId
  targets: Target[]
  playerHp: number
  playerMaxHp: number
  shotsFired: number
  hits: number
  /** Telémetro láser: distancia al objetivo bajo el retículo. */
  rangefinder: number
  lastShot: ShotReport | null
  /** Mensaje del oficial de mando para el HUD. */
  message: string
  victory: boolean
}
