# Artillery Warfare Game 🎯

**Juego de artillería por turnos con vista inmersiva 3D y movimiento de vehículos.**  
Inspirado en *Gunbound* y *Vigilante 8*, pero con física realista, cabina interactiva y una estética low-pastel nostálgica.

![Estado del Proyecto](https://img.shields.io/badge/Estado-Alpha%20v0.2.0-orange)
![Tests](https://img.shields.io/badge/Tests-110%20passing-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16.3.0-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.185.1-blue)

---

## 🎮 Descripción

Simulador de artillería por turnos donde el jugador asume el rol de artillero en un búnker militar. El juego combina **física balística realista** con una **experiencia inmersiva** dentro de la cabina y la posibilidad de **moverse libremente** por el campo de batalla.

**Características principales:**
- 🚜 Movimiento del vehículo con WASD (adelante, atrás, girar chasis).
- 🔄 Rotación de torreta con flechas (lateral).
- 🎯 Vista de periscopio (apuntado con mouse) y cámara externa (Tab/V).
- 💥 3 tipos de munición (HE, AP, Cluster) con física de viento y arrastre.
- 🧠 IA enemiga con precisión variable según el turno.
- 🏆 Sistema de daño, objetivos destructibles y condiciones de victoria/derrota.
- 🎨 Estilo low-poly con paleta de colores pastel (en desarrollo).

---

## 📊 Estado del Proyecto

| Aspecto | Estado | Completitud |
| :--- | :--- | :--- |
| Motor de juego | ✅ Funcional | 90% |
| Movimiento y cámara | ✅ Implementado | 75% |
| Sistema de combate | ✅ Funcional | 85% |
| Interfaz de usuario | ✅ Funcional | 80% |
| Periscopio | ✅ Corregido | 80% |
| Audio | ⏳ Pendiente | 0% |
| Tests | ✅ 110 tests | 85% |
| Documentación | ⚠️ Parcial | 60% |

**Última actualización:** Agosto 2026

---

## 🛠️ Tecnologías

| Tecnología | Propósito | Versión |
|------------|-----------|---------|
| Next.js | Framework React | 16.3.0 |
| React | UI | 19.x |
| Three.js | Renderizado 3D | 0.185.x |
| React Three Fiber | Integración React/Three | 9.7.0 |
| React Three Drei | Helpers 3D | 10.7.8 |
| TypeScript | Tipado | 5.7.3 |
| Vitest | Testing | 4.x |
| Tailwind CSS | Estilos | 4.3.3 |

---

## 🎮 Controles

| Tecla | Acción |
|-------|--------|
| `W` | Mover vehículo adelante |
| `S` | Mover vehículo atrás |
| `A` | Girar chasis izquierda |
| `D` | Girar chasis derecha |
| `←` `→` | Rotar torreta (lateral) |
| `↑` `↓` | **(Próximamente)** Elevar/Bajar mira |
| `Tab` / `V` | Alternar entre periscopio y cámara externa |
| `M` | Vista de monitor táctico |
| `R` / `Escape` | Vista de cabina (cuarto de guerra) |
| `1` / `2` / `3` | Seleccionar munición (HE / AP / Cluster) |
| `Espacio` (mantener) | Cargar potencia |
| `Espacio` (soltar) | Disparar |
| `Ratón` | Apuntar (en periscopio) |
| `Enter` | Nueva misión (post-partida) |

---

## 🏗️ Arquitectura

El proyecto sigue una **arquitectura hexagonal** (MVC) con separación estricta entre dominio, controlador y vista.
 VISTA (React/Three.js) │
│ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│ │ HUD 2D │ │ Escena 3D │ │ Entrada │ │
│ │ (DOM) │ │ (Three Fiber)│ │ (Events) │ │
│ └──────────────┘ └──────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────┐
│ PUENTE (React <-> Engine) │
│ GameProvider (Context) │
└─────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────┐
│ CONTROLADOR (GameEngine) │
│ Turnos, física, IA, estado del juego │
└─────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────┐
│ MODELO (Domain Layer) │
│ Types, Physics, Terrain, Ammunition (puro TS) │
└─────────────────────────────────────────────────────┘



**Principios de diseño:**
- El motor NO conoce React ni Three.js.
- La lógica del juego es TypeScript puro y testeable.
- Física determinista con paso fijo (120 Hz).
- Lectura imperativa para datos de alta frecuencia (60+ fps).

---

## 📁 Estructura del Proyecto
artillery-warfare-game/
├── app/ # Next.js App Router
├── components/
│ ├── game-engine/ # CAPA DE DOMINIO + CONTROLADOR
│ │ ├── engine.ts # Controlador principal
│ │ ├── types.ts # Tipos del dominio
│ │ ├── physics.ts # Física balística
│ │ ├── terrain.ts # Terreno procedural
│ │ ├── ammunition.ts # Catálogo de munición
│ │ └── game-provider.tsx # Puente React
│ ├── hud/ # CAPA DE VISTA 2D
│ └── three-scene/ # CAPA DE VISTA 3D
├── hooks/
│ └── use-player-input.ts # Controlador de entrada
├── tests/ # Suite de pruebas
├── docs/ # Documentación
└── public/ # Recursos estáticos



---

## ✅ Últimas Mejoras (v0.2.0-alpha)

- [x] Movimiento del vehículo con WASD.
- [x] Rotación de torreta con flechas (lateral).
- [x] Cámara externa (vista de torreta) con Tab/V.
- [x] Corrección del periscopio (ya no apunta al cielo).
- [x] Daño enemigo calculado desde la posición actual del vehículo.
- [x] IA enemiga apunta a la posición dinámica del jugador.
- [x] 110 tests unitarios pasando.
- [x] Documentación de próximos pasos (`docs/PROXIMOS-PASOS.md`).

---

## 🐞 Bugs Conocidos (Próximos a corregir)

- 🔴 **Zoom del periscopio**: Demasiado cerca, no permite ver bien el mapa.
- 🔴 **Límite de giro**: El cañón solo gira ±43°, debería ser 360°.
- 🔴 **Elevación de mira**: El periscopio no sube/baja con el mouse (fijo en -0.08 rad).
- 🟡 **Límite de movimiento**: El jugador puede moverse indefinidamente (sin temporizador).
- 🟡 **Interfaz de movimiento**: No hay HUD que indique tiempo restante de movimiento.
- 🟢 **Sonidos**: Audio no implementado aún.

Consulta el documento `docs/PROXIMOS-PASOS.md` para más detalles y plan de acción.

---

## 🧪 Tests

```bash
pnpm test            # 110 tests (Vitest)
pnpm test:watch      # Modo watch
pnpm test:coverage   # Reporte de cobertura
pnpm typecheck       # Verificación de tipos
pnpm check           # typecheck + tests + build


La suite cubre física, terreno, munición, IA enemiga y la máquina de turnos. Corre en Node, sin navegador: el motor es TypeScript puro por diseño.

🚀 Instalación y Ejecución
bash
# Clonar el repositorio
git clone https://github.com/D4NEST/artilleria-12.git
cd artilleria-12

# Instalar dependencias
pnpm install

# Modo desarrollo
pnpm dev

# Build producción
pnpm build
pnpm start


Prioridad Alta (Inmediata)
Ajustar zoom del periscopio (FOV dinámico con teclas 1/2 o rueda ratón).

Habilitar giro de 360° del cañón y elevación de la mira con el mouse.

Añadir límite de movimiento por turno (temporizador o distancia máxima).

Prioridad Media (Siguiente sprint)
Mejoras visuales: paleta de colores pastel, iluminación suave.

Modelado de vehículos de comida (arepa, empanada, croissant).

HUD de estado de movimiento.

Prioridad Baja (Backlog)
Sistema de audio.

Multijugador (WebRTC).

Progresión y estadísticas.
