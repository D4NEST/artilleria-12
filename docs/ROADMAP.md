# Roadmap de Desarrollo

**Proyecto:** Artillery Warfare Game  
**Versión Base:** 0.1.0 (Alpha)  
**Objetivo:** Alcanzar versión 1.0 (Release)  
**Fecha de Inicio:** Agosto 2026

---

## Visión del Producto

Convertir el prototipo actual en un juego completo y pulido que ofrezca:

- Experiencia inmersiva de artillero en un cuarto de guerra 3D
- Mecánicas de balística realista con viento como factor táctico
- Variedad de escenarios y objetivos
- Sistema de progresión y rejugabilidad
- Audio y feedback de calidad
- Estabilidad y rendimiento garantizados mediante tests

---

## Fases de Desarrollo

### FASE 1: FUNDAMENTOS (Sprints 1-3)
**Duración:** 6 semanas  
**Objetivo:** Estabilizar el core y garantizar calidad mediante tests

#### Sprint 1: Testing Suite (2 semanas)

**Objetivo:** Implementar infraestructura de tests y coverage básico

**Tareas:**
- [ ] Configurar Vitest como framework de testing
- [ ] Configurar React Testing Library para tests de componentes
- [ ] Crear tests unitarios para `physics.ts`
  - [ ] `stepProjectile()` - trayectoria básica
  - [ ] `stepProjectile()` - efecto del viento
  - [ ] `laserRange()` - cálculo de distancia
  - [ ] `solveSpeedForRange()` - solución balística IA
- [ ] Crear tests unitarios para `terrain.ts`
  - [ ] `terrainHeight()` - determinismo
  - [ ] `insideTerrain()` - límites
  - [ ] `scatterProps()` - generación determinista
- [ ] Crear tests unitarios para `ammunition.ts`
  - [ ] `muzzleSpeed()` - cálculo de velocidad
- [ ] Configurar coverage reports
- [ ] Documentar cómo ejecutar tests

**Entregables:**
- Suite de tests funcionando
- Coverage > 60% en módulos de dominio
- Documentación de testing

**Criterios de Aceptación:**
- `pnpm test` ejecuta todos los tests
- Todos los tests pasan
- CI configurado (opcional)

---

#### Sprint 2: Testing de Motor (2 semanas)

**Objetivo:** Tests del motor de juego y refactorización de IA

**Tareas:**
- [ ] Crear tests unitarios para `engine.ts`
  - [ ] Máquina de estados de turnos
  - [ ] Comandos de jugador (adjustAim, fire, etc.)
  - [ ] Resolución de impacto
  - [ ] Sistema de puntuación
  - [ ] Condiciones de victoria/derrota
- [ ] Refactorizar IA enemiga
  - [ ] Extraer a `enemy-ai.ts`
  - [ ] Crear interfaz `EnemyStrategy`
  - [ ] Implementar estrategia `BasicArtilleryStrategy`
  - [ ] Tests de IA aislados
- [ ] Añadir tests de integración básicos
  - [ ] Flujo completo de turno
  - [ ] Combate jugador vs IA

**Entregables:**
- Coverage > 80% en engine.ts
- IA refactorizada en módulo separado
- Tests de integración básicos

**Criterios de Aceptación:**
- IA extraída a módulo propio
- Estrategia intercambiable
- Tests verifican comportamiento de IA

---

#### Sprint 3: Documentación y Configuración (2 semanas)

**Objetivo:** Documentar API y centralizar configuración

**Tareas:**
- [ ] Crear archivo de configuración central
  - [ ] `game-config.ts` con constantes del juego
  - [ ] Dificultad, parámetros de IA, límites
- [ ] Documentar API pública del motor
  - [ ] JSDoc en todos los métodos públicos
  - [ ] Ejemplos de uso
- [ ] Crear CHANGELOG.md
- [ ] Actualizar README con instrucciones de desarrollo
- [ ] Crear CONTRIBUTING.md
- [ ] Añadir badges al README (coverage, versión, etc.)

**Entregables:**
- Configuración centralizada
- API documentada
- Guías de contribución

**Criterios de Aceptación:**
- Todas las constantes extraídas a config
- JSDoc en 100% de API pública
- Guías claras para nuevos contribuidores

---

### FASE 2: EXPERIENCIA (Sprints 4-6)
**Duración:** 6 semanas  
**Objetivo:** Añadir audio, feedback y pulir la experiencia base

#### Sprint 4: Sistema de Audio (2 semanas)

**Objetivo:** Implementar audio básico con efectos y ambiente

**Tareas:**
- [ ] Configurar Howler.js o Web Audio API
- [ ] Crear `audio-manager.ts` (capa de dominio)
- [ ] Implementar sonidos críticos:
  - [ ] Disparo de cañón (con variación por potencia)
  - [ ] Explosión (con variación por tamaño)
  - [ ] Impacto en terreno
  - [ ] Impacto en objetivo
  - [ ] Disparo enemigo entrante
- [ ] Implementar audio de UI:
  - [ ] Click en botones/palancas
  - [ ] Cambio de munición
  - [ ] Alertas (impacto entrante, victoria, derrota)
- [ ] Añadir ambiente:
  - [ ] Viento (volumen según velocidad)
  - [ ] Sonidos de fondo del búnker
- [ ] Crear controles de volumen en HUD
- [ ] Tests de audio (mockeado)

**Entregables:**
- Sistema de audio funcional
- 10+ efectos de sonido integrados
- Controles de volumen

**Criterios de Aceptación:**
- Sonidos sincronizados con eventos de juego
- Volúmenes ajustables
- Sin bloqueos de main thread

---

#### Sprint 5: Feedback Visual Mejorado (2 semanas)

**Objetivo:** Mejorar la comunicación de estado al jugador

**Tareas:**
- [ ] Indicadores de HP en objetivos 3D
  - [ ] Barra de vida sobre cada objetivo
  - [ ] Efecto de "dañado" (color flash)
- [ ] Mejoras de impacto:
  - [ ] Partículas de explosión (sistema básico)
  - [ ] Onda de choque visual
  - [ ] Sacudida de cámara en impactos cercanos
- [ ] Indicadores de advertencia:
  - [ ] Punto de impacto estimado enemigo (diseño visual)
  - [ ] Alerta de "fuego entrante"
- [ ] Mejoras de HUD:
  - [ ] Animación de carga de potencia mejorada
  - [ ] Indicador de "listo para disparar"
  - [ ] Mini-mapa táctico (opcional)

**Entregables:**
- Feedback visual rico
- Indicadores de estado claros
- Experiencia más informativa

**Criterios de Aceptación:**
- Jugador entiende estado sin leer mensajes
- Efectos visuales no afectan rendimiento > 5%
- Accesible (colores + formas)

---

#### Sprint 6: Tutorial y Onboarding (2 semanas)

**Objetivo:** Guía integrada para nuevos jugadores

**Tareas:**
- [ ] Diseñar flujo de tutorial
  - [ ] Paso 1: Navegación del cuarto de guerra
  - [ ] Paso 2: Uso del periscopio
  - [ ] Paso 3: Control de potencia
  - [ ] Paso 4: Selección de munición
  - [ ] Paso 5: Lectura del viento
  - [ ] Paso 6: Primer disparo
- [ ] Implementar sistema de tooltips
- [ ] Crear overlays de tutorial
- [ ] Detectar primera partida y activar tutorial
- [ ] Permitir saltar tutorial
- [ ] Guardar progreso de tutorial en localStorage

**Entregables:**
- Tutorial interactivo completo
- Sistema de tooltips
- Onboarding suave

**Criterios de Aceptación:**
- Nuevo jugador completa primera partida sin frustración
- Tutorial puede saltarse y reactivarse
- Tooltips contextuales útiles

---

### FASE 3: CONTENIDO (Sprints 7-9)
**Duración:** 6 semanas  
**Objetivo:** Añadir variedad y rejugabilidad

#### Sprint 7: Sistema de Escenarios (2 semanas)

**Objetivo:** Soporte para múltiples escenarios/sectores

**Tareas:**
- [ ] Diseñar sistema de escenarios
  - [ ] Interfaz `Scenario`
  - [ ] Configuración de terreno diferente por sector
  - [ ] Configuración de objetivos
  - [ ] Dificultad variable
- [ ] Crear 3 escenarios iniciales:
  - [ ] Sector 7 (actual, tutorial)
  - [ ] Sector 12 (más objetivos, mayor distancia)
  - [ ] Sector 3 (terreno montañoso, objetivos ocultos)
- [ ] Selector de escenario en UI
- [ ] Progresión de dificultad entre escenarios

**Entregables:**
- 3 escenarios jugables
- Sistema extensible de escenarios
- Selector en UI

**Criterios de Aceptación:**
- Cada escenario se siente diferente
- Transición entre escenarios sin bugs
- Sistema preparado para más escenarios

---

#### Sprint 8: IA Avanzada (2 semanas)

**Objetivo:** IA más interesante y variable

**Tareas:**
- [ ] Implementar estrategias de IA:
  - [ ] `ArtilleryStrategy` (actual, mejorada)
  - [ ] `SniperStrategy` (precisa, lenta)
  - [ ] `BarrageStrategy` (área, imprecisa)
- [ ] Diferentes comportamientos por tipo de objetivo:
  - [ ] Bunker: defensivo, contrabatería
  - [ ] Tower: sniper, largo alcance
  - [ ] Depot: soporte, fuego de área
- [ ] Coordinación básica entre objetivos:
  - [ ] Priorizar objetivo más cercano al jugador
  - [ ] Alternar fuego entre objetivos vivos
- [ ] Configuración de dificultad:
  - [ ] Fácil: spread alto, delay largo
  - [ ] Normal: actual
  - [ ] Difícil: spread bajo, delay corto, coordinación

**Entregables:**
- IA con múltiples estrategias
- Dificultad configurable
- Comportamientos diferenciados

**Criterios de Aceptación:**
- IA proporciona desafío variable
- Jugador nota diferencia entre dificultades
- Sin comportamientos absurdos (disparo al vacío constante)

---

#### Sprint 9: Progresión y Estadísticas (2 semanas)

**Objetivo:** Sistema de progresión y persistencia

**Tareas:**
- [ ] Sistema de persistencia:
  - [ ] Guardar estadísticas en localStorage
  - [ ] Cargar al iniciar
- [ ] Estadísticas a rastrear:
  - [ ] Partidas jugadas/ganadas/perdidas
  - [ ] Disparos totales / Precisión global
  - [ ] Objetivos destruidos por tipo
  - [ ] Mejor racha de victorias
  - [ ] Tiempo de juego
- [ ] Desbloqueables básicos:
  - [ ] Nuevos escenarios por completar anteriores
  - [ ] Mención de "veterano" tras X victorias
- [ ] Pantalla de estadísticas en HUD
- [ ] Exportar/importar save (opcional)

**Entregables:**
- Persistencia funcional
- Estadísticas visibles
- Sentido de progresión

**Criterios de Aceptación:**
- Datos persisten entre sesiones
- Estadísticas son precisas
- Progresión motiva a seguir jugando

---

### FASE 4: PULIDO (Sprints 10-12)
**Duración:** 6 semanas  
**Objetivo:** Optimizar, pulir y preparar para release

#### Sprint 10: Configuración y Accesibilidad (2 semanas)

**Objetivo:** Opciones de configuración y accesibilidad

**Tareas:**
- [ ] Sistema de configuración:
  - [ ] Menú de pausa (ESC)
  - [ ] Rebinding de controles
  - [ ] Configuración de audio (master, efectos, música)
  - [ ] Configuración gráfica (DPR, calidad)
- [ ] Accesibilidad:
  - [ ] Modo daltónicos (símbolos + colores)
  - [ ] Tamaño de texto ajustable
  - [ ] Indicadores sonoros alternativos
- [ ] Soporte para gamepad (opcional):
  - [ ] Mapeo básico de gamepad
  - [ ] Configuración de sensibilidad
- [ ] Guardar configuración en localStorage

**Entregables:**
- Menú de configuración completo
- Opciones de accesibilidad
- Soporte gamepad básico

**Criterios de Aceptación:**
- Todas las opciones funcionan y persisten
- Accesibilidad mejora experiencia para usuarios con necesidades
- Gamepad funciona en navegadores modernos

---

#### Sprint 11: Optimización y Rendimiento (2 semanas)

**Objetivo:** Garantizar rendimiento estable

**Tareas:**
- [ ] Profiling de rendimiento:
  - [ ] Identificar cuellos de botella
  - [ ] Métricas de FPS en diferentes dispositivos
- [ ] Optimizaciones:
  - [ ] LOD (Level of Detail) para objetivos lejanos
  - [ ] Frustum culling manual si es necesario
  - [ ] Pooling de efectos de impacto
- [ ] Testing de rendimiento:
  - [ ] Tests de carga (múltiples proyectiles)
  - [ ] Tests de memoria (leaks)
- [ ] Documentar requisitos de sistema
- [ ] Añadir advertencia de bajo rendimiento

**Entregables:**
- 60 fps estables en hardware objetivo
- Sin memory leaks
- Documentación de requisitos

**Criterios de Aceptación:**
- FPS estable en dispositivo de gama media
- Sin degradación tras 30+ minutos de juego
- Memoria estable

---

#### Sprint 12: Testing Final y Release (2 semanas)

**Objetivo:** Validación final y preparación de release

**Tareas:**
- [ ] Testeo exhaustivo:
  - [ ] Playtesting interno completo
  - [ ] Tests E2E con Cypress/Playwright
  - [ ] Testing de cross-browser (Chrome, Firefox, Safari, Edge)
  - [ ] Testing en móvil (si aplica)
- [ ] Corrección de bugs:
  - [ ] Priorizar bugs críticos
  - [ ] Fix de glitches visuales
- [ ] Preparación de release:
  - [ ] Actualizar versión a 1.0.0
  - [ ] Actualizar CHANGELOG
  - [ ] Crear release notes
  - [ ] Screenshots y trailer (opcional)
- [ ] Deploy:
  - [ ] Configurar dominio (si aplica)
  - [ ] Deploy a Vercel/Netlify
  - [ ] Verificar analytics

**Entregables:**
- Versión 1.0.0 estable
- Sin bugs críticos conocidos
- Desplegado y accesible

**Criterios de Aceptación:**
- Funciona en los 4 navegadores principales
- Sin crashes en 1 hora de gameplay
- Release notes claros

---

## Roadmap Visual

```
2026
│
├─ Q3 (Ago-Sep) ─────────────────────────────────────
│  │
│  ├─ Sprint 1: Testing Suite ✓
│  ├─ Sprint 2: Testing de Motor ✓
│  └─ Sprint 3: Documentación ✓
│
│  HITO: FASE 1 COMPLETA - Fundamentos estables
│
├─ Q4 (Oct-Nov) ─────────────────────────────────────
│  │
│  ├─ Sprint 4: Sistema de Audio ✓
│  ├─ Sprint 5: Feedback Visual ✓
│  └─ Sprint 6: Tutorial ✓
│
│  HITO: FASE 2 COMPLETA - Experiencia pulida
│
├─ Q1 2027 (Ene-Feb) ────────────────────────────────
│  │
│  ├─ Sprint 7: Escenarios ✓
│  ├─ Sprint 8: IA Avanzada ✓
│  └─ Sprint 9: Progresión ✓
│
│  HITO: FASE 3 COMPLETA - Contenido variado
│
└─ Q2 2027 (Mar-Abr) ────────────────────────────────
   │
   ├─ Sprint 10: Configuración ✓
   ├─ Sprint 11: Optimización ✓
   └─ Sprint 12: Release ✓
   
   HITO: FASE 4 COMPLETA - Versión 1.0 Release
```

---

## Métricas de Éxito

### Técnicas

| Métrica | Objetivo |
|---------|----------|
| Test Coverage | > 80% en core |
| FPS Estable | 60 fps en gama media |
| Bundle Size | < 2MB gzipped |
| Tiempo de Carga | < 3s en 4G |
| Memory Leaks | 0 |

### De Producto

| Métrica | Objetivo |
|---------|----------|
| Tiempo de sesión promedio | > 10 min |
% Retención día 7 | > 30% |
| Tasa de victoria (Normal) | 40-60% |
| Bugs críticos post-release | 0 |

---

## Riesgos y Mitigación

### Riesgo 1: Scope Creep
**Mitigación:** Seguir estrictamente el roadmap. Nuevas ideas van a "backlog futuro", no al sprint actual.

### Riesgo 2: Burnout
**Mitigación:** Sprints de 2 semanas con objetivos realistas. Descansos entre fases.

### Riesgo 3: Bloqueo Técnico
**Mitigación:** Spike sessions al inicio de sprints complejos. PoC antes de implementar.

### Riesgo 4: Feedback Negativo
**Mitigación:** Playtesting regular. Iterar basado en datos, no suposiciones.

---

## Post-Release (Post v1.0)

### Actualizaciones Planeadas

**v1.1 - Multiplayer (Opcional)**
- Modo cooperativo
- PvP
- Leaderboards

**v1.2 - Campaña**
- Historia
- Objetivos narrativos
- Personajes

**v1.3 - Modificadores**
- Clima dinámico
- Modo hardcore
- Challenges diarios

**v2.0 - Expansión**
- Nuevo teatro de operaciones
- Nuevos tipos de objetivos
- Nuevas municiones

---

**Nota:** Este roadmap es una guía, no un contrato. La realidad puede requerir ajustes. Comunicar cambios al equipo y actualizar este documento.

**Última actualización:** Agosto 2026
