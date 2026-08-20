/**
 * ============================================================================
 *  Tests — Terreno y munición
 * ============================================================================
 *  El terreno es una FUNCIÓN, no una malla: la física y el renderizador la
 *  consultan por separado y deben obtener exactamente lo mismo. Si dejara de
 *  ser determinista, "lo que se ve" y "lo que se simula" divergirían.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest'
import {
  PLAYER_BATTERY,
  TERRAIN,
  insideTerrain,
  scatterProps,
  terrainHeight,
  terrainNormal,
} from '@/components/game-engine/terrain'
import { AMMO, AMMO_LIST, MUZZLE_MAX, MUZZLE_MIN, muzzleSpeed } from '@/components/game-engine/ammunition'

describe('terrainHeight', () => {
  it('es determinista: la misma coordenada da siempre la misma altura', () => {
    for (const [x, z] of [[0, 0], [55.5, -12.25], [-140, 90]]) {
      expect(terrainHeight(x, z)).toBe(terrainHeight(x, z))
    }
  })

  it('es continua: dos puntos vecinos no dan un escalón', () => {
    for (let x = -150; x <= 150; x += 17) {
      const a = terrainHeight(x, 10)
      const b = terrainHeight(x + 0.01, 10)
      expect(Math.abs(a - b)).toBeLessThan(0.1)
    }
  })

  it('aplana una meseta bajo la batería del jugador', () => {
    const centro = terrainHeight(PLAYER_BATTERY.x, PLAYER_BATTERY.z)
    expect(centro).toBeCloseTo(2, 1)
    // Y la meseta es realmente plana en su entorno inmediato.
    expect(Math.abs(centro - terrainHeight(PLAYER_BATTERY.x + 3, PLAYER_BATTERY.z))).toBeLessThan(0.3)
  })

  it('la meseta se disuelve al alejarse: el terreno vuelve a ondular', () => {
    const lejos = terrainHeight(PLAYER_BATTERY.x + 120, PLAYER_BATTERY.z)
    expect(Math.abs(lejos - 2)).toBeGreaterThan(0.5)
  })

  it('las alturas se mantienen en un rango razonable en todo el sector', () => {
    for (let x = -160; x <= 160; x += 8) {
      for (let z = -100; z <= 100; z += 8) {
        const h = terrainHeight(x, z)
        expect(h).toBeGreaterThan(-20)
        expect(h).toBeLessThan(20)
      }
    }
  })
})

describe('insideTerrain', () => {
  it('acepta el centro y los bordes exactos', () => {
    expect(insideTerrain(0, 0)).toBe(true)
    expect(insideTerrain(TERRAIN.width / 2, TERRAIN.depth / 2)).toBe(true)
  })

  it('rechaza cualquier punto pasado el borde', () => {
    expect(insideTerrain(TERRAIN.width / 2 + 0.001, 0)).toBe(false)
    expect(insideTerrain(0, -TERRAIN.depth / 2 - 0.001)).toBe(false)
  })

  it('la batería del jugador está dentro del área jugable', () => {
    expect(insideTerrain(PLAYER_BATTERY.x, PLAYER_BATTERY.z)).toBe(true)
  })
})

describe('terrainNormal', () => {
  it('devuelve un vector unitario que mira hacia arriba', () => {
    const n = terrainNormal(20, -30)
    expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1, 10)
    expect(n.y).toBeGreaterThan(0)
  })

  it('sobre la meseta del jugador la normal es prácticamente vertical', () => {
    const n = terrainNormal(PLAYER_BATTERY.x, PLAYER_BATTERY.z)
    expect(n.y).toBeGreaterThan(0.98)
  })
})

describe('scatterProps', () => {
  it('genera siempre el mismo escenario', () => {
    expect(scatterProps(50)).toEqual(scatterProps(50))
  })

  it('deja despejada la zona de la batería propia', () => {
    for (const p of scatterProps(300)) {
      expect(Math.hypot(p.x - PLAYER_BATTERY.x, p.z - PLAYER_BATTERY.z)).toBeGreaterThanOrEqual(30)
    }
  })

  it('apoya cada decorado sobre el terreno y dentro del sector', () => {
    for (const p of scatterProps(120)) {
      expect(p.y).toBeCloseTo(terrainHeight(p.x, p.z), 10)
      expect(insideTerrain(p.x, p.z)).toBe(true)
    }
  })

  it('produce rocas y árboles, no un solo tipo', () => {
    const kinds = new Set(scatterProps(120).map((p) => p.kind))
    expect(kinds).toEqual(new Set([0, 1]))
  })
})

describe('catálogo de munición', () => {
  it('la lista y el diccionario no se desincronizan', () => {
    expect(AMMO_LIST.map((a) => a.id).sort()).toEqual(Object.keys(AMMO).sort())
  })

  it('cada munición tiene parámetros balísticos válidos', () => {
    for (const ammo of AMMO_LIST) {
      expect(ammo.drag).toBeGreaterThan(0)
      expect(ammo.mass).toBeGreaterThan(0)
      expect(ammo.muzzleFactor).toBeGreaterThan(0)
      expect(ammo.blastRadius).toBeGreaterThan(0)
      expect(ammo.damage).toBeGreaterThan(0)
    }
  })

  it('respeta el equilibrio de diseño: radio grande, daño pequeño', () => {
    // CL-09 cubre mucho pero pega flojo; AP-14 al revés.
    expect(AMMO.cluster.blastRadius).toBeGreaterThan(AMMO.ap.blastRadius)
    expect(AMMO.ap.damage).toBeGreaterThan(AMMO.cluster.damage)
    // Y la sensibilidad al viento sigue el mismo eje.
    expect(AMMO.cluster.drag).toBeGreaterThan(AMMO.he.drag)
    expect(AMMO.he.drag).toBeGreaterThan(AMMO.ap.drag)
  })

  it('la velocidad de boca crece con la potencia', () => {
    expect(muzzleSpeed(0.9, AMMO.he)).toBeGreaterThan(muzzleSpeed(0.1, AMMO.he))
  })

  it('en los extremos coincide con el rango declarado', () => {
    expect(muzzleSpeed(0, AMMO.he)).toBeCloseTo(MUZZLE_MIN * AMMO.he.muzzleFactor, 10)
    expect(muzzleSpeed(1, AMMO.he)).toBeCloseTo(MUZZLE_MAX * AMMO.he.muzzleFactor, 10)
  })
})
