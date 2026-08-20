/**
 * ============================================================================
 *  MODELO — Generador pseudoaleatorio determinista
 * ============================================================================
 *  `Math.random()` no sirve dentro del motor por dos motivos:
 *
 *   1. HIDRATACIÓN. El motor se construye también en el servidor (SSR). Si el
 *      viento inicial es aleatorio, el HTML del servidor y el del cliente no
 *      coinciden y React lanza un error de hidratación.
 *   2. TESTS. Una IA y un viento aleatorios no se pueden asertar.
 *
 *  Con un LCG sembrado, el motor es 100 % reproducible: misma semilla, misma
 *  partida. La aleatoriedad "de verdad" se inyecta desde el cliente después
 *  del montaje (ver `GameProvider`).
 * ============================================================================
 */

/** Fuente de números en [0, 1). Misma firma que `Math.random`. */
export type Rng = () => number

/** Semilla por defecto: la que usan servidor y cliente en el primer render. */
export const DEFAULT_SEED = 20260812

/**
 * Congruencial lineal (Numerical Recipes). Barato, sin dependencias y
 * suficientemente uniforme para viento y dispersión de la IA.
 */
export function createRng(seed: number = DEFAULT_SEED): Rng {
  // Se fuerza a entero positivo: una semilla NaN o negativa rompería el ciclo.
  let s = Math.abs(Math.floor(seed)) % 4294967296 || DEFAULT_SEED
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
