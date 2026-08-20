/**
 * ============================================================================
 *  MODELO — Terreno procedural determinista
 * ============================================================================
 *  El terreno es una FUNCIÓN matemática, no una malla. Esto permite que:
 *   - La física consulte alturas sin depender del renderizador.
 *   - La Vista genere la malla con la resolución que quiera (low-poly hoy,
 *     alta definición o teselado mañana) sin tocar la lógica del juego.
 * ============================================================================
 */

export const TERRAIN = {
  /** Extensión en X (eje de tiro jugador -> enemigo). */
  width: 320,
  /** Extensión en Z (lateral). */
  depth: 200,
  /** Resolución de la malla low-poly que usará la Vista. */
  segmentsX: 48,
  segmentsZ: 30,
} as const

/** Posición de la batería del jugador (búnker) sobre el terreno. */
export const PLAYER_BATTERY = { x: -120, z: 0 }

/**
 * Altura del terreno en (x, z).
 * Suma de senos: barato, continuo y determinista (mismo mundo en cliente/servidor).
 */
export function terrainHeight(x: number, z: number): number {
  const ridges =
    5.5 * Math.sin(x * 0.035) +
    3.2 * Math.cos(z * 0.045) +
    2.4 * Math.sin((x + z) * 0.018) +
    1.4 * Math.sin(x * 0.11 + z * 0.07)

  // Meseta suave donde se asienta la batería del jugador, para tiro limpio.
  const pad = Math.exp(-((x - PLAYER_BATTERY.x) ** 2 + (z - PLAYER_BATTERY.z) ** 2) / 900)

  return ridges * (1 - pad) + 2 * pad
}

/** ¿La posición está dentro de los límites jugables? */
export function insideTerrain(x: number, z: number): boolean {
  return Math.abs(x) <= TERRAIN.width / 2 && Math.abs(z) <= TERRAIN.depth / 2
}

/**
 * Normal aproximada del terreno por diferencias finitas.
 * Útil para orientar cráteres y decorados en la Vista.
 */
export function terrainNormal(x: number, z: number, eps = 1.5) {
  const hL = terrainHeight(x - eps, z)
  const hR = terrainHeight(x + eps, z)
  const hD = terrainHeight(x, z - eps)
  const hU = terrainHeight(x, z + eps)
  const nx = hL - hR
  const nz = hD - hU
  const ny = 2 * eps
  const len = Math.hypot(nx, ny, nz) || 1
  return { x: nx / len, y: ny / len, z: nz / len }
}

/** Puntos decorativos (rocas/árboles low-poly) generados de forma determinista. */
export function scatterProps(count = 90) {
  const props: { x: number; y: number; z: number; scale: number; kind: 0 | 1 }[] = []
  // LCG determinista: mismo escenario en cada partida/render.
  let seed = 1337
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  for (let i = 0; i < count; i++) {
    const x = (rnd() - 0.5) * TERRAIN.width * 0.96
    const z = (rnd() - 0.5) * TERRAIN.depth * 0.96
    // Zona despejada alrededor de la batería propia.
    if (Math.hypot(x - PLAYER_BATTERY.x, z - PLAYER_BATTERY.z) < 30) continue
    props.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: 0.7 + rnd() * 1.8,
      kind: rnd() > 0.45 ? 1 : 0,
    })
  }
  return props
}
