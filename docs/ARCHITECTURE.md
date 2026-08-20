# Arquitectura del Motor de Juego

## Visión General

El motor sigue una arquitectura **hexagonal** (también conocida como "ports and adapters" o "clean architecture") con separación estricta entre:

1. **Dominio (Modelo)**: Lógica de juego pura, sin dependencias externas
2. **Aplicación (Controlador)**: Orquestación del estado y flujos de juego
3. **Presentación (Vista)**: Renderizado y entrada de usuario

## Flujo de Datos

```
┌──────────────────────────────────────────────────────────────────┐
│                         CAPA DE VISTA                            │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │   Entrada   │───▶│ GameProvider │◀───│  Renderizado 3D  │    │
│  │  (DOM/KB)   │    │   (Context)  │    │   (Three Fiber)  │    │
│  └─────────────┘    └──────┬───────┘    └──────────────────┘    │
│                            │                                     │
│         useSyncExternalStore │ useFrame (imperativo)            │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                      CAPA DE CONTROLADOR                         │
│                            │                                     │
│                     ┌──────▼───────┐                             │
│                     │  GameEngine  │                             │
│                     │   (Clase)    │                             │
│                     └──────┬───────┘                             │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                 │
│    ┌────▼────┐       ┌─────▼─────┐      ┌────▼────┐            │
│    │ Estado  │       │   Física  │      │   IA    │            │
│    │ (Store) │       │ (Loop)    │      │ (Enemy) │            │
│    └─────────┘       └───────────┘      └─────────┘            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                        CAPA DE DOMINIO                           │
│                            │                                     │
│    ┌───────────────────────┼───────────────────────┐            │
│    │                       │                       │            │
│ ┌──▼────────┐  ┌───────────▼──────────┐  ┌───────▼──────┐      │
│ │   Types   │  │      Physics         │  │   Terrain    │      │
│ │ (Puros)   │  │ (Balística)          │  │ (Procedural) │      │
│ └───────────┘  └──────────────────────┘  └──────────────┘      │
│                                                                  │
│ ┌─────────────┐  ┌───────────────────────┐                     │
│ │ Ammunition  │  │     Constantes        │                     │
│ │ (Catálogo)  │  │    (Configuración)    │                     │
│ └─────────────┘  └───────────────────────┘                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Componentes por Capa

### Capa de Dominio (`components/game-engine/`)

#### `types.ts` - Contratos del Dominio
```typescript
// Definiciones puras, sin implementación
interface Vec3 { x: number; y: number; z: number }
interface GameState { phase: GamePhase; turn: number; ... }
interface Target { id: string; position: Vec3; hp: number; ... }
```

**Responsabilidades:**
- Definir tipos e interfaces del dominio
- Sin dependencias de React, Three.js, o el navegador
- Contratos que cualquier implementación debe respetar

#### `physics.ts` - Motor de Física
```typescript
// Integrador semi-implícito (Euler simpléctico)
export function stepProjectile(p: Projectile, wind: Vec3, dt: number): StepResult
export function laserRange(origin: Vec3, azimuth: number, elevation: number): number
```

**Responsabilidades:**
- Simulación balística determinista
- Arrastre aerodinámico respecto al viento
- Paso fijo (FIXED_DT = 1/120) para consistencia

#### `terrain.ts` - Generación de Terreno
```typescript
// Función matemática, no malla
export function terrainHeight(x: number, z: number): number
export function insideTerrain(x: number, z: number): boolean
export function scatterProps(count?: number): Prop[]
```

**Responsabilidades:**
- Terreno procedural determinista (semilla fija)
- Consulta de alturas sin dependencia de renderizado
- Generación de props decorativos

#### `ammunition.ts` - Configuración de Munición
```typescript
export const AMMO: Record<AmmoId, AmmoSpec> = {
  he: { mass: 22, drag: 0.0009, blastRadius: 14, ... },
  ap: { mass: 34, drag: 0.00035, blastRadius: 7, ... },
  cluster: { mass: 12, drag: 0.0022, blastRadius: 24, ... }
}
```

**Responsabilidades:**
- Catálogo de tipos de munición
- Parámetros balísticos por tipo
- Extensible sin modificar física

### Capa de Controlador (`components/game-engine/engine.ts`)

#### `GameEngine` - Clase Principal
```typescript
export class GameEngine {
  // Estado reactivo
  private state: GameState
  private listeners = new Set<() => void>()
  
  // Entidades de alta frecuencia (sin React)
  readonly projectiles: Projectile[]
  readonly effects: ImpactEffect[]
  readonly trail: Vec3[]
  
  // API pública
  subscribe(fn: () => void): () => void
  getSnapshot(): GameState
  update(dt: number): void
  
  // Comandos
  adjustAim(dAzimuth: number, dElevation: number): void
  selectAmmo(ammoId: AmmoId): void
  startCharging(): void
  releaseAndFire(): void
  reset(): void
}
```

**Responsabilidades:**
- Mantener el estado del juego
- Procesar comandos del jugador
- Avanzar la simulación (update loop)
- Gestionar la máquina de estados de turnos
- Coordinar IA enemiga

**Máquina de Estados:**
```
aiming ──fire──▶ flying ──impact──▶ impact
   ▲                                      │
   │                                      ▼
   └──────beginPlayerTurn──── enemy ◀─────┘
                        (IA dispara)  │
                                      ▼
                                  gameover
```

### Capa de Puente (`components/game-engine/game-provider.tsx`)

#### `GameProvider` - Integración React
```typescript
export function GameProvider({ children }: { children: React.ReactNode })
export function useEngine(): GameEngine
export function useGameState(): GameState
export function useViewMode(): { viewMode: ViewMode; setViewMode: (m: ViewMode) => void }
```

**Responsabilidades:**
- Único punto donde React "toca" el motor
- Instancia singleton de GameEngine
- Estado de presentación (viewMode)
- Suscripción reactiva vía useSyncExternalStore

### Capa de Vista

#### Vista 2D (`components/hud/`)
- **hud.tsx**: Contenedor principal del HUD
- **fire-control.tsx**: Panel de control de tiro
- **telemetry.tsx**: Panel de datos de telemetría
- **reticle.tsx**: Retículo de apuntado (periscopio)

**Características:**
- Lectura de snapshot a ~20 Hz (suficiente para HUD)
- Sin escritura directa al motor (solo comandos)
- Marcado con `data-hud` para filtrar eventos

#### Vista 3D (`components/three-scene/`)
- **scene-root.tsx**: Canvas raíz y GameLoop
- **war-room.tsx**: Cuarto de guerra (UI inmersiva)
- **battlefield.tsx**: Campo de batalla
- **player-camera.tsx**: Cámara FPS
- **battlefield-assets.ts**: Recursos compartidos

**Características:**
- Lectura imperativa en `useFrame` (60+ Hz)
- Sin re-renders de React por frame
- RenderTexture dual (monitor + periscopio)
- Instanced meshes para rendimiento

#### Controlador de Entrada (`hooks/use-player-input.ts`)
```typescript
export function usePlayerInput(
  engine: GameEngine,
  viewMode: ViewMode,
  setViewMode: (m: ViewMode) => void
)
```

**Responsabilidades:**
- Traducir eventos DOM a comandos del motor
- Filtrar eventos según contexto (HUD vs juego)
- Soporte para teclado y ratón

## Patrones Utilizados

### Observer (Store Reactivo)
```typescript
// El motor expone suscripción
engine.subscribe(callback)
engine.getSnapshot()

// React se sincroniza
useSyncExternalStore(engine.subscribe, engine.getSnapshot)
```

### Command Pattern
```typescript
// Comandos encapsulan acciones
engine.adjustAim(dx, dy)
engine.selectAmmo('he')
engine.fire()
```

### Separation of Concerns
- **Estado discreto** (turno, HP, fase): Reactivo, ~20 Hz
- **Estado continuo** (posición proyectil): Imperativo, 60+ fps
- **Estado de presentación** (cámara): Solo en Vista

### Deterministic Simulation
```typescript
// Física con paso fijo
const FIXED_DT = 1/120
accumulator += dt
while (accumulator >= FIXED_DT) {
  simulate(FIXED_DT)
  accumulator -= FIXED_DT
}
```

## Extensibilidad

### Añadir Nueva Munición
```typescript
// 1. Definir en ammunition.ts
export const AMMO: Record<AmmoId, AmmoSpec> = {
  ...existingAmmo,
  nuclear: {
    id: 'nuclear',
    mass: 50,
    drag: 0.0001,
    blastRadius: 100,
    damage: 200,
    ...
  }
}

// 2. Actualizar tipo
export type AmmoId = 'he' | 'ap' | 'cluster' | 'nuclear'

// ¡Listo! Sin cambios en física ni renderizado
```

### Añadir Nuevo Objetivo
```typescript
// 1. Añadir tipo en types.ts
interface Target {
  ...
  kind: 'bunker' | 'tower' | 'depot' | 'bridge' // nuevo
}

// 2. Definir en createTargets() (engine.ts)
{ id: 'bridge-d', x: 80, z: 0, kind: 'bridge', hp: 150 }

// 3. Renderizar en TargetMesh (battlefield.tsx)
{target.kind === 'bridge' && (
  <mesh ... />
)}
```

### Cambiar Motor Gráfico
1. Mantener `game-engine/` intacto
2. Crear nueva capa de vista (ej. `babylon-scene/`)
3. Llamar a `engine.update(dt)` desde el nuevo loop
4. Leer estado vía `engine.getSnapshot()` y propiedades públicas

## Consideraciones de Rendimiento

1. **Evitar Re-renders de React**
   - Estado continuo se lee imperativamente
   - Snapshot se emite a ~20 Hz máximo

2. **Instanced Meshes**
   - Rocas y árboles: 1 draw call por tipo
   - Hasta 110+ objetos en 3 draw calls

3. **Geometrías Compartidas**
   - Caché a nivel de módulo
   - Sin duplicación entre monitores

4. **Paso Fijo de Física**
   - Independiente de framerate
   - Consistencia entre 30-144 fps

5. **Low-Poly Aesthetic**
   - Sin texturas (solo materiales planos)
   - Sin sombras dinámicas
   - DPR limitado

---

**Regla de Oro**: El motor nunca debe importar React, Three.js, o cualquier dependencia del navegador. La vista nunca debe modificar el estado directamente, solo emitir comandos.
