import { useEffect, useRef, type MutableRefObject } from 'react'

const base = import.meta.env.BASE_URL

export const TRACKS: Record<1 | 2 | 3, string> = {
  1: `${base}sounds/clock-1.mp3`,
  2: `${base}sounds/clock-2.mp3`,
  3: `${base}sounds/clock-3.mp3`,
}

export const BREAK_TRACKS: Record<1 | 2, string> = {
  1: `${base}sounds/break-1.mp3`,
  2: `${base}sounds/break-2.mp3`,
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function createCtx(): AudioContext {
  return new AudioContext()
}

async function fetchAndDecode(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url)
  const arrayBuffer = await res.arrayBuffer()
  return ctx.decodeAudioData(arrayBuffer)
}

const WATCHDOG_MS = 2000
// If ctx.currentTime hasn't advanced across this many watchdog ticks while the
// context claims to be 'running', the audio pipeline is dead (e.g. the output
// device went away) and the context must be rebuilt.
const STALL_TICKS = 2

/**
 * Browsers can kill looping audio in several ways while the page keeps
 * running: the AudioContext gets suspended/interrupted (tab backgrounded,
 * screen lock, another app takes the audio session), the source node is
 * terminated, or the context stays 'running' but its clock stops advancing
 * (output device changed / Bluetooth headphones slept). While `active` is
 * true this hook watches for all of these and repairs them:
 *  - not running  -> ctx.resume()
 *  - stalled      -> `rebuild()` (caller closes ctx, creates a new one, restarts)
 *  - no source    -> `restart()` (caller starts a fresh source node)
 */
function useKeepAlive(
  ctxRef: MutableRefObject<AudioContext | null>,
  sourceRef: MutableRefObject<AudioBufferSourceNode | null>,
  active: boolean,
  restart: () => void,
  rebuild: () => void,
) {
  const restartRef = useRef(restart)
  const rebuildRef = useRef(rebuild)
  restartRef.current = restart
  rebuildRef.current = rebuild

  useEffect(() => {
    if (!active) return

    let lastTime = -1
    let stalled = 0

    const check = () => {
      const ctx = ctxRef.current
      if (!ctx || ctx.state === 'closed') {
        rebuildRef.current()
        return
      }
      // 'interrupted' is a Safari-only state not in the TS lib typings
      if ((ctx.state as string) !== 'running') {
        stalled = 0
        ctx.resume().catch(() => { /* needs a user gesture; retry later */ })
        return
      }
      // Running but the clock isn't moving -> pipeline is dead
      if (ctx.currentTime === lastTime) {
        stalled++
        if (stalled >= STALL_TICKS) {
          stalled = 0
          lastTime = -1
          rebuildRef.current()
          return
        }
      } else {
        stalled = 0
      }
      lastTime = ctx.currentTime
      // Running fine but nothing is playing -> start a source
      if (!sourceRef.current) restartRef.current()
    }

    const onStateChange = () => check()
    const ctx = ctxRef.current
    ctx?.addEventListener('statechange', onStateChange)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    window.addEventListener('pointerdown', check)
    navigator.mediaDevices?.addEventListener?.('devicechange', check)
    const watchdog = setInterval(check, WATCHDOG_MS)

    return () => {
      ctx?.removeEventListener('statechange', onStateChange)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
      window.removeEventListener('pointerdown', check)
      navigator.mediaDevices?.removeEventListener?.('devicechange', check)
      clearInterval(watchdog)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}

// ---------------------------------------------------------------------------
// useSound — gapless looping clock tick (no fade)
// ---------------------------------------------------------------------------

/**
 * Plays the selected clock sound in a gapless loop while `active` is true.
 * Uses AudioBufferSourceNode.loop for sample-accurate, gap-free looping.
 */
export function useSound(active: boolean, track: 1 | 2 | 3) {
  const ctxRef       = useRef<AudioContext | null>(null)
  const bufferRef    = useRef<AudioBuffer | null>(null)
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null)
  const loadedUrlRef = useRef<string>('')
  const activeRef    = useRef(active)
  activeRef.current = active

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = createCtx()
    }
    return ctxRef.current
  }

  function startSource(buffer: AudioBuffer) {
    const ctx = getCtx()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(ctx.destination)
    source.start(0)
    sourceRef.current = source
    // A looping source only ends if we stop it or the browser kills it.
    // If it was the browser, start a fresh one.
    source.onended = () => {
      if (sourceRef.current !== source) return // we stopped it on purpose
      sourceRef.current = null
      if (activeRef.current && bufferRef.current) startSource(bufferRef.current)
    }
  }

  function stopSource() {
    if (sourceRef.current) {
      const src = sourceRef.current
      sourceRef.current = null
      try { src.stop() } catch { /* already stopped */ }
      src.disconnect()
    }
  }

  function restart() {
    if (!activeRef.current || !bufferRef.current) return
    stopSource()
    startSource(bufferRef.current)
  }

  function rebuild() {
    stopSource()
    try { ctxRef.current?.close() } catch { /* ignore */ }
    ctxRef.current = null
    restart()
  }

  useKeepAlive(ctxRef, sourceRef, active, restart, rebuild)

  useEffect(() => {
    const url = TRACKS[track]

    if (!active) {
      stopSource()
      ctxRef.current?.suspend()
      return
    }

    getCtx().resume()

    if (bufferRef.current && loadedUrlRef.current === url) {
      startSource(bufferRef.current)
    } else {
      stopSource()
      bufferRef.current = null
      loadedUrlRef.current = url
      fetchAndDecode(getCtx(), url).then(buffer => {
        if (loadedUrlRef.current !== url) return
        bufferRef.current = buffer
        if (active) startSource(buffer)
      }).catch(() => { /* fetch/decode failed */ })
    }

    return () => { stopSource() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, track])

  useEffect(() => {
    return () => {
      stopSource()
      ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [])
}

// ---------------------------------------------------------------------------
// useBreakSound — looping break ambient with fade-in / fade-out
// ---------------------------------------------------------------------------

/**
 * Plays the selected break sound in a gapless loop while `active` is true.
 * Fades in over `fadeIn` seconds when starting and fades out over `fadeOut`
 * seconds when stopping. All fades are scheduled in the Web Audio render
 * thread so they are perfectly smooth regardless of JS event loop load.
 */
export function useBreakSound(
  active: boolean,
  track: 1 | 2,
  fadeIn: number,
  fadeOut: number,
) {
  const ctxRef       = useRef<AudioContext | null>(null)
  const gainRef      = useRef<GainNode | null>(null)
  const bufferRef    = useRef<AudioBuffer | null>(null)
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null)
  const loadedUrlRef = useRef<string>('')
  const activeRef    = useRef(active)
  activeRef.current = active
  // Store fade params in refs so the stop path always sees the latest values
  const fadeOutRef   = useRef(fadeOut)
  fadeOutRef.current = fadeOut

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = createCtx()
      // Gain node belongs to the old context; recreate it lazily
      gainRef.current = null
    }
    return ctxRef.current
  }

  function startSource(buffer: AudioBuffer, fadeInSec: number) {
    const ctx = getCtx()

    // Create (or reuse) the gain node
    if (!gainRef.current) {
      gainRef.current = ctx.createGain()
      gainRef.current.connect(ctx.destination)
    }

    const gain = gainRef.current
    const now  = ctx.currentTime

    // Schedule fade-in
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(0, now)
    if (fadeInSec > 0) {
      gain.gain.linearRampToValueAtTime(1, now + fadeInSec)
    } else {
      gain.gain.setValueAtTime(1, now)
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(gain)
    source.start(0)
    sourceRef.current = source
    // Browser killed the looping source while we still want sound -> restart
    source.onended = () => {
      if (sourceRef.current !== source) return // stopped on purpose
      sourceRef.current = null
      if (activeRef.current && bufferRef.current) startSource(bufferRef.current, 0.2)
    }
  }

  function restart() {
    if (!activeRef.current || !bufferRef.current) return
    const src = sourceRef.current
    sourceRef.current = null
    if (src) {
      try { src.stop() } catch { /* ignore */ }
      try { src.disconnect() } catch { /* ignore */ }
    }
    startSource(bufferRef.current, 0.2)
  }

  function rebuild() {
    const src = sourceRef.current
    sourceRef.current = null
    if (src) {
      try { src.stop() } catch { /* ignore */ }
      try { src.disconnect() } catch { /* ignore */ }
    }
    try { gainRef.current?.disconnect() } catch { /* ignore */ }
    gainRef.current = null
    try { ctxRef.current?.close() } catch { /* ignore */ }
    ctxRef.current = null
    restart()
  }

  function stopSource(fadeOutSec: number) {
    const ctx  = ctxRef.current
    const gain = gainRef.current
    const src  = sourceRef.current
    if (!ctx || !gain || !src) return

    // Clear first so onended treats this as an intentional stop
    sourceRef.current = null

    const now = ctx.currentTime
    const dur = Math.max(0, fadeOutSec)

    // Schedule fade-out, then stop the source node after it completes
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    if (dur > 0) {
      gain.gain.linearRampToValueAtTime(0, now + dur)
      src.stop(now + dur)
    } else {
      gain.gain.setValueAtTime(0, now)
      try { src.stop() } catch { /* already stopped */ }
    }

    // Disconnect after fade completes
    setTimeout(() => {
      try { src.disconnect() } catch { /* ignore */ }
    }, (dur + 0.1) * 1000)
  }

  useKeepAlive(ctxRef, sourceRef, active, restart, rebuild)

  useEffect(() => {
    const url = BREAK_TRACKS[track]

    if (!active) {
      stopSource(fadeOutRef.current)
      // Suspend after the fade-out finishes
      const delay = (Math.max(0, fadeOutRef.current) + 0.15) * 1000
      const t = setTimeout(() => ctxRef.current?.suspend(), delay)
      return () => clearTimeout(t)
    }

    getCtx().resume()

    if (bufferRef.current && loadedUrlRef.current === url) {
      startSource(bufferRef.current, fadeIn)
    } else {
      // Fade out any currently playing source before swapping track
      stopSource(fadeOutRef.current)
      bufferRef.current = null
      loadedUrlRef.current = url
      fetchAndDecode(getCtx(), url).then(buffer => {
        if (loadedUrlRef.current !== url) return
        bufferRef.current = buffer
        if (active) startSource(buffer, fadeIn)
      }).catch(() => { /* fetch/decode failed */ })
    }

    return () => {
      // When effect re-runs (track/active changed), do an immediate stop
      // — the new run will handle its own fade-in
      const src = sourceRef.current
      if (src) {
        try { src.stop() } catch { /* ignore */ }
        try { src.disconnect() } catch { /* ignore */ }
        sourceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, track])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const src = sourceRef.current
      if (src) {
        try { src.stop() } catch { /* ignore */ }
        try { src.disconnect() } catch { /* ignore */ }
        sourceRef.current = null
      }
      gainRef.current?.disconnect()
      gainRef.current = null
      ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [])
}
