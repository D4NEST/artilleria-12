# Guía de Desarrollo

Esta guía explica cómo trabajar con el proyecto, tomar decisiones de arquitectura y mantener la calidad del código.

---

## Filosofía del Proyecto

### Principios Core

1. **Separación Estricta de Capas**
   - El motor NUNCA importa React o Three.js
   - La vista NUNCA modifica estado directamente, solo emite comandos
   - El dominio es TypeScript puro y 100% testeable

2. **Determinismo**
   - La física usa paso fijo (120 Hz)
   - El terreno es una función determinista
   - Los resultados son consistentes entre ejecuciones

3. **Rendimiento Primero**
   - Lectura imperativa para datos de alta frecuencia
   - Sin re-renders innecesarios de React
   - Low-poly por diseño, no por limitación

4. **Documentación en el Código**
   - Comentarios extensos en español
   - Intenciones claras
   - "Por qué" sobre "qué"

---

## Configuración del Entorno

### Requisitos

- Node.js 18+ (recomendado 20+)
- pnpm 8+ (gestor de paquetes del proyecto)
- VS Code (recomendado) con extensiones:
  - ESLint
  - Prettier
  - TypeScript Hero

### Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd artillery-warfare-game

# Instalar dependencias
pnpm install

# Iniciar en modo desarrollo
pnpm dev
```

### Scripts Disponibles

```bash
pnpm dev          # Servidor de desarrollo (localhost:3000)
pnpm build        # Build de producción
pnpm start        # Servidor de producción
pnpm lint         # Linting con ESLint
```

---

## Estructura de Archivos

```
artillery-warfare-game/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Entrada principal
│   ├── layout.tsx            # Layout raíz
│   └── globals.css           # Estilos globales
│
├── components/
│   ├── game.tsx              # Composición raíz de capas
│   │
│   ├── game-engine/          # CAPA DE DOMINIO + CONTROLADOR
│   │   ├── engine.ts         # Controlador principal
│   │   ├── types.ts          # Tipos del dominio
│   │   ├── physics.ts        # Física balística
│   │   ├── terrain.ts        # Terreno procedural
│   │   ├── ammunition.ts     # Catálogo de munición
│   │   └── game-provider.tsx # Puente React
│   │
│   ├── hud/                  # CAPA DE VISTA 2D
│   │   ├── hud.tsx
│   │   ├── fire-control.tsx
│   │   ├── telemetry.tsx
│   │   └── reticle.tsx
│   │
│   └── three-scene/          # CAPA DE VISTA 3D
│       ├── scene-root.tsx
│       ├── war-room.tsx
│       ├── battlefield.tsx
│       ├── player-camera.tsx
│       └── battlefield-assets.ts
│
├── hooks/                    # Hooks personalizados
│   └── use-player-input.ts
│
├── lib/                      # Utilidades compartidas
│   └── utils.ts
│
├── docs/                     # Documentación
│   ├── ARCHITECTURE.md
│   ├── AUDIT-REPORT.md
│   ├── ROADMAP.md
│   ├── TASKS.md
│   └── DEVELOPMENT.md (este archivo)
│
├── README.md
├── CHANGELOG.md
├── package.json
└── tsconfig.json
```

---

## Decisiones de Arquitectura

### ¿Por qué hexagonal/clean architecture?

**Problema:** Los juegos suelen acoplar lógica con renderizado, dificultando testing y cambios.

**Solución:** Separar en tres capas:
1. **Dominio**: Lógica pura, sin dependencias externas
2. **Controlador**: Orquestación y estado
3. **Vista**: Presentación e interacción

**Beneficios:**
- Motor 100% testeable sin mockear Three.js
- Cambiar renderizador sin tocar lógica
- Ejecutar motor en servidor (para multijugador futuro)
- Mantenibilidad a largo plazo

### ¿Por qué paso fijo en física?

**Problema:** Física dependiente del framerate produce resultados inconsistentes.

**Solución:** Acumular delta time y simular en pasos fijos (1/120s):

```typescript
accumulator += dt
while (accumulator >= FIXED_DT) {
  simulate(FIXED_DT)
  accumulator -= FIXED_DT
}
```

**Beneficios:**
- Resultados idénticos a 30, 60, o 144 fps
- Determinismo para testing
- Sin "spiral of death" en frames lentos

### ¿Por qué lectura imperativa para datos continuos?

**Problema:** React re-renderiza en cada cambio de estado, matando el rendimiento a 60 fps.

**Solución:** Leer datos directamente del motor en `useFrame`:

```typescript
// ✅ Correcto: lectura imperativa
useFrame(() => {
  const projectile = engine.projectiles[0]
  if (projectile) {
    mesh.position.set(projectile.position.x, ...)
  }
})

// ❌ Incorrecto: estado reactivo
const projectile = useStore(state => state.projectiles[0]) // Re-render cada frame
```

**Beneficios:**
- Sin re-renders de React por frame
- Rendimiento estable
- Control fino de actualizaciones

### ¿Por qué low-poly sin texturas?

**Problema:** Texturas y modelos complejos aumentan bundle y tiempo de carga.

**Solución:** Estética low-poly con materiales planos (MeshLambertMaterial):

**Beneficios:**
- Bundle pequeño (< 2MB)
- Carga rápida
- Rendimiento en gama baja
- Estética coherente

---

## Flujo de Trabajo

### Añadir Nueva Funcionalidad

#### 1. Definir en el Dominio
Si la funcionalidad es de "reglas de juego":

```typescript
// 1. Añadir tipo en types.ts
interface NewFeature { ... }

// 2. Implementar en archivo nuevo o existente
export function calculateNewFeature(...): number { ... }
```

#### 2. Integrar en el Controlador
Si afecta el estado del juego:

```typescript
// engine.ts
class GameEngine {
  // Añadir al estado
  private state: GameState {
    ...
    newFeature: NewFeatureState
  }
  
  // Añadir comando si es accionable por jugador
  performNewFeatureAction(): void { ... }
}
```

#### 3. Exponer en la Vista
Si debe visualizarse:

```typescript
// game-provider.tsx - ya se expone automáticamente
const state = useGameState()

// three-scene o hud - leer estado
const { newFeature } = useGameState()
```

#### 4. Añadir Entrada (si aplica)
Si el jugador puede activarlo:

```typescript
// use-player-input.ts
switch (e.code) {
  case 'KeyN':
    engine.performNewFeatureAction()
    break
}
```

### Añadir Nueva Munición

```typescript
// 1. ammunition.ts
export type AmmoId = 'he' | 'ap' | 'cluster' | 'nueva'

export const AMMO: Record<AmmoId, AmmoSpec> = {
  ...
  nueva: {
    id: 'nueva',
    name: 'Nueva Munición',
    code: 'NM-99',
    mass: 28,
    drag: 0.0006,
    muzzleFactor: 1.1,
    blastRadius: 18,
    damage: 65,
    description: 'Descripción...'
  }
}

// 2. Añadir tecla en use-player-input.ts (si es necesario)
// 3. Actualizar HUD si se requiere UI especial
```

### Añadir Nuevo Objetivo

```typescript
// 1. types.ts - actualizar tipo si es nueva categoría
interface Target {
  ...
  kind: 'bunker' | 'tower' | 'depot' | 'nuevo'
}

// 2. engine.ts - createTargets()
{ id: 'nuevo-a', x: 100, z: -20, kind: 'nuevo', hp: 120 }

// 3. battlefield.tsx - TargetMesh
{target.kind === 'nuevo' && (
  <mesh geometry={...} material={...} />
)}
```

---

## Testing

### Estrategia de Testing

```
┌─────────────────────────────────────────┐
│           E2E Tests (Playwright)        │  ← Pocas, lentas
├─────────────────────────────────────────┤
│       Integration Tests (Vitest)        │  ← Algunas
├─────────────────────────────────────────┤
│          Unit Tests (Vitest)            │  ← Muchas, rápidas
└─────────────────────────────────────────┘
```

### Unit Tests (Prioridad)

**Dominio (physics, terrain, ammunition)**
- Física: trayectorias, viento, impacto
- Terreno: altura, límites, determinismo
- Munición: velocidad de boca

**Controlador (engine)**
- Máquina de estados
- Comandos de jugador
- Resolución de daño
- IA básica

### Integration Tests

- Flujo completo de turno
- Combate jugador vs IA
- Victoria/derrota

### E2E Tests (Post-v1.0)

- Playthrough completo
- Cross-browser

### Ejecutar Tests

```bash
# Tests unitarios
pnpm test

# Tests con UI
pnpm test:ui

# Coverage
pnpm test:coverage
```

---

## Debugging

### React DevTools

- Usar el tab "Components" para ver estado de Context
- Verificar que useGameState se actualiza

### Three.js Inspector

- Extensión de Chrome: Three.js Developer Tools
- Inspeccionar escena, geometrías, materiales

### Debug Flags

Añadir temporalmente:

```typescript
// engine.ts
const DEBUG_PHYSICS = true

if (DEBUG_PHYSICS) {
  console.log('Projectile:', p.position, p.velocity)
}
```

### Visual Debug

Añadir helpers en battlefield:

```typescript
// Mostrar hitboxes
<mesh position={target.position}>
  <sphereGeometry args={[target.radius, 16]} />
  <meshBasicMaterial color="red" wireframe />
</mesh>
```

---

## Performance

### Profiling

```bash
# Build de producción
pnpm build
pnpm start

# Chrome DevTools > Performance tab
# Grabar 10 segundos de gameplay
```

### Métricas a Vigilar

- FPS estable > 55
- Frame time < 18ms
- Memory sin crecimiento
- Scripting time < 8ms

### Optimizaciones Aplicadas

1. **Instanced Meshes** - Rocas y árboles en 3 draw calls
2. **Shared Geometries** - Sin duplicación
3. **Imperative Reads** - Sin re-renders por frame
4. **Fixed DPR** - Máximo 1.5x
5. **No Antialiasing** - Low-poly aesthetic

---

## Commits y PRs

### Formato de Commit

```
<tipo>(<área>): <descripción>

[cuerpo opcional]
```

**Tipos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Refactorización sin cambio de comportamiento
- `docs`: Documentación
- `test`: Tests
- `chore`: Mantenimiento

**Áreas:**
- `engine`: Motor de juego
- `physics`: Física
- `hud`: Interfaz 2D
- `scene`: Renderizado 3D
- `input`: Sistema de entrada
- `audio`: Audio (futuro)

**Ejemplos:**
```
feat(engine): añadir sistema de audio básico
fix(physics): corregir cálculo de arrastre con viento nulo
refactor(engine): extraer IA a módulo separado
docs(readme): actualizar instrucciones de instalación
test(physics): añadir tests de trayectoria con viento
```

### Checklist de PR

- [ ] Código compila sin errores
- [ ] Tests pasan (si aplica)
- [ ] Sin warnings de lint
- [ ] Documentación actualizada (si aplica)
- [ ] Changelog actualizado (para features)
- [ ] Revisado por al menos 1 persona (si hay equipo)

---

## Recursos

### Documentación Oficial

- [Next.js](https://nextjs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Three.js](https://threejs.org/docs/)
- [Vitest](https://vitest.dev/)

### Inspiración y Referencias

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)
- [React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/)

---

**Última actualización:** Agosto 2026
