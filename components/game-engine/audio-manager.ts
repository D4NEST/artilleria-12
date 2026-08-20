/**
 * ============================================================================
 *  AUDIO — Interfaz de sonido del juego
 * ============================================================================
 *  Preparado para integrar, no integrado todavía. La pieza importante de este
 *  módulo NO es el reproductor: es `resolveAudioEvents`, una función PURA que
 *  traduce "dos snapshots consecutivos del motor" en "qué sonidos tocan".
 *
 *  Con ese diseño:
 *   - El motor sigue sin saber que existe el audio (no lo importa nadie desde
 *     `engine.ts`), fiel a la separación de capas del proyecto.
 *   - La lógica de "cuándo suena qué" es testeable sin navegador ni altavoces.
 *   - Cambiar de backend —WebAudio, Howler, un pack de samples— solo obliga a
 *     escribir otro `AudioManager`; las reglas no se tocan.
 *
 *  Uso previsto desde la Vista (cuando se integre):
 *
 *      const audio = useMemo(() => createWebAudioManager(), [])
 *      const previo = useRef(engine.getSnapshot())
 *      useEffect(() =>
 *        engine.subscribe(() => {
 *          const actual = engine.getSnapshot()
 *          for (const ev of resolveAudioEvents(previo.current, actual)) audio.play(ev)
 *          previo.current = actual
 *        }), [engine, audio])
 *
 *  IMPORTANTE: los navegadores exigen un gesto del usuario antes de emitir
 *  sonido. Por eso `createWebAudioManager()` no abre el AudioContext hasta la
 *  primera llamada a `unlock()` o `play()`, y nunca toca `window` al importar
 *  el módulo (si no, rompería el render en servidor).
 * ============================================================================
 */

import type { GameState } from './types'

/* ------------------------------------------------------------------ eventos */

/** Catálogo cerrado de sonidos del juego. */
export type AudioEventId =
  | 'shot' // disparo propio
  | 'incoming' // silbido de proyectil entrante
  | 'impactHit' // impacto sobre un objetivo
  | 'impactMiss' // impacto en terreno vacío
  | 'targetDestroyed' // objetivo destruido
  | 'bunkerHit' // el búnker propio encaja daño
  | 'ammoSwitch' // palanca de munición
  | 'turnStart' // empieza el turno del jugador
  | 'victory'
  | 'defeat'

export interface AudioEvent {
  id: AudioEventId
  /** 0..1. La Vista puede atenuar según la distancia o la estación. */
  gain?: number
}

/* ----------------------------------------------------------------- contrato */

export interface AudioManager {
  /** Reproduce un evento. Silencioso y sin lanzar si el audio no está listo. */
  play(event: AudioEvent | AudioEventId): void
  /** Abre el contexto de audio. Debe llamarse desde un gesto del usuario. */
  unlock(): Promise<void>
  /** Silencia o restaura todo el audio. */
  setMuted(muted: boolean): void
  isMuted(): boolean
  /** Volumen general 0..1. */
  setVolume(volume: number): void
  /** Libera recursos (cerrar el AudioContext al desmontar). */
  dispose(): void
}

/* ---------------------------------------------- reglas: estado -> sonidos */

/**
 * Compara dos snapshots consecutivos y devuelve los sonidos que corresponden.
 *
 * Es pura y determinista: mismos snapshots, mismos eventos. Todo el
 * "cuándo suena qué" del juego vive aquí y se puede testear.
 */
export function resolveAudioEvents(previous: GameState, next: GameState): AudioEvent[] {
  const events: AudioEvent[] = []

  // Disparo propio: el contador de disparos es la señal fiable (la fase puede
  // no haberse volcado todavía por el throttling a 20 Hz del motor).
  if (next.shotsFired > previous.shotsFired) events.push({ id: 'shot' })

  // Fuego entrante: el enemigo acaba de abrir fuego.
  if (previous.phase !== 'enemy' && next.phase === 'enemy') events.push({ id: 'incoming' })

  // Resolución del disparo propio.
  if (next.lastShot && next.lastShot !== previous.lastShot) {
    events.push({ id: next.lastShot.hit ? 'impactHit' : 'impactMiss' })
    if (next.lastShot.destroyed) events.push({ id: 'targetDestroyed' })
  }

  // Daño al búnker propio: proporcional a lo que ha dolido.
  if (next.playerHp < previous.playerHp) {
    const dano = (previous.playerHp - next.playerHp) / Math.max(1, next.playerMaxHp)
    events.push({ id: 'bunkerHit', gain: clamp01(0.4 + dano * 2) })
  }

  // Palanca de munición.
  if (next.ammoId !== previous.ammoId) events.push({ id: 'ammoSwitch', gain: 0.5 })

  // Nuevo turno del jugador.
  if (next.turn > previous.turn) events.push({ id: 'turnStart', gain: 0.6 })

  // Fin de partida (solo en la transición, no en cada snapshot posterior).
  if (previous.phase !== 'gameover' && next.phase === 'gameover') {
    events.push({ id: next.victory ? 'victory' : 'defeat' })
  }

  return events
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

/* ------------------------------------------------------- implementaciones */

/**
 * Manager mudo. Es el valor por defecto: permite cablear toda la Vista al
 * audio hoy y activar el sonido de verdad cuando existan los recursos.
 */
export function createSilentAudioManager(): AudioManager {
  let muted = false
  return {
    play: () => {},
    unlock: async () => {},
    setMuted: (v) => {
      muted = v
    },
    isMuted: () => muted,
    setVolume: () => {},
    dispose: () => {},
  }
}

/** Receta sonora de cada evento. Síntesis pura: cero ficheros que descargar. */
interface Voice {
  /** Forma de onda del oscilador. */
  wave: OscillatorType
  /** Frecuencia inicial y final del barrido, en Hz. */
  from: number
  to: number
  /** Duración en segundos. */
  duration: number
  /** Ganancia relativa 0..1. */
  gain: number
  /** Ruido en vez de tono (explosiones). */
  noise?: boolean
}

const VOICES: Record<AudioEventId, Voice> = {
  shot: { wave: 'square', from: 180, to: 40, duration: 0.35, gain: 0.5, noise: true },
  incoming: { wave: 'sine', from: 1400, to: 260, duration: 1.1, gain: 0.25 },
  impactHit: { wave: 'sawtooth', from: 120, to: 30, duration: 0.6, gain: 0.6, noise: true },
  impactMiss: { wave: 'sawtooth', from: 90, to: 28, duration: 0.45, gain: 0.35, noise: true },
  targetDestroyed: { wave: 'sawtooth', from: 200, to: 25, duration: 1.2, gain: 0.7, noise: true },
  bunkerHit: { wave: 'square', from: 140, to: 35, duration: 0.7, gain: 0.6, noise: true },
  ammoSwitch: { wave: 'square', from: 620, to: 880, duration: 0.07, gain: 0.25 },
  turnStart: { wave: 'triangle', from: 440, to: 660, duration: 0.18, gain: 0.3 },
  victory: { wave: 'triangle', from: 330, to: 990, duration: 0.9, gain: 0.45 },
  defeat: { wave: 'triangle', from: 330, to: 90, duration: 1.4, gain: 0.45 },
}

/**
 * Implementación con WebAudio y síntesis procedimental.
 *
 * No necesita ficheros de audio, así que el juego puede tener sonido sin
 * añadir un solo byte a `public/`. Cuando existan samples reales basta con
 * sustituir `emit()` por la reproducción de un `AudioBuffer`.
 */
export function createWebAudioManager(): AudioManager {
  // Sin `window` (SSR, tests en Node) el manager es simplemente mudo.
  if (typeof window === 'undefined') return createSilentAudioManager()

  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return createSilentAudioManager()

  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let volume = 0.7
  let muted = false
  let noiseBuffer: AudioBuffer | null = null

  function ensure(): AudioContext | null {
    if (ctx) return ctx
    try {
      ctx = new Ctor!()
      master = ctx.createGain()
      master.gain.value = muted ? 0 : volume
      master.connect(ctx.destination)
      return ctx
    } catch {
      // Autoplay bloqueado o dispositivo sin salida: se sigue jugando en mudo.
      return null
    }
  }

  function getNoise(context: AudioContext): AudioBuffer {
    if (noiseBuffer) return noiseBuffer
    const length = Math.floor(context.sampleRate * 1.5)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    noiseBuffer = buffer
    return buffer
  }

  function emit(voice: Voice, gain: number) {
    const context = ensure()
    if (!context || !master || muted) return
    const t = context.currentTime
    const env = context.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, voice.gain * gain), t + 0.01)
    env.gain.exponentialRampToValueAtTime(0.0001, t + voice.duration)
    env.connect(master)

    if (voice.noise) {
      const src = context.createBufferSource()
      src.buffer = getNoise(context)
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(voice.from * 6, t)
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, voice.to * 6), t + voice.duration)
      src.connect(filter).connect(env)
      src.start(t)
      src.stop(t + voice.duration)
      return
    }

    const osc = context.createOscillator()
    osc.type = voice.wave
    osc.frequency.setValueAtTime(voice.from, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, voice.to), t + voice.duration)
    osc.connect(env)
    osc.start(t)
    osc.stop(t + voice.duration)
  }

  return {
    play(event) {
      const e: AudioEvent = typeof event === 'string' ? { id: event } : event
      const voice = VOICES[e.id]
      if (voice) emit(voice, clamp01(e.gain ?? 1))
    },
    async unlock() {
      const context = ensure()
      if (context && context.state === 'suspended') await context.resume()
    },
    setMuted(value) {
      muted = value
      if (master) master.gain.value = value ? 0 : volume
    },
    isMuted: () => muted,
    setVolume(value) {
      volume = clamp01(value)
      if (master && !muted) master.gain.value = volume
    },
    dispose() {
      void ctx?.close()
      ctx = null
      master = null
      noiseBuffer = null
    },
  }
}
