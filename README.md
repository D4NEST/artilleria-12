# Artillery Warfare Game

Juego de artillería por turnos con vista inmersiva 3D en un cuarto de guerra militar.

## Descripción

Simulador de artillería ambientado en un búnker militar donde el jugador asume el rol de artillero. El juego presenta una arquitectura hexagonal (MVC) donde el motor de juego es completamente agnóstico de la tecnología de renderizado.

## Estado del Proyecto

**Versión:** 0.1.0 (Alpha funcional)  
**Estado:** Core completo, funcionalidades básicas implementadas  
**Fecha de auditoría:** Agosto 2026

## Arquitectura

### Capas del Sistema

```
┌─────────────────────────────────────────────────────┐
│                   VISTA (React/Three.js)            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   HUD 2D     │  │ Escena 3D    │  │  Entrada  │ │
│  │  (DOM)       │  │ (Three Fiber)│  │ (Events)  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              PUENTE (React <-> Engine)              │
│              GameProvider (Context)                 │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              CONTROLADOR (GameEngine)               │
│         Turnos, física, IA, estado del juego        │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                 MODELO (Domain Layer)               │
│    Types, Physics, Terrain, Ammunition (puro TS)    │
└─────────────────────────────────────────────────────┘
```

### Principios de Diseño

1. **Separación estricta**: El motor NO conoce React ni Three.js
2. **Testeabilidad**: La lógica del juego es TypeScript puro, sin dependencias del DOM
3. **Determinismo**: Física con paso fijo (120 Hz) para resultados consistentes
4. **Rendimiento**: Lectura imperativa para datos de alta frecuencia (60+ fps)

## Tecnologías

| Tecnología | Propósito | Versión |
|------------|-----------|---------|
| Next.js | Framework React | 16.3.0 |
| React | UI | 19.x |
| Three.js | Renderizado 3D | 0.185.x |
| React Three Fiber | Integración React/Three | 9.7.0 |
| React Three Drei | Helpers 3D | 10.7.8 |
| TypeScript | Tipado | 5.7.3 |
| Tailwind CSS | Estilos | 4.3.3 |

## Estructura del Proyecto

```
artillery-warfare-game/
├── app/
│   ├── page.tsx              # Punto de entrada
│   ├── layout.tsx            # Layout raíz
│   └── globals.css           # Estilos globales
├── components/
│   ├── game.tsx              # Composición raíz
│   ├── game-engine/          # MOTOR (Capa de dominio)
│   │   ├── engine.ts         # Controlador principal
│   │   ├── types.ts          # Tipos del dominio
│   │   ├── physics.ts        # Física balística
│   │   ├── terrain.ts        # Terreno procedural
│   │   ├── ammunition.ts     # Catálogo de municiones
│   │   └── game-provider.tsx # Puente React
│   ├── hud/                  # VISTA 2D (DOM)
│   │   ├── hud.tsx           # Contenedor HUD
│   │   ├── fire-control.tsx  # Panel de control
│   │   ├── telemetry.tsx     # Datos de telemetría
│   │   └── reticle.tsx       # Retículo de apuntado
│   └── three-scene/          # VISTA 3D (Three.js)
│       ├── scene-root.tsx    # Canvas raíz
│       ├── war-room.tsx      # Cuarto de guerra
│       ├── battlefield.tsx   # Campo de batalla
│       ├── player-camera.tsx # Cámara FPS
│       └── battlefield-assets.ts # Recursos gráficos
├── hooks/
│   └── use-player-input.ts   # Controlador de entrada
└── lib/
    └── utils.ts              # Utilidades compartidas
```

## Mecánicas Implementadas

### Sistema de Turnos
- Fases: `aiming` → `flying` → `impact` → `enemy` → `aiming`
- IA enemiga con precisión variable según turno
- Viento aleatorio por turno

### Balística
- Física realista con arrastre aerodinámico
- Viento afecta la trayectoria
- 3 tipos de munición con características distintas:
  - **HE (Alto Explosivo)**: Equilibrada, radio medio
  - **AP (Perforante)**: Densa, rápida, poco afectada por viento
  - **Cluster (Racimo)**: Ligera, gran radio, muy afectada por viento

### Sistema de Combate
- 3 objetivos destructibles (depot, tower, bunker)
- Daño por proximidad con falloff
- HP del jugador (búnker)
- Condiciones de victoria/derrota

### Interfaz Inmersiva
- Tres "estaciones" de cámara: Room, Monitor, Periscopio
- HUD minimalista estilo "cuaderno del artillero"
- Instrumentos 3D clicable (diales, palancas, pantallas)
- Renderizado dual (monitor táctico + periscopio)

## Controles

| Tecla | Acción |
|-------|--------|
| V / P | Periscopio (apuntado) |
| M | Monitor táctico |
| R / Escape | Vista de cabina |
| 1 / 2 / 3 | Seleccionar munición |
| Espacio (mantener) | Cargar potencia |
| Espacio (soltar) | Disparar |
| Ratón | Apuntar (en periscopio) |
| Enter | Nueva misión (post-partida) |

## Instalación y Ejecución

```bash
# Instalar dependencias
pnpm install

# Modo desarrollo
pnpm dev

# Build producción
pnpm build
pnpm start

# Linting
pnpm lint
```

## Rendimiento

Optimizaciones implementadas:
- DPR limitado (1-1.5x)
- Sin antialiasing (estilo low-poly)
- Instanced meshes para decoración
- Lectura imperativa evitando re-renders
- Paso fijo de física (independiente de FPS)
- Geometrías y materiales compartidos

## Testing

Suite de Vitest en `tests/` — 110 tests sobre física, terreno, munición, IA y
máquina de turnos. Ver la sección **Tests** al final de este documento.

---

**Nota:** Este proyecto sigue una arquitectura hexagonal estricta. Cualquier modificación debe respetar la separación entre capas (Modelo, Controlador, Vista).

## Tests

```bash
pnpm test            # 110 tests (Vitest)
pnpm test:watch
pnpm test:coverage
pnpm typecheck
pnpm check           # typecheck + tests + build
```

La suite cubre física, terreno, munición, IA enemiga y la máquina de turnos.
Corre en Node, sin navegador: el motor es TypeScript puro por diseño.
