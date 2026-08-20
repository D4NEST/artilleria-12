'use client'

/**
 * ============================================================================
 *  VISTA — El Cuarto de Guerra (UI inmersiva en 3D)
 * ============================================================================
 *  El "menú" del juego ES el escenario: monitor táctico, periscopio, diales y
 *  palancas son geometría real con la que el jugador interactúa por raycast.
 *
 *  El campo de batalla se inyecta en las pantallas con <RenderTexture>: cada
 *  pantalla es una cámara distinta sobre la MISMA escena de combate.
 * ============================================================================
 */

import { useRef } from 'react'
import { RenderTexture, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { AMMO_LIST } from '@/components/game-engine/ammunition'
import { useEngine, useGameState, useViewMode } from '@/components/game-engine/game-provider'
import { Battlefield } from './battlefield'
import { PALETTE } from './battlefield-assets'

const FONT = '/fonts/GeistMono-Regular.ttf'

/* ------------------------------------------------------------------ etiquetas */

function Label({
  text,
  position,
  size = 0.055,
  color = PALETTE.amber,
  rotation,
}: {
  text: string
  position: [number, number, number]
  size?: number
  color?: string
  rotation?: [number, number, number]
}) {
  return (
    <Text
      font={FONT}
      position={position}
      rotation={rotation}
      fontSize={size}
      color={color}
      anchorX="center"
      anchorY="middle"
      letterSpacing={0.08}
    >
      {text}
    </Text>
  )
}

/* -------------------------------------------------------------- estructura */

function RoomShell() {
  return (
    <group>
      {/* Suelo */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 7]} />
        <meshLambertMaterial color="#1c1f23" />
      </mesh>
      {/* Techo */}
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 7]} />
        <meshLambertMaterial color="#191b1f" />
      </mesh>
      {/* Pared frontal, laterales y trasera */}
      <mesh position={[0, 1.6, -3.5]}>
        <planeGeometry args={[9, 3.2]} />
        <meshLambertMaterial color="#24272c" />
      </mesh>
      <mesh position={[-4.5, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[7, 3.2]} />
        <meshLambertMaterial color="#202327" />
      </mesh>
      <mesh position={[4.5, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[7, 3.2]} />
        <meshLambertMaterial color="#202327" />
      </mesh>
      <mesh position={[0, 1.6, 3.5]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[9, 3.2]} />
        <meshLambertMaterial color="#1b1e22" />
      </mesh>

      {/* Vigas del techo: refuerzan la lectura low-poly del espacio */}
      {[-2.4, 0, 2.4].map((z) => (
        <mesh key={z} position={[0, 3.05, z]}>
          <boxGeometry args={[9, 0.22, 0.3]} />
          <meshLambertMaterial color="#15171a" />
        </mesh>
      ))}

      {/* Lámparas de servicio (dos focos cálidos + relleno frío) */}
      {[-2, 2].map((x) => (
        <group key={x} position={[x, 2.95, 0.4]}>
          <mesh>
            <boxGeometry args={[1.2, 0.1, 0.4]} />
            <meshBasicMaterial color="#ffd9a0" />
          </mesh>
          <pointLight intensity={6} distance={7} decay={2} color="#ffd9a0" />
        </group>
      ))}
    </group>
  )
}

function Console() {
  return (
    <group>
      {/* Cuerpo de la consola */}
      <mesh position={[0, 0.5, -2.55]}>
        <boxGeometry args={[8, 1, 0.95]} />
        <meshLambertMaterial color={PALETTE.metalDark} flatShading />
      </mesh>
      {/* Sobremesa */}
      <mesh position={[0, 1.01, -2.55]}>
        <boxGeometry args={[8.1, 0.06, 1.05]} />
        <meshLambertMaterial color={PALETTE.panel} flatShading />
      </mesh>
      {/* Panel inclinado con los instrumentos */}
      <mesh position={[0, 1.28, -2.94]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[8, 0.62, 0.08]} />
        <meshLambertMaterial color="#33373d" flatShading />
      </mesh>
      {/* Rejillas de ventilación */}
      {[-3, -1.5, 1.5, 3].map((x) => (
        <mesh key={x} position={[x, 0.45, -2.07]}>
          <boxGeometry args={[0.9, 0.5, 0.02]} />
          <meshLambertMaterial color="#15171a" />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------- monitor principal */

/** Monitor táctico: vista cenital del campo de batalla en tiempo real. */
function TacticalMonitor() {
  const { setViewMode } = useViewMode()
  const state = useGameState()

  return (
    <group position={[0, 2.05, -3.42]}>
      {/* Carcasa */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[3.9, 2.3, 0.14]} />
        <meshLambertMaterial color="#14161a" flatShading />
      </mesh>
      {/* Pantalla con la señal del campo de batalla */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          setViewMode('monitor')
        }}
      >
        <planeGeometry args={[3.6, 2]} />
        <meshBasicMaterial>
          <RenderTexture attach="map" width={768} height={432} anisotropy={1}>
            <Battlefield view="tactical" />
          </RenderTexture>
        </meshBasicMaterial>
      </mesh>
      <Label text="SECTOR 7 — VISTA TÁCTICA" position={[0, 1.22, 0.02]} size={0.085} />
      <Label
        text={`TURNO ${String(state.turn).padStart(2, '0')}`}
        position={[1.45, -1.16, 0.02]}
        size={0.07}
        color={PALETTE.crt}
      />
    </group>
  )
}

/* -------------------------------------------------------------- periscopio */

/** Periscopio: al pulsarlo la cámara se acerca y aparece el retículo. */
function Periscope() {
  const { setViewMode } = useViewMode()

  return (
    <group position={[1.7, 0, -2.3]}>
      {/* Columna hasta el techo */}
      <mesh position={[0, 2.6, -0.15]}>
        <cylinderGeometry args={[0.17, 0.17, 1.3, 8]} />
        <meshLambertMaterial color={PALETTE.metal} flatShading />
      </mesh>
      <mesh position={[0, 3.02, 0.15]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshLambertMaterial color="#2a2d32" flatShading />
      </mesh>
      {/* Cuerpo del visor */}
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[1.9, 1.2, 0.72]} />
        <meshLambertMaterial color={PALETTE.metal} flatShading />
      </mesh>
      {/* Gomas del ocular */}
      <mesh position={[0, 1.62, 0.37]}>
        <boxGeometry args={[1.74, 1.02, 0.06]} />
        <meshLambertMaterial color="#121316" />
      </mesh>
      {/* Óptica: señal en primera persona desde la boca del cañón */}
      <mesh
        position={[0, 1.62, 0.41]}
        onClick={(e) => {
          e.stopPropagation()
          setViewMode('periscope')
        }}
      >
        <planeGeometry args={[1.6, 0.9]} />
        <meshBasicMaterial>
          <RenderTexture attach="map" width={768} height={432} anisotropy={1}>
            <Battlefield view="gunsight" />
          </RenderTexture>
        </meshBasicMaterial>
      </mesh>
      {/* Asas laterales */}
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 1.45, 0.1]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.06, 0.06, 0.5, 6]} />
          <meshLambertMaterial color="#15171a" />
        </mesh>
      ))}
      <Label text="PERISCOPIO  [V]" position={[0, 2.32, 0.1]} size={0.07} />
    </group>
  )
}

/* ------------------------------------------------------------------- diales */

/** Dial analógico genérico: la aguja gira según `value` (0..1). */
function Gauge({
  position,
  value,
  label,
  color = PALETTE.amber,
}: {
  position: [number, number, number]
  value: number
  label: string
  color?: string
}) {
  const needle = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!needle.current) return
    const target = -Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, Math.max(0, value))
    // Amortiguación: las agujas físicas no saltan, oscilan hacia el valor.
    needle.current.rotation.z += (target - needle.current.rotation.z) * 0.18
  })

  return (
    <group position={position} rotation={[-Math.PI / 2 + 0.5, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.19, 0.19, 0.05, 12]} />
        <meshLambertMaterial color="#15171a" flatShading />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 12]} />
        <meshBasicMaterial color="#0e1013" />
      </mesh>
      {/* Marcas de escala */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = -Math.PI * 0.75 + (Math.PI * 1.5 * i) / 6
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.125, 0.035, -Math.cos(a) * 0.125]}
            rotation={[-Math.PI / 2, 0, -a]}
          >
            <planeGeometry args={[0.012, 0.035]} />
            <meshBasicMaterial color="#5c6068" />
          </mesh>
        )
      })}
      {/* Aguja */}
      <group ref={needle} position={[0, 0.04, 0]} rotation={[0, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.055]}>
          <planeGeometry args={[0.016, 0.12]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
      <Label text={label} position={[0, 0.04, 0.26]} size={0.045} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  )
}

/** Veleta/anemómetro: gira con el rumbo del viento y las palas con la fuerza. */
function WindVane({ position }: { position: [number, number, number] }) {
  const engine = useEngine()
  const vane = useRef<THREE.Group>(null)
  const cups = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    const { wind } = engine.getSnapshot()
    if (vane.current) {
      // El eje Z del mundo mira hacia +Z: convertimos el rumbo a rotación Y.
      const target = -wind.direction
      let delta = target - vane.current.rotation.y
      while (delta > Math.PI) delta -= Math.PI * 2
      while (delta < -Math.PI) delta += Math.PI * 2
      vane.current.rotation.y += delta * 0.12
    }
    if (cups.current) cups.current.rotation.y += wind.speed * dt * 0.9
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.32, 6]} />
        <meshLambertMaterial color="#4a4f56" />
      </mesh>
      {/* Flecha indicadora del rumbo */}
      <group ref={vane} position={[0, 0.34, 0]}>
        <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.14, 4]} />
          <meshBasicMaterial color={PALETTE.amber} />
        </mesh>
        <mesh position={[0, 0, -0.09]}>
          <boxGeometry args={[0.005, 0.09, 0.12]} />
          <meshLambertMaterial color="#6b7078" />
        </mesh>
      </group>
      {/* Copas del anemómetro */}
      <group ref={cups} position={[0, 0.46, 0]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1]}>
              <sphereGeometry args={[0.028, 6, 4]} />
              <meshLambertMaterial color={PALETTE.crt} />
            </mesh>
          )
        })}
      </group>
      <Label text="VIENTO" position={[0, 0.02, 0.16]} size={0.042} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  )
}

/** Palancas de selección de munición: geometría clicable, no un menú 2D. */
function AmmoLevers({ position }: { position: [number, number, number] }) {
  const engine = useEngine()
  const { ammoId } = useGameState()

  return (
    <group position={position}>
      {AMMO_LIST.map((ammo, i) => {
        const active = ammo.id === ammoId
        return (
          <group key={ammo.id} position={[i * 0.34, 0, 0]}>
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.24, 0.04, 0.3]} />
              <meshLambertMaterial color="#15171a" flatShading />
            </mesh>
            <group
              rotation={[active ? -0.55 : 0.35, 0, 0]}
              onClick={(e) => {
                e.stopPropagation()
                engine.selectAmmo(ammo.id)
              }}
            >
              <mesh position={[0, 0.14, 0]}>
                <boxGeometry args={[0.05, 0.28, 0.05]} />
                <meshLambertMaterial color="#5a6068" flatShading />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <sphereGeometry args={[0.045, 8, 6]} />
                <meshBasicMaterial color={active ? PALETTE.amber : '#2f3338'} />
              </mesh>
            </group>
            <Label
              text={ammo.code}
              position={[0, 0.025, 0.22]}
              size={0.036}
              color={active ? PALETTE.amber : '#7a8088'}
              rotation={[-Math.PI / 2, 0, 0]}
            />
          </group>
        )
      })}
    </group>
  )
}

/** Fila de testigos luminosos: integridad del búnker. */
function StatusLamps({ position }: { position: [number, number, number] }) {
  const { playerHp, playerMaxHp } = useGameState()
  const ratio = playerHp / playerMaxHp
  return (
    <group position={position}>
      {Array.from({ length: 5 }).map((_, i) => {
        const on = ratio > i / 5
        return (
          <mesh key={i} position={[i * 0.16, 0.03, 0]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshBasicMaterial color={on ? (ratio > 0.4 ? PALETTE.crt : PALETTE.hostile) : '#23262a'} />
          </mesh>
        )
      })}
      <Label
        text="INTEGRIDAD"
        position={[0.32, 0, 0.16]}
        size={0.04}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  )
}

/* ------------------------------------------------------------------- escena */

export function WarRoom() {
  const state = useGameState()

  return (
    <group>
      <RoomShell />
      <Console />
      <TacticalMonitor />
      <Periscope />

      {/* Instrumentos: leen el estado del motor, nunca lo modifican salvo por
          interacción explícita del jugador. */}
      <Gauge position={[-0.55, 1.06, -2.45]} value={state.power} label="POTENCIA" />
      <Gauge
        position={[0.1, 1.06, -2.45]}
        value={state.aim.elevation / 1.25}
        label="ELEVACION"
        color={PALETTE.crt}
      />
      <Gauge
        position={[-1.2, 1.06, -2.45]}
        value={(state.aim.azimuth + 0.75) / 1.5}
        label="AZIMUT"
        color={PALETTE.crt}
      />
      <WindVane position={[-2.1, 1.04, -2.5]} />
      <AmmoLevers position={[-3.35, 1.04, -2.5]} />
      <StatusLamps position={[2.6, 1.04, -2.5]} />
    </group>
  )
}
