# Informe de correcciones — Artillería 12

**Fecha:** 20 de agosto de 2026
**Rama:** `fix/errores-renderizado-hidratacion`
**Punto de partida:** `main` @ `a04e30a` (*feat: versión inicial Alpha 0.1.0*)

---

## Resumen

El proyecto compilaba pero no se podía jugar. Tras la auditoría quedan
corregidos **doce fallos** —cuatro de ellos impedían por completo ver el
cuarto de guerra o apuntar—, montada la suite de tests (**110 tests**,
Vitest), extraída la IA enemiga a su propio módulo y dejada lista la interfaz
de audio.

| Comprobación | Antes | Ahora |
|---|---|---|
| `pnpm build` | ❌ falla sin acceso a Google Fonts | ✅ |
| `tsc --noEmit` | ⚠️ silenciado por `ignoreBuildErrors` | ✅ sin errores, con la comprobación reactivada |
| Errores de hidratación | ❌ sí | ✅ ninguno |
| Errores en consola del navegador | ❌ sí | ✅ ninguno |
| Monitor táctico | ❌ negro | ✅ señal en vivo |
| Periscopio | ❌ solo cielo | ✅ Sector 7 con retículo y telémetro |
| Telémetro | ❌ "SIN ECO" siempre | ✅ lectura continua |
| Partida completa (disparo → IA → derrota/victoria) | ❌ el enemigo nunca acertaba | ✅ ciclo completo |
| Tests | ❌ ninguno | ✅ 110 |

---

## 1. Por qué no se veía nada

Fueron **tres fallos superpuestos**, y por eso costaba diagnosticarlo: al
arreglar uno seguía sin verse el juego.

### 1.1 La tipografía del canvas tumbaba la escena entera

`components/three-scene/war-room.tsx` pedía a `<Text>` (drei/troika) la fuente
`/fonts/GeistMono-Regular.ttf`. **Ese fichero no existía en `public/`.**
Troika suspende mientras descarga la fuente; al fallar la descarga, la promesa
rechazada subía por el `<Suspense>` interno del `<Canvas>` y se llevaba por
delante todo el árbol 3D.

Corregido en dos frentes:

- La fuente se auto-aloja en `public/fonts/` (`app/fonts.ts` es la única
  fuente de verdad de la ruta, reexportada desde `lib/fonts.ts` para que los
  componentes de cliente no arrastren `next/font` al bundle).
- Cada rótulo va envuelto en su **propio** `<Suspense fallback={null}>`. Si
  algún día vuelve a faltar una fuente, se perderá un rótulo, no la escena.

### 1.2 El monitor táctico estaba enterrado en su propia carcasa

```
carcasa:  position z = -0.06, boxGeometry profundidad 0.14  →  cara frontal en z = +0.01
pantalla: position z =  0.00                                →  DETRÁS de la carcasa
```

Un centímetro de mundo, pantalla completamente negra. La carcasa pasa a
`z = -0.12` (cara frontal en `-0.05`).

Los dos rótulos del monitor tampoco se veían nunca: el título quedaba en
`y = 3.27`, por encima del techo (`y = 3.2`), y el de turno caía detrás de la
consola. Ambos se han metido dentro del bisel.

### 1.3 El periscopio miraba al cielo

`GunsightCamera` y `laserRange()` usaban el **eje del tubo**
(`aim.elevation`). Con la elevación inicial de 0,6 rad (34°) la óptica
encuadraba solo cielo y el telémetro devolvía 0 —de ahí el "SIN ECO"
permanente— porque el rayo nunca cortaba el terreno.

Se ha separado la **línea de mira** del eje del cañón, como en la artillería
real:

```ts
// components/game-engine/engine.ts
export const SIGHT: Vec3 = { …, y: terrainHeight(…) + 22, … }
export const SIGHT_ELEVATION = -0.08
```

La cabeza del periscopio sube a un mástil de 22 m porque desde la altura de la
boca del cañón (6,5 m) **la loma que hay a 160 m tapa el sector entero**: se
comprobó numéricamente que a 6,5 m solo es visible uno de los tres objetivos,
y a 24 m los tres. La elevación del tubo sigue siendo el parámetro de tiro y
ahora se lee en el dial y en el propio retículo.

---

## 2. El error de hidratación

`GameEngine` llamaba a `Math.random()` en el constructor para el viento
inicial. El provider crea el motor con `useMemo`, que también se ejecuta
durante el render en servidor: servidor y cliente sorteaban vientos distintos
y `telemetry.tsx` pintaba dos textos distintos → *hydration failed*.

Se resuelve **en el modelo**, no en el componente, porque el problema es del
modelo:

- Nuevo `components/game-engine/rng.ts`: LCG determinista con semilla por
  defecto fija.
- `GameEngine` acepta `{ seed }` y ya no toca `Math.random()` en ninguna parte.
- `GameProvider` llama a `engine.reseed(Date.now())` dentro de un `useEffect`.
  El primer render del cliente es idéntico al del servidor; la aleatoriedad
  real entra después de hidratar.

Beneficio colateral: **las partidas son reproducibles**. `engine.getSeed()`
devuelve la semilla, así que un bug de jugabilidad se puede reproducir exacto.
Es también lo que hace testeable la IA.

---

## 3. Otros fallos encontrados por el camino

- **`next build` fallaba sin red.** `next/font/google` descarga la tipografía
  en tiempo de compilación. Ahora se usa `next/font/local` sobre ficheros del
  repositorio: el build funciona sin conexión.
- **Las familias tipográficas no llegaban al DOM.** Los objetos de
  `next/font` se creaban en `layout.tsx` pero su `className`/`variable` nunca
  se aplicaba al `<html>`, así que `--font-sans` y `--font-mono` de
  `globals.css` quedaban sin resolver y todo caía al fallback del sistema.
- **Los tres diales estaban del revés.** La rotación era `-π/2 + 0.5` en lugar
  de `+π/2 - 0.5`: la esfera del dial miraba a la pared y solo se veía el
  lateral del cilindro. Además la aguja giraba sobre `rotation.z`, un eje
  sobre el que su brazo —que cuelga en `-Z`— no se desplaza; ahora gira sobre
  el eje del dial (`rotation.y`).
- **Rótulos de la consola en espejo**, por heredar la rotación del dial.
- **El jugador era invulnerable.** Ver sección 5.
- **El turno enemigo podía colgarse** si no quedaba ninguna batería viva.
- **Cabina demasiado oscura** para distinguir la consola.
- **404 de Vercel Analytics** en cada carga local.

---

## 4. Suite de tests (Vitest)

```
vitest.config.mts        entorno node, alias @/ , cobertura v8
tests/physics.test.ts    28 tests
tests/terrain.test.ts    26 tests   (terreno + catálogo de munición)
tests/enemy-ai.test.ts   23 tests
tests/engine.test.ts     20 tests
tests/audio-manager.test.ts 13 tests
                        ─────────
                        110 tests, ~1,6 s
```

Cobertura de los módulos del motor:

| Fichero | Sentencias |
|---|---|
| `physics.ts` | 98,6 % |
| `engine.ts` | 95,8 % |
| `enemy-ai.ts` | 96,6 % |
| `terrain.ts` | 100 % |
| `rng.ts` | 100 % |

Los tests de física comprueban **propiedades**, no números memorizados de una
ejecución: que el arrastre solo frene, que el viento desvíe en su sentido, que
la munición ligera derive más que la pesada, que el impacto caiga *sobre* la
superficie, que la simulación sea determinista. Así siguen valiendo si mañana
se retoca una constante de balance.

Los de motor **juegan partidas enteras** empujando `update(dt)` desde el test,
sin React, sin Three.js y sin navegador — que es exactamente lo que prometía
la arquitectura del proyecto y ahora queda demostrado.

Scripts nuevos: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`,
`pnpm typecheck` y `pnpm check` (typecheck + tests + build).

---

## 5. Refactorización de la IA — `enemy-ai.ts`

La IA vivía dentro de `engine.ts` en un método privado que llamaba a
`Math.random()`: imposible de probar y de extender.

Ahora es un módulo de **funciones puras** parametrizado por perfil:

```ts
selectShooter(targets, playerPosition)      // ¿quién dispara?
spreadForTurn(turn, profile)                // ¿cuánto se equivoca?
aimPointFor(playerPosition, turn, profile, rng)
solveSpeedWithDrag(…)                       // corrección de tiro
planEnemyShot(input): EnemyShotPlan | null  // el plan completo
```

`engine.ts` ya solo materializa el plan como proyectil, y acepta
`{ enemyProfile }` en el constructor. Hay tres perfiles listos
(`recluta`, `veterano`, `elite`) y añadir uno nuevo no toca el motor.

### El bug de jugabilidad que destapó la refactorización

La IA original resolvía el tiro con `solveSpeedForRange()`, que es la fórmula
balística **en el vacío**. Como el HE-72 sí tiene arrastre, el proyectil
enemigo se quedaba corto *sistemáticamente* unos 60 m: **el jugador no podía
perder la partida.**

El perfil por defecto ahora "corrige tiro": simula su propio disparo con la
física real del juego y ajusta la carga por bisección (12 iteraciones,
menos de un frame). No es una fórmula cerrada a propósito — si mañana la
física cambia, la IA se adapta sola.

Con eso el enemigo pasó a acertar *siempre*, así que hubo que recalibrar la
dispersión contra el radio de daño del HE-72 (14 m):

| Turno | Acierto | Daño medio por turno |
|---|---|---|
| 1 | 29 % | 5,4 |
| 3 | 39 % | 7,1 |
| 5 | 55 % | 9,9 |
| 8 | 91 % | 18,0 |
| 12 | 98 % | 22,1 |

La presión sube turno a turno y la partida se decide alrededor del turno 10 si
el jugador no despeja el sector antes.

---

## 6. Audio — `audio-manager.ts` (preparado, no integrado)

Lo importante del módulo no es el reproductor, es **`resolveAudioEvents()`**:
una función pura que compara dos snapshots del motor y devuelve qué sonidos
tocan. Con eso:

- el motor sigue sin saber que existe el audio (nadie lo importa desde
  `engine.ts`), fiel a la separación de capas;
- las reglas de "cuándo suena qué" ya están testeadas (13 tests);
- cambiar de backend solo obliga a escribir otro `AudioManager`.

Se incluyen dos implementaciones: `createSilentAudioManager()` (por defecto) y
`createWebAudioManager()`, que sintetiza los diez efectos por procedimiento
—sin añadir un solo byte a `public/`— y degrada a mudo en servidor o si el
navegador bloquea el autoplay. El fragmento de integración está en la cabecera
del fichero; son ocho líneas en la Vista.

---

## 7. Lo que queda pendiente

- **Integrar el audio en la Vista** y añadir un control de volumen al HUD
  (el módulo está listo; falta cablearlo y decidir dónde va el `unlock()`).
- **`game-config.ts`**: sigue habiendo constantes de balance repartidas entre
  `engine.ts` y `enemy-ai.ts`. Estaba en `TASKS.md` y no se ha tocado para no
  mezclar refactorización estructural con corrección de fallos.
- **ESLint**: el script `lint` invocaba un ESLint que no está instalado. Se ha
  retirado el script en lugar de dejarlo roto; conviene decidir configuración
  y añadirlo de vuelta.
- **Aviso `THREE.Clock is deprecated`**: viene de dentro de
  `@react-three/fiber` 9.7, no del código del proyecto. Es solo un aviso; se
  irá al actualizar la dependencia.
- **Nivel**: la loma que hay frente a la batería obliga al periscopio a
  mirar desde 22 m. Si se prefiere un visor a la altura del búnker, hay que
  retocar el terreno o mover los objetivos, no la cámara.

---

## Cómo verificarlo

```bash
pnpm install
pnpm check      # typecheck + 110 tests + build
pnpm dev        # http://localhost:3000
```

En el navegador: la cabina se ve al entrar, el monitor central emite la vista
táctica, `V` acerca el ojo al periscopio, el ratón mueve el cañón y
**ESPACIO** (mantener y soltar) dispara. La consola del navegador queda limpia.
