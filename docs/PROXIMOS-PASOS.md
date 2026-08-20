# Próximos pasos a seguir - Post corrección de movimiento y periscopio

**Fecha:** Agosto 2026  
**Rama actual:** `dev`  
**Estado:** El vehículo se mueve con WASD, la torreta gira con flechas (lateral), el periscopio recuperó la imagen, el daño enemigo ahora es correcto.

---

## ✅ Lo que funciona bien

- [x] Movimiento del vehículo con WASD (adelante, atrás, giro de chasis).
- [x] Rotación lateral de la torreta con flechas izquierda/derecha.
- [x] Periscopio con imagen (ya no se ve azul).
- [x] El enemigo solo resta vida cuando realmente impacta cerca del vehículo.
- [x] Cambio de vista entre periscopio y cámara externa (Tab / V).
- [x] Disparo con espacio (carga y suelta).

---

## 🔴 Prioridad Alta (Corregir ahora)

### 1. Zoom del periscopio (Demasiado cerca)

**Problema:** El periscopio tiene demasiado zoom. Se ve muy cerca del terreno y no permite ver bien el mapa.

**Solución propuesta:**
- Modificar el `fov` de la cámara en `components/three-scene/battlefield.tsx`, dentro de `GunsightCamera` (línea donde se retorna `<PerspectiveCamera>`).
- Valor actual: `fov={34}` → Probar valores entre `40` y `50` para alejar el zoom.
- **Ideal:** Añadir zoom dinámico con teclas `1` (alejar) y `2` (acercar) o con la rueda del ratón.

**Archivo a modificar:**
- `components/three-scene/battlefield.tsx` (función `GunsightCamera`)

---

### 2. Giro de cañón de 360° y elevación de la mira

**Problema actual:**
- El cañón (aim.azimuth) está limitado a ±0.75 rad (±43°), impidiendo girar 360° sobre el eje del vehículo.
- El periscopio está fijo en `SIGHT_ELEVATION = -0.08 rad`, no permite subir/bajar la mira con el mouse (arriba/abajo).

**Solución propuesta:**

#### A) Eliminar límite de azimuth para 360°
- En `components/game-engine/engine.ts`, cambiar la constante `AIM_LIMITS.azimuth` de `0.75` a `Math.PI * 2` (6.283) o un valor alto como `10`.
- Esto permite que el cañón pueda apuntar en cualquier dirección (360°).

#### B) Habilitar elevación de la mira (arriba/abajo)
- En `components/three-scene/battlefield.tsx` (`GunsightCamera`), reemplazar `SIGHT_ELEVATION` por `aim.elevation`.
- **Precaución:** Para evitar que vuelva a apuntar al cielo, limitar `aim.elevation` en el motor a un rango seguro: `elevationMin: -0.3` (apuntando ligeramente al suelo) y `elevationMax: 1.0` (apuntando al horizonte, no al cielo).
- En `engine.ts`, modificar `AIM_LIMITS.elevationMin = -0.3` y `AIM_LIMITS.elevationMax = 1.0`.

**Archivos a modificar:**
- `components/game-engine/engine.ts` (constantes `AIM_LIMITS`)
- `components/three-scene/battlefield.tsx` (función `GunsightCamera`)

---

### 3. Limitación del movimiento por turno

**Problema:** Actualmente, el jugador puede moverse libremente durante todo su turno sin restricción de tiempo o distancia.

**Solución propuesta:**
- Añadir un temporizador de movimiento (ej. 10-15 segundos) o una distancia máxima por turno.
- Al iniciar el turno (`beginPlayerTurn`), establecer `vehicle.canMove = true` y un contador `vehicle.moveTimeRemaining = 15` (segundos).
- En el método `update` del motor, decrementar `moveTimeRemaining` con `dt`. Si llega a 0, establecer `canMove = false`.
- En `use-player-input.ts`, verificar `canMove` antes de ejecutar cualquier comando de movimiento.

**Archivos a modificar:**
- `components/game-engine/types.ts` (añadir `moveTimeRemaining` a `VehicleState`)
- `components/game-engine/engine.ts` (inicialización, decremento en `update`, reset en `beginPlayerTurn`)
- `hooks/use-player-input.ts` (ya revisa `canMove`, pero se puede añadir feedback visual)

---

## 🟡 Prioridad Media (Mejoras visuales y de experiencia)

### 4. Ajustar la cámara externa (vista de torreta)

**Problema:** La cámara externa (Tab/V) está funcional, pero podría tener un ángulo más dinámico o una altura ajustable.

**Solución:** En `player-camera.tsx`, ajustar la distancia y altura de la cámara según preferencia del jugador.

---

### 5. HUD de estado de movimiento

**Problema:** El jugador no sabe cuánto tiempo le queda para moverse ni si el movimiento está activo.

**Solución:** Añadir un indicador en el HUD que muestre "Tiempo de movimiento restante: Xs" o un mensaje "Movimiento desactivado".

**Archivo a modificar:** `components/hud/telemetry.tsx` o `components/hud/hud.tsx`.

---

### 6. Animaciones suaves de transición

**Problema:** El cambio entre vista interna y externa es brusco.

**Solución:** Usar `lerp` (interpolación lineal) en `player-camera.tsx` para suavizar la transición de posición/rotación de la cámara.

---

## 🟢 Prioridad Baja (Backlog)

### 7. Sonido del motor y movimiento

**Idea:** Añadir sonido de motor al moverse, con variación según la velocidad.

### 8. Física del terreno al moverse

**Idea:** Que el vehículo se incline según la pendiente del terreno (actualmente se mantiene horizontal, solo cambia la altura Y).

---

## 📝 Resumen de variables y constantes a ajustar

| Variable | Archivo | Valor actual | Valor sugerido |
| :--- | :--- | :--- | :--- |
| `AIM_LIMITS.azimuth` | `engine.ts` | `0.75` | `Math.PI * 2` (360°) |
| `AIM_LIMITS.elevationMin` | `engine.ts` | `0.05` | `-0.3` (para bajar la mira) |
| `AIM_LIMITS.elevationMax` | `engine.ts` | `1.25` | `1.0` (para no apuntar al cielo) |
| `fov` en `GunsightCamera` | `battlefield.tsx` | `34` | `45` (o variable dinámica) |
| `VEHICLE_SPEED` | `engine.ts` | `12` | Ajustar según feedback |
| `CHASSIS_ROTATION_SPEED` | `engine.ts` | `1.2` | Ajustar según feedback |
| `TURRET_ROTATION_SPEED` | `engine.ts` | `1.5` | Ajustar según feedback |

---

## 🧪 Próxima prueba

Después de aplicar los cambios de las prioridades altas (1, 2 y 3):

1. Ejecutar `pnpm dev`.
2. Probar el periscopio: zoom, giro de 360°, elevación con mouse.
3. Probar el movimiento: verificar que se desactiva tras el tiempo límite.
4. Confirmar que no haya regresiones (el enemigo sigue dañando correctamente, el vehículo se mueve bien).
5. Hacer commit y push a `dev` con mensaje descriptivo.

---

**Documento creado:** Agosto 2026  
**Próximo paso:** Abordar las prioridades altas (zoom, 360°, elevación y límite de movimiento).