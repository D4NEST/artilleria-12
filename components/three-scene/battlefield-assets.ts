/**
 * ============================================================================
 *  VISTA — Recursos gráficos compartidos
 * ============================================================================
 *  El campo de batalla se renderiza DOS veces por frame (monitor táctico y
 *  periscopio). Para no duplicar memoria ni coste de creación, las geometrías
 *  y materiales pesados se construyen una sola vez a nivel de módulo y se
 *  comparten entre escenas (Three.js lo permite sin problemas).
 *
 *  Sustituir el look low-poly por modelos de alta definición se hace SOLO
 *  aquí y en los componentes de vista: el motor de juego no se entera.
 * ============================================================================
 */

import * as THREE from 'three'
import { TERRAIN, terrainHeight } from '@/components/game-engine/terrain'

/** Paleta low-poly (3 neutros + ámbar + verde CRT). */
export const PALETTE = {
  skyTop: '#5f89ad',
  skyBottom: '#a8bfd0',
  terrainLow: '#54633c',
  terrainMid: '#7a7548',
  terrainHigh: '#a79d79',
  rock: '#7c7768',
  metal: '#3b3f45',
  metalDark: '#22252a',
  panel: '#2b2e33',
  amber: '#f2a93b',
  crt: '#8ee79b',
  hostile: '#d9503c',
} as const

const lowColor = new THREE.Color(PALETTE.terrainLow)
const midColor = new THREE.Color(PALETTE.terrainMid)
const highColor = new THREE.Color(PALETTE.terrainHigh)

let cachedTerrain: THREE.BufferGeometry | null = null

/**
 * Malla del terreno facetada (flat shading) con color por vértice según altura.
 * Se genera desde `terrainHeight()`, la MISMA función que usa la física, así
 * que lo que se ve es exactamente lo que se simula.
 */
export function getTerrainGeometry(): THREE.BufferGeometry {
  if (cachedTerrain) return cachedTerrain

  const geo = new THREE.PlaneGeometry(
    TERRAIN.width,
    TERRAIN.depth,
    TERRAIN.segmentsX,
    TERRAIN.segmentsZ,
  )
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    pos.setY(i, terrainHeight(x, z))
  }

  // Non-indexed + normales por cara => estética poligonal tipo Minecraft/Roblox.
  const faceted = geo.toNonIndexed()
  geo.dispose()
  faceted.computeVertexNormals()

  const fpos = faceted.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(fpos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < fpos.count; i++) {
    const h = fpos.getY(i)
    const t = THREE.MathUtils.clamp((h + 8) / 18, 0, 1)
    if (t < 0.5) c.copy(lowColor).lerp(midColor, t / 0.5)
    else c.copy(midColor).lerp(highColor, (t - 0.5) / 0.5)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  faceted.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  cachedTerrain = faceted
  return faceted
}

/** Materiales compartidos (flatShading, sin texturas: máximo rendimiento). */
export const MATERIALS = {
  terrain: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  rock: new THREE.MeshLambertMaterial({ color: PALETTE.rock, flatShading: true }),
  tree: new THREE.MeshLambertMaterial({ color: '#3f5a35', flatShading: true }),
  metal: new THREE.MeshLambertMaterial({ color: PALETTE.metal, flatShading: true }),
  metalDark: new THREE.MeshLambertMaterial({ color: PALETTE.metalDark, flatShading: true }),
  enemy: new THREE.MeshLambertMaterial({ color: '#6d4a3c', flatShading: true }),
  enemyDead: new THREE.MeshLambertMaterial({ color: '#2f2a26', flatShading: true }),
  shell: new THREE.MeshBasicMaterial({ color: PALETTE.amber }),
  hostileShell: new THREE.MeshBasicMaterial({ color: PALETTE.hostile }),
  blast: new THREE.MeshBasicMaterial({ color: '#ffcf6b', transparent: true }),
  smoke: new THREE.MeshLambertMaterial({ color: '#585349', flatShading: true, transparent: true }),
} as const

/** Geometrías primitivas reutilizadas (bajo número de polígonos a propósito). */
export const GEOMETRIES = {
  rock: new THREE.IcosahedronGeometry(1, 0),
  trunk: new THREE.CylinderGeometry(0.25, 0.35, 2, 5),
  canopy: new THREE.ConeGeometry(1.6, 4, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  shell: new THREE.OctahedronGeometry(1.1, 0),
  barrel: new THREE.CylinderGeometry(0.55, 0.7, 9, 7),
  blast: new THREE.IcosahedronGeometry(1, 1),
  crater: new THREE.CircleGeometry(1, 10),
  antenna: new THREE.CylinderGeometry(0.08, 0.08, 6, 4),
  tank: new THREE.CylinderGeometry(2.4, 2.4, 4, 7),
} as const
