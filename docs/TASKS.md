# Lista de Tareas Inmediatas

**Estado actual:** Alpha jugable v0.1.1  
**Prioridad:** Estabilizar mediante tests antes de añadir features

> **Actualización (20/08/2026).** Corregidos los fallos que impedían jugar
> (renderizado 3D, hidratación y tipografía), montada la suite de Vitest
> (110 tests), extraída la IA a `enemy-ai.ts` y preparada la interfaz de
> audio en `audio-manager.ts`. Las casillas marcadas abajo reflejan ese
> trabajo; ver `CHANGELOG.md` y `docs/FIX-REPORT.md` para el detalle.

> Nota sobre rutas: los tests viven en `tests/` (una carpeta única en la raíz)
> y no en un `__tests__/` por módulo. Es lo que espera Vitest por defecto y
> evita mezclar código de producción con código de prueba.

---

## 🔴 CRÍTICO - Hacer Ahora

### Testing (Sprint 1-2)

#### Configuración de Testing
- [x] Instalar Vitest
  ```bash
  pnpm add -D vitest @vitest/ui
  ```
- [x] Configurar `vitest.config.ts`
- [x] Añadir script de test en `package.json`
- [ ] Crear carpeta `__tests__/` en cada módulo
- [x] Configurar coverage con `@vitest/coverage-v8`

#### Tests de Física (`__tests__/physics.test.ts`)
- [x] Test: Trayectoria sin viento es parabólica
- [x] Test: Viento desvía proyectil lateralmente
- [x] Test: Proyectil impacta terreno
- [x] Test: Proyectil sale de límites (outOfBounds)
- [x] Test: `laserRange` devuelve distancia correcta
- [x] Test: `solveSpeedForRange` calcula velocidad IA

#### Tests de Terreno (`__tests__/terrain.test.ts`)
- [x] Test: `terrainHeight` es determinista
- [x] Test: `insideTerrain` detecta límites correctamente
- [x] Test: `scatterProps` genera misma disposición cada vez

#### Tests de Motor (`__tests__/engine.test.ts`)
- [x] Test: Estado inicial es 'aiming'
- [x] Test: `adjustAim` respeta límites
- [x] Test: `fire` cambia fase a 'flying'
- [x] Test: `update` avanza física
- [x] Test: Resolución de impacto calcula daño
- [x] Test: IA dispara tras impacto del jugador
- [x] Test: Victoria cuando todos los objetivos destruidos
- [x] Test: Derrota cuando HP jugador llega a 0
- [x] Test: `reset` reinicia estado

#### Tests de Integración
- [x] Test: Flujo completo de un turno
- [x] Test: Combate jugador vs IA hasta victoria
- [x] Test: Combate jugador vs IA hasta derrota

---

## 🟡 IMPORTANTE - Próximas 4 Semanas

### Refactorización de IA

- [x] Crear archivo `enemy-ai.ts`
- [ ] Definir interfaz `EnemyStrategy`:
  ```typescript
  interface EnemyStrategy {
    calculateShot(state: GameState, targets: Target[]): ShotParams
  }
  ```
- [ ] Implementar `BasicArtilleryStrategy` (comportamiento actual)
- [x] Mover lógica de `engine.ts` a `enemy-ai.ts`
- [x] Inyectar estrategia en constructor de GameEngine
- [x] Tests de estrategia aislados

### Configuración Centralizada

- [ ] Crear `game-config.ts` con constantes:
  - [ ] `AIM_LIMITS`
  - [ ] `CHARGE_RATE`
  - [ ] `IMPACT_PAUSE`
  - [ ] `ENEMY_DELAY`
  - [ ] `MAX_TRAIL`
  - [ ] Parámetros de IA (spread, etc.)
- [ ] Reemplazar valores hardcoded en `engine.ts`
- [ ] Documentar cada constante

### Documentación

- [ ] Añadir JSDoc a métodos públicos de GameEngine:
  - [ ] `subscribe()`
  - [ ] `getSnapshot()`
  - [ ] `update()`
  - [ ] `adjustAim()`
  - [ ] `setAim()`
  - [ ] `setPower()`
  - [ ] `selectAmmo()`
  - [ ] `startCharging()`
  - [ ] `releaseAndFire()`
  - [ ] `fire()`
  - [ ] `reset()`
- [ ] Añadir ejemplos de uso en JSDoc
- [x] Crear CHANGELOG.md inicial

---

## 🟢 DESEABLE - Backlog

### Audio (Sprint 4)

- [x] Investigar Howler.js vs Web Audio API
- [x] Crear `audio-manager.ts` (capa dominio)
- [ ] Encontrar/generar sonidos:
  - [ ] Disparo de cañón
  - [ ] Explosión
  - [ ] Impacto terreno
  - [ ] Impacto objetivo
  - [ ] Alerta
  - [ ] Click UI
- [ ] Integrar con eventos del motor
- [ ] UI de control de volumen

### Feedback Visual (Sprint 5)

- [ ] Sistema de partículas básico
- [ ] Barras de HP sobre objetivos
- [ ] Efecto de sacudida de cámara
- [ ] Indicador de fuego entrante

### Tutorial (Sprint 6)

- [ ] Diseñar flujo paso a paso
- [ ] Sistema de overlays
- [ ] Tooltips contextuales
- [ ] Detectar primera partida

---

## Flujo de Trabajo Sugerido

### Semana 1
```
Lunes-Martes:   Configurar Vitest + primer test de física
Miércoles:      Tests de física completos
Jueves:         Tests de terreno
Viernes:        Tests de motor básicos
```

### Semana 2
```
Lunes-Martes:   Tests de motor avanzados
Miércoles:      Refactorizar IA a módulo separado
Jueves:         Tests de IA + integración
Viernes:        Coverage reports + documentar
```

### Semana 3
```
Lunes:          Configuración centralizada
Martes:         JSDoc en API pública
Miércoles:      CHANGELOG + README actualizado
Jueves:         Review y ajustes
Viernes:        Preparar Sprint 4 (Audio)
```

---

## Comandos Útiles

### Ejecutar Tests
```bash
# Una vez configurado Vitest
pnpm test

# Con UI
pnpm test:ui

# Coverage
pnpm test:coverage
```

### Linting
```bash
pnpm lint
```

### Desarrollo
```bash
pnpm dev
```

---

## Checklist de Definition of Done

Antes de considerar una tarea como "hecha":

- [ ] Código implementado y funcionando
- [ ] Tests escritos y pasando (si aplica)
- [ ] Sin warnings de TypeScript
- [ ] Sin errores de lint
- [ ] Documentación actualizada (si aplica)
- [ ] Commit con mensaje descriptivo
- [ ] PR revisado y mergeado (si hay equipo)

---

## Notas

- **No añadir features nuevas hasta tener tests estables**
- Priorizar calidad sobre velocidad
- Documentar decisiones de diseño
- Mantener el roadmap actualizado

---

**Última actualización:** Agosto 2026
