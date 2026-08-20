/**
 * ============================================================================
 *  MODELO — Catálogo de municiones
 * ============================================================================
 *  Cada munición cambia la balística: velocidad de boca, arrastre (y por tanto
 *  cuánto la desvía el viento) y radio de daño. Añadir una nueva munición no
 *  requiere tocar ni la física ni el renderizador.
 * ============================================================================
 */

import type { AmmoId, AmmoSpec } from './types'

export const AMMO: Record<AmmoId, AmmoSpec> = {
  he: {
    id: 'he',
    name: 'Alto Explosivo',
    code: 'HE-72',
    mass: 22,
    drag: 0.0009,
    muzzleFactor: 1,
    blastRadius: 14,
    damage: 55,
    description: 'Equilibrada. Buen radio de daño, deriva moderada.',
  },
  ap: {
    id: 'ap',
    name: 'Perforante',
    code: 'AP-14',
    mass: 34,
    drag: 0.00035,
    muzzleFactor: 1.18,
    blastRadius: 7,
    damage: 85,
    description: 'Densa y rápida: apenas la mueve el viento, radio pequeño.',
  },
  cluster: {
    id: 'cluster',
    name: 'Racimo',
    code: 'CL-09',
    mass: 12,
    drag: 0.0022,
    muzzleFactor: 0.9,
    blastRadius: 24,
    damage: 32,
    description: 'Ligera: gran radio de daño pero muy sensible al viento.',
  },
}

export const AMMO_LIST: AmmoSpec[] = [AMMO.he, AMMO.ap, AMMO.cluster]

/** Velocidad de salida (m/s) a partir de la potencia normalizada 0..1. */
export const MUZZLE_MIN = 24
export const MUZZLE_MAX = 68

export function muzzleSpeed(power: number, ammo: AmmoSpec): number {
  const p = Math.min(1, Math.max(0, power))
  return (MUZZLE_MIN + (MUZZLE_MAX - MUZZLE_MIN) * p) * ammo.muzzleFactor
}
