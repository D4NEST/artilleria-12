# Lista de Tareas Inmediatas

**Estado actual:** Alpha funcional v0.1.0  
**Prioridad:** Estabilizar mediante tests antes de añadir features

---

## 🔴 CRÍTICO - Hacer Ahora

### Testing (Sprint 1-2)

#### Configuración de Testing
- [ ] Instalar Vitest
  ```bash
  pnpm add -D vitest @vitest/ui
  ```
- [ ] Configurar `vitest.config.ts`
- [ ] Añadir script de test en `package.json`
- [ ] Crear carpeta `__tests__/` en cada módulo
- [ ] Configurar coverage con `@vitest/coverage-v8`

#### Tests de Física (`__tests__/physics.test.ts`)
- [ ] Test: Trayectoria sin viento es parabólica
- [ ] Test: Viento desvía proyectil lateralmente
- [ ] Test: Proyectil impacta terreno
- [ ] Test: Proyectil sale de límites (outOfBounds)
- [ ] Test: `laserRange` devuelve distancia correcta
- [ ] Test: `solveSpeedForRange` calcula velocidad IA

#### Tests de Terreno (`__tests__/terrain.test.ts`)
- [ ] Test: `terrainHeight` es determinista
- [ ] Test: `insideTerrain` detecta límites correctamente
- [ ] Test: `scatterProps` genera misma disposición cada vez

#### Tests de Motor (`__tests__/engine.test.ts`)
- [ ] Test: Estado inicial es 'aiming'
- [ ] Test: `adjustAim` respeta límites
- [ ] Test: `fire` cambia fase a 'flying'
- [ ] Test: `update` avanza física
- [ ] Test: Resolución de impacto calcula daño
- [ ] Test: IA dispara tras impacto del jugador
- [ ] Test: Victoria cuando todos los objetivos destruidos
- [ ] Test: Derrota cuando HP jugador llega a 0
- [ ] Test: `reset` reinicia estado

#### Tests de Integración
- [ ] Test: Flujo completo de un turno
- [ ] Test: Combate jugador vs IA hasta victoria
- [ ] Test: Combate jugador vs IA hasta derrota

---

## 🟡 IMPORTANTE - Próximas 4 Semanas

### Refactorización de IA

- [ ] Crear archivo `enemy-ai.ts`
- [ ] Definir interfaz `EnemyStrategy`:
  ```typescript
  interface EnemyStrategy {
    calculateShot(state: GameState, targets: Target[]): ShotParams
  }
  ```
- [ ] Implementar `BasicArtilleryStrategy` (comportamiento actual)
- [ ] Mover lógica de `engine.ts` a `enemy-ai.ts`
- [ ] Inyectar estrategia en constructor de GameEngine
- [ ] Tests de estrategia aislados

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
- [ ] Crear CHANGELOG.md inicial

---

## 🟢 DESEABLE - Backlog

### Audio (Sprint 4)

- [ ] Investigar Howler.js vs Web Audio API
- [ ] Crear `audio-manager.ts` (capa dominio)
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
