# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed — el juego vuelve a ser jugable

- **Monitor táctico en negro.** La carcasa del monitor (`war-room.tsx`) tenía
  su cara frontal en `z = +0.01` y el plano de la pantalla en `z = 0`: el
  bisel tapaba la señal entera. La carcasa pasa a `z = -0.12`.
- **Tipografía inexistente en el canvas 3D.** `<Text>` de drei apuntaba a
  `/fonts/GeistMono-Regular.ttf`, que no existía en `public/`. Troika dejaba
  la promesa rechazada dentro de Suspense y tumbaba el árbol del `<Canvas>`.
  Se sirve la fuente desde `public/fonts/` y cada rótulo va aislado en su
  propio `<Suspense>` para que un fallo de fuente nunca vuelva a costar la
  escena completa.
- **Error de hidratación.** `GameEngine` llamaba a `Math.random()` en el
  constructor (viento inicial), de modo que el HTML del servidor y el del
  cliente no coincidían. El motor pasa a usar un LCG sembrado
  (`rng.ts`, semilla fija por defecto) y `GameProvider` lo resiembra con
  `Date.now()` en un `useEffect`, ya en el navegador.
- **Fuentes de Google en tiempo de build.** `next/font/google` rompía
  `next build` sin acceso a `fonts.googleapis.com`. Se auto-alojan Oswald y
  Geist Mono con `next/font/local` (`app/fonts.ts`).
- **Las familias tipográficas no se aplicaban.** Los objetos de `next/font`
  se creaban pero su `className`/`variable` nunca llegaba al `<html>`, así
  que `--font-sans` y `--font-mono` de `globals.css` quedaban sin resolver.
- **Diales averiados.** Los tres `Gauge` de la consola miraban a la pared
  (signo de la rotación en X invertido) y la aguja giraba sobre `rotation.z`,
  eje sobre el que su brazo —que cuelga en `-Z`— no se desplaza. Ahora la
  esfera mira al jugador y la aguja gira sobre el eje del dial.
- **Rótulos invisibles o en espejo.** Los del monitor caían sobre el techo y
  detrás de la consola; los de los diales heredaban la rotación del dial y se
  leían al revés.
- **Periscopio apuntando al cielo.** La óptica y el telémetro seguían el eje
  del tubo: con la elevación inicial de 34° solo se veía cielo y el telémetro
  devolvía siempre 0 ("SIN ECO"). Se separa la **línea de mira** del eje del
  cañón (`SIGHT`, `SIGHT_ELEVATION` en `engine.ts`) y se sube la cabeza del
  periscopio a un mástil de 22 m, desde donde los tres objetivos quedan en
  línea de visión franca.
- **El jugador era invulnerable.** La IA resolvía el tiro con la fórmula del
  vacío e ignoraba el arrastre, así que se quedaba corta *siempre*. Ahora
  corrige tiro simulando su propio disparo con la física real.
- **Turno enemigo colgado.** Si no quedaba ninguna batería viva, `enemyFire()`
  salía sin disparar y la partida se quedaba encallada en la fase `enemy`.
- **Cabina a oscuras.** Luz ambiental y direccional subidas: con los valores
  anteriores los materiales Lambert del cuarto quedaban casi en negro.
- **404 de Vercel Analytics** en cada carga local: el script solo se inyecta
  cuando hay `NEXT_PUBLIC_VERCEL_ENV`.

### Added

- **Suite de tests con Vitest** (`vitest.config.mts`, carpeta `tests/`):
  110 tests sobre física, terreno, munición, IA y máquina de turnos.
  Cobertura del ~96-100 % en los módulos del motor.
  Scripts: `test`, `test:watch`, `test:coverage`, `typecheck`, `check`.
- **`components/game-engine/enemy-ai.ts`** — IA enemiga extraída de
  `engine.ts` como funciones puras y parametrizada por `EnemyAiProfile`
  (perfiles `recluta`, `veterano`, `elite`). Incluye corrección de tiro por
  bisección sobre la física real, así que se adapta sola si la física cambia.
- **`components/game-engine/rng.ts`** — generador determinista sembrado.
- **`components/game-engine/audio-manager.ts`** — interfaz de audio lista para
  integrar: `resolveAudioEvents()` (función pura: dos snapshots → eventos de
  sonido, ya testeada), un manager mudo por defecto y una implementación con
  WebAudio por síntesis procedimental que no necesita ficheros de audio.
- **Lectura de elevación en el retículo del periscopio**, ahora que la óptica
  ya no sigue al tubo.
- **Mástil del periscopio** dibujado en el campo de batalla.

### Changed

- `GameEngine` acepta `{ seed, enemyProfile }` y expone `reseed()`,
  `getSeed()` y `planEnemyShot()`.
- Dispersión de la IA recalibrada contra el radio de daño del HE-72: ~29 % de
  acierto en el turno 1 y ~98 % en el turno 12, en vez de acertar siempre.
- `next.config.mjs`: `typescript.ignoreBuildErrors` pasa a `false`.
- Resolución de las pantallas: monitor 1024×576, periscopio 1280×720.
- Se elimina el script `lint` (invocaba un ESLint que no está instalado) y se
  añade `check` (typecheck + tests + build).

---

## [0.1.0-docs]

### Added
- Comprehensive documentation suite:
  - README.md with project overview and setup instructions
  - docs/ARCHITECTURE.md with detailed architecture documentation
  - docs/AUDIT-REPORT.md with current state analysis
  - docs/ROADMAP.md with development plan
  - docs/TASKS.md with immediate action items
  - CHANGELOG.md for tracking changes

### Changed
- Initial documentation creation and project audit

---

## [0.1.0] - 2026-08-19 (Estimated)

### Added - Core Engine
- **GameEngine** (`components/game-engine/engine.ts`)
  - Turn-based state machine with phases: aiming, flying, impact, enemy, gameover
  - Reactive store with subscribe/getSnapshot pattern
  - Fixed timestep simulation (120 Hz physics)
  - Projectile management and trail tracking
  - Impact effects system
  - Basic enemy AI with turn-based difficulty scaling
  - Victory/defeat conditions
  - Score tracking (shots fired, hits, precision)

### Added - Physics System
- **Ballistics** (`components/game-engine/physics.ts`)
  - Semi-implicit Euler integrator
  - Aerodynamic drag relative to air velocity
  - Wind affects trajectory naturally
  - Terrain collision detection with interpolation
  - Laser rangefinder (ray marching)
  - Ballistic solver for enemy AI

### Added - Terrain System
- **Procedural Terrain** (`components/game-engine/terrain.ts`)
  - Deterministic height function (sum of sines)
  - Player battery plateau for clean shooting
  - Bounds checking
  - Normal calculation
  - Prop scattering (rocks and trees) with LCG random

### Added - Ammunition System
- **Ammo Types** (`components/game-engine/ammunition.ts`)
  - HE (High Explosive): balanced, medium blast radius
  - AP (Armor Piercing): dense, fast, wind-resistant, small radius
  - Cluster: light, large radius, wind-sensitive
  - Muzzle speed calculation based on power

### Added - Domain Types
- **Type Definitions** (`components/game-engine/types.ts`)
  - Vec3, GameState, GamePhase, Target, Projectile, etc.
  - No external dependencies (pure TypeScript)

### Added - React Integration
- **GameProvider** (`components/game-engine/game-provider.tsx`)
  - React Context for engine instance
  - useEngine() hook for commands
  - useGameState() hook with useSyncExternalStore
  - useViewMode() for camera station management

### Added - 3D Rendering
- **Scene Root** (`components/three-scene/scene-root.tsx`)
  - Canvas with performance optimizations
  - GameLoop component with useFrame
  - Lighting setup for military aesthetic

- **War Room** (`components/three-scene/war-room.tsx`)
  - Room geometry (walls, floor, ceiling)
  - Tactical monitor with RenderTexture
  - Periscope with gunsight camera
  - Analog gauges (power, elevation, azimuth)
  - Wind vane/anemometer
  - Ammo levers (clickable)
  - Status lamps (player HP)

- **Battlefield** (`components/three-scene/battlefield.tsx`)
  - Terrain mesh with vertex colors
  - Instanced props (rocks and trees)
  - Player battery with animated turret
  - Target meshes (bunker, tower, depot)
  - Projectile rendering
  - Trail line (THREE.Line)
  - Impact effects (blast, smoke)
  - Persistent craters
  - Dual camera setup (tactical and gunsight)

- **Player Camera** (`components/three-scene/player-camera.tsx`)
  - Three stations: room, monitor, periscope
  - Smooth transitions with lerping
  - Free-look in room mode
  - FOV adjustment per station

- **Battlefield Assets** (`components/three-scene/battlefield-assets.ts`)
  - Shared geometries (box, rock, tree, etc.)
  - Shared materials (flatShading, no textures)
  - Color palette definition
  - Cached terrain geometry

### Added - HUD
- **HUD Container** (`components/hud/hud.tsx`)
  - Station switcher
  - Telemetry panel (left)
  - Fire control panel (right)
  - Outcome screen (victory/defeat)

- **Fire Control** (`components/hud/fire-control.tsx`)
  - Power bar with markers
  - Ammo selector
  - Fire button (hold to charge)
  - Integrity bar (player HP)
  - Turn messages

- **Telemetry** (`components/hud/telemetry.tsx`)
  - Range finder display
  - Wind speed and direction
  - Elevation and azimuth angles
  - Muzzle velocity
  - Active targets count
  - Accuracy percentage
  - Ammo characteristics

- **Reticle** (`components/hud/reticle.tsx`)
  - Periscope crosshair

### Added - Input System
- **Player Input** (`hooks/use-player-input.ts`)
  - Keyboard controls (V/M/R, 1/2/3, Space, Enter)
  - Mouse aiming in periscope mode
  - HUD event filtering
  - Charge-and-release firing mechanism

### Added - App Shell
- **Main Page** (`app/page.tsx`)
  - Game component mount

- **Game Component** (`components/game.tsx`)
  - Composes GameProvider, SceneRoot, and HUD
  - usePlayerInput integration

### Technical Details
- **Performance Optimizations**
  - DPR limited to 1-1.5x
  - No antialiasing (low-poly aesthetic)
  - Instanced meshes for props
  - Imperative reads in useFrame (no React re-renders)
  - Shared geometries and materials
  - Fixed physics timestep

- **Architecture**
  - Hexagonal/Clean Architecture
  - Strict separation: Model → Controller → View
  - Engine is pure TypeScript (no React/Three.js dependencies)
  - Reactive store pattern for discrete state
  - Imperative reads for continuous state

---

## Version History

- **0.1.0** (Current): Alpha - Core functionality complete
- **1.0.0** (Planned): Release - Full game with audio, tests, and polish

---

[Unreleased]: https://github.com/user/artillery-warfare-game/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/user/artillery-warfare-game/releases/tag/v0.1.0
