'use client'

/**
 * ============================================================================
 *  VISTA — Campo de batalla
 * ============================================================================
 *  Esta escena se "pinta" dentro de dos pantallas del cuarto de guerra
 *  (monitor táctico y periscopio) mediante RenderTexture.
 *
 *  Regla de oro: aquí NO hay lógica de juego. Todo se lee del motor:
 *   - Datos discretos (objetivos, HP) por snapshot de React.
 *   - Datos por frame (proyectil, estela, explosiones) leídos IMPERATIVAMENTE
 *     en useFrame, sin provocar re-renders.
 * ============================================================================
 */

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useEngine, useGameState } from '@/components/game-engine/game-provider'
import { aimDirection } from '@/components/game-engine/physics'
import { TERRAIN, scatterProps, terrainHeight } from '@/components/game-engine/terrain'
import { SIGHT_ELEVATION } from '@/components/game-engine/engine'  // <-- NUEVA IMPORTACIÓN
import type { Target } from '@/components/game-engine/types'
import { GEOMETRIES, MATERIALS, PALETTE, getTerrainGeometry } from './battlefield-assets'

/* -------------------------------------------------------------- iluminación */

function BattlefieldLights() {
  return (
    <>
      {/* Luz ambiental de cielo/suelo: barata y suficiente para low-poly. */}
      <hemisphereLight args={[PALETTE.skyTop, PALETTE.terrainLow, 1.15]} />
      <directionalLight position={[-120, 160, 90]} intensity={1.35} color="#fff3d6" />
      <fog attach="fog" args={[PALETTE.skyBottom, 260, 620]} />
      <color attach="background" args={[PALETTE.skyBottom]} />
    </>
  )
}

/* ------------------------------------------------------------------ terreno */

function Terrain() {
  const geometry = useMemo(() => getTerrainGeometry(), [])
  return <mesh geometry={geometry} material={MATERIALS.terrain} receiveShadow={false} />
}

/** Rocas y árboles instanciados: cientos de objetos en 3 draw calls. */
function ScatterProps() {
  const items = useMemo(() => scatterProps(110), [])
  const rocks = useMemo(() => items.filter((i) => i.kind === 0), [items])
  const trees = useMemo(() => items.filter((i) => i.kind === 1), [items])

  const rockRef = useRef<THREE.InstancedMesh>(null)
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const v = new THREE.Vector3()
    const s = new THREE.Vector3()

    rocks.forEach((r, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.scale * 3)
      v.set(r.x, r.y + r.scale * 0.3, r.z)
      s.setScalar(r.scale * 1.3)
      rockRef.current?.setMatrixAt(i, m.compose(v, q, s))
    })
    trees.forEach((t, i) => {
      q.identity()
      s.setScalar(t.scale)
      v.set(t.x, t.y + t.scale, t.z)
      trunkRef.current?.setMatrixAt(i, m.compose(v, q, s))
      v.set(t.x, t.y + t.scale * 3.4, t.z)
      canopyRef.current?.setMatrixAt(i, m.compose(v, q, s))
    })

    for (const ref of [rockRef, trunkRef, canopyRef]) {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    }
  }, [rocks, trees])

  return (
    <>
      <instancedMesh ref={rockRef} args={[GEOMETRIES.rock, MATERIALS.rock, rocks.length]} />
      <instancedMesh ref={trunkRef} args={[GEOMETRIES.trunk, MATERIALS.rock, trees.length]} />
      <instancedMesh ref={canopyRef} args={[GEOMETRIES.canopy, MATERIALS.tree, trees.length]} />
    </>
  )
}

/* --------------------------------------------------- batería propia + cañón */

/** Búnker del jugador con el cañón orientado por el estado de puntería. */
function PlayerBattery() {
  const engine = useEngine()
  const yaw = useRef<THREE.Group>(null)
  const pitch = useRef<THREE.Group>(null)
  const chassisRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const { aim, vehicle } = engine.getSnapshot()
    
    // Rotación de la torreta (combinación de chasis + torreta)
    const totalTurretRotation = vehicle.chassisRotation + vehicle.turretRotation
    if (yaw.current) yaw.current.rotation.y = -totalTurretRotation - aim.azimuth
    
    // Elevación del cañón (usa aim.elevation, como debe ser)
    if (pitch.current) pitch.current.rotation.z = aim.elevation
    
    // Posición y rotación del chasis
    if (chassisRef.current) {
      chassisRef.current.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z)
      chassisRef.current.rotation.y = -vehicle.chassisRotation
    }
  })

  return (
    <group ref={chassisRef}>
      {/* Estructura de hormigón low-poly */}
      <mesh geometry={GEOMETRIES.box} material={MATERIALS.metalDark} scale={[16, 5, 14]} position={[0, 2.2, 0]} />
      <mesh geometry={GEOMETRIES.box} material={MATERIALS.metal} scale={[12, 2, 10]} position={[0, 5.4, 0]} />
      {/* Mástil del periscopio: la óptica desde la que mira el jugador.
          Se dibuja para que la vista táctica no muestre una cámara flotante. */}
      <group position={[0, 0, 0]}>
        <mesh
          geometry={GEOMETRIES.antenna}
          material={MATERIALS.metal}
          scale={[1, 3.5, 1]}
          position={[0, 1.75, 0]}
        />
        <mesh
          geometry={GEOMETRIES.box}
          material={MATERIALS.metalDark}
          scale={[1.6, 1.6, 2.6]}
          position={[0, 3.5, 0]}
        />
      </group>
      {/* Torreta: yaw -> pitch -> tubo */}
      <group ref={yaw} position={[0, 4.5, 0]}>
        <mesh geometry={GEOMETRIES.box} material={MATERIALS.metal} scale={[5, 2.6, 5]} />
        <group ref={pitch}>
          <mesh
            geometry={GEOMETRIES.barrel}
            material={MATERIALS.metalDark}
            rotation={[0, 0, -Math.PI / 2]}
            position={[4.5, 0, 0]}
          />
        </group>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ enemigos */

function TargetMesh({ target }: { target: Target }) {
  const material = target.alive ? MATERIALS.enemy : MATERIALS.enemyDead
  const collapse = target.alive ? 1 : 0.35
  const { x, y, z } = target.position

  return (
    <group position={[x, y, z]} scale={[1, collapse, 1]}>
      {target.kind === 'bunker' && (
        <>
          <mesh geometry={GEOMETRIES.box} material={material} scale={[12, 6, 12]} position={[0, 3, 0]} />
          <mesh geometry={GEOMETRIES.box} material={MATERIALS.metalDark} scale={[13, 1.2, 4]} position={[0, 4.2, 0]} />
        </>
      )}
      {target.kind === 'tower' && (
        <>
          <mesh geometry={GEOMETRIES.box} material={material} scale={[5, 16, 5]} position={[0, 8, 0]} />
          <mesh geometry={GEOMETRIES.box} material={MATERIALS.metalDark} scale={[8, 2, 8]} position={[0, 16, 0]} />
          <mesh geometry={GEOMETRIES.antenna} material={MATERIALS.metal} position={[0, 20, 0]} />
        </>
      )}
      {target.kind === 'depot' && (
        <>
          <mesh geometry={GEOMETRIES.box} material={material} scale={[14, 5, 9]} position={[0, 2.5, 0]} />
          <mesh geometry={GEOMETRIES.tank} material={MATERIALS.metal} position={[9, 2, 3]} />
          <mesh geometry={GEOMETRIES.tank} material={MATERIALS.metal} position={[9, 2, -3]} />
        </>
      )}
    </group>
  )
}

function Targets() {
  const { targets } = useGameState()
  return (
    <>
      {targets.map((t) => (
        <TargetMesh key={t.id} target={t} />
      ))}
    </>
  )
}

/* --------------------------------------------------------------- proyectiles */

const MAX_VISIBLE_PROJECTILES = 2

function Projectiles() {
  const engine = useEngine()
  const refs = useRef<(THREE.Mesh | null)[]>([])

  useFrame((_, dt) => {
    for (let i = 0; i < MAX_VISIBLE_PROJECTILES; i++) {
      const mesh = refs.current[i]
      if (!mesh) continue
      const p = engine.projectiles[i]
      if (!p || !p.alive) {
        mesh.visible = false
        continue
      }
      mesh.visible = true
      mesh.position.set(p.position.x, p.position.y, p.position.z)
      // Orienta el proyectil según su velocidad (se ve "apuntando" al vuelo).
      mesh.lookAt(
        p.position.x + p.velocity.x,
        p.position.y + p.velocity.y,
        p.position.z + p.velocity.z,
      )
      mesh.rotateZ(dt * 8)
      mesh.material = p.hostile ? MATERIALS.hostileShell : MATERIALS.shell
      mesh.scale.setScalar(p.hostile ? 1.2 : 1)
    }
  })

  return (
    <>
      {Array.from({ length: MAX_VISIBLE_PROJECTILES }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          geometry={GEOMETRIES.shell}
          material={MATERIALS.shell}
          visible={false}
        />
      ))}
    </>
  )
}

/** Estela del proyectil: una única THREE.Line con buffer preasignado. */
function Trail() {
  const engine = useEngine()
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(320 * 3), 3))
    geometry.setDrawRange(0, 0)
    const material = new THREE.LineBasicMaterial({ color: PALETTE.amber, transparent: true, opacity: 0.75 })
    const obj = new THREE.Line(geometry, material)
    obj.frustumCulled = false
    return obj
  }, [])

  useFrame(() => {
    const attr = line.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const trail = engine.trail
    const n = Math.min(trail.length, 320)
    for (let i = 0; i < n; i++) {
      arr[i * 3] = trail[i].x
      arr[i * 3 + 1] = trail[i].y
      arr[i * 3 + 2] = trail[i].z
    }
    line.geometry.setDrawRange(0, n)
    attr.needsUpdate = true
  })

  return <primitive object={line} />
}

/* ------------------------------------------------------- explosiones/cráteres */

const EFFECT_POOL = 4
const CRATER_POOL = 14

function Impacts() {
  const engine = useEngine()
  const blasts = useRef<(THREE.Mesh | null)[]>([])
  const smokes = useRef<(THREE.Mesh | null)[]>([])
  const craters = useRef<(THREE.Mesh | null)[]>([])
  const craterCursor = useRef(0)
  const seen = useRef(new Set<number>())

  // Materiales propios por instancia: necesitamos animar la opacidad.
  const blastMaterials = useMemo(
    () => Array.from({ length: EFFECT_POOL }, () => MATERIALS.blast.clone()),
    [],
  )
  const smokeMaterials = useMemo(
    () => Array.from({ length: EFFECT_POOL }, () => MATERIALS.smoke.clone()),
    [],
  )

  useFrame(() => {
    // Cráteres persistentes: se marcan la primera vez que vemos un efecto.
    for (const fx of engine.effects) {
      if (seen.current.has(fx.id)) continue
      seen.current.add(fx.id)
      const crater = craters.current[craterCursor.current % CRATER_POOL]
      craterCursor.current++
      if (crater) {
        crater.visible = true
        crater.position.set(fx.position.x, fx.position.y + 0.25, fx.position.z)
        crater.scale.setScalar(fx.radius * 0.55)
      }
    }

    for (let i = 0; i < EFFECT_POOL; i++) {
      const fx = engine.effects[i]
      const blast = blasts.current[i]
      const smoke = smokes.current[i]
      if (!blast || !smoke) continue
      if (!fx) {
        blast.visible = false
        smoke.visible = false
        continue
      }
      const t = 1 - fx.life / fx.maxLife // 0 -> 1
      blast.visible = t < 0.55
      blast.position.set(fx.position.x, fx.position.y + fx.radius * 0.35, fx.position.z)
      blast.scale.setScalar(fx.radius * (0.35 + t * 1.5))
      blastMaterials[i].opacity = Math.max(0, 1 - t / 0.55)
      blastMaterials[i].color.set(fx.hostile ? PALETTE.hostile : '#ffcf6b')

      smoke.visible = true
      smoke.position.set(fx.position.x, fx.position.y + fx.radius * 0.5 + t * fx.radius, fx.position.z)
      smoke.scale.setScalar(fx.radius * (0.4 + t * 0.9))
      smoke.rotation.y += 0.01
      smokeMaterials[i].opacity = Math.max(0, 0.7 * (1 - t))
    }
  })

  return (
    <>
      {Array.from({ length: EFFECT_POOL }).map((_, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              blasts.current[i] = el
            }}
            geometry={GEOMETRIES.blast}
            material={blastMaterials[i]}
            visible={false}
          />
          <mesh
            ref={(el) => {
              smokes.current[i] = el
            }}
            geometry={GEOMETRIES.blast}
            material={smokeMaterials[i]}
            visible={false}
          />
        </group>
      ))}
      {Array.from({ length: CRATER_POOL }).map((_, i) => (
        <mesh
          key={`crater-${i}`}
          ref={(el) => {
            craters.current[i] = el
          }}
          geometry={GEOMETRIES.crater}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <meshBasicMaterial color="#2a241d" transparent opacity={0.85} />
        </mesh>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ cámaras */

/** Cámara cenital/isométrica: la señal que llega al monitor táctico. */
export function TacticalCamera() {
  const ref = useRef<THREE.PerspectiveCamera>(null)
  useFrame(() => {
    const cam = ref.current
    if (!cam) return
    // Ligero balanceo para que la señal se sienta "en vivo".
    const t = performance.now() * 0.00012
    cam.position.set(Math.sin(t) * 8, 235, 205)
    cam.lookAt(0, 0, -6)
  })
  return <PerspectiveCamera ref={ref} makeDefault fov={44} near={1} far={900} />
}

/** Cámara del periscopio: la señal que sube por el mástil de observación. */
export function GunsightCamera() {
  const engine = useEngine()
  const ref = useRef<THREE.PerspectiveCamera>(null)
  const target = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const cam = ref.current
    if (!cam) return
    const { aim, vehicle } = engine.getSnapshot()
    
    // ----------------------------------------------------------
    // CORRECCIÓN: Usamos SIGHT_ELEVATION en lugar de aim.elevation
    // para que el periscopio siempre mire al horizonte.
    // El jugador solo controla el azimuth con el mouse.
    // ----------------------------------------------------------
    const totalRotation = vehicle.chassisRotation + vehicle.turretRotation + aim.azimuth
    const dir = aimDirection(totalRotation, SIGHT_ELEVATION)
    
    // ----------------------------------------------------------
    // CORRECCIÓN: Posicionamos la cámara en la torreta (no en un mástil fijo de 22m)
    // para que siga correctamente al vehículo.
    // ----------------------------------------------------------
    const turretHeight = vehicle.position.y + 4.5 // altura de la torreta sobre el terreno
    const camPos = new THREE.Vector3(
      vehicle.position.x + dir.x * 2,
      turretHeight + dir.y * 2,
      vehicle.position.z + dir.z * 2
    )
    
    cam.position.copy(camPos)
    
    // Mirar en la dirección del periscopio
    target.set(
      camPos.x + dir.x * 100,
      camPos.y + dir.y * 100,
      camPos.z + dir.z * 100
    )
    cam.lookAt(target)
  })

  // FOV algo más abierto que el original: con 26° los árboles cercanos
  // comían el encuadre y no se veía el sector de objetivos.
  return <PerspectiveCamera ref={ref} makeDefault fov={34} near={0.5} far={TERRAIN.width * 3} />
}

/* ------------------------------------------------------------------- escena */

/**
 * Contenido completo del campo de batalla. Se instancia una vez por pantalla.
 * `camera` decide qué "señal" produce esa instancia.
 */
export function Battlefield({ view }: { view: 'tactical' | 'gunsight' }) {
  return (
    <>
      <BattlefieldLights />
      {view === 'tactical' ? <TacticalCamera /> : <GunsightCamera />}
      <Terrain />
      <ScatterProps />
      <PlayerBattery />
      <Targets />
      <Projectiles />
      <Trail />
      <Impacts />
    </>
  )
}