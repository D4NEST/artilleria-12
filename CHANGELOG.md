# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
