import { useEffect, useRef } from 'react'

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
  }

  function stopSource() {
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch { /* already stopped */ }
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
  }

  useEffect(() => {
    const url = TRACKS[track]

    if (!active) {
      stopSource()
      ctxRef.current?.suspend()
      return
    }

    ctxRef.current?.resume()

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
  // Store fade params in refs so the stop path always sees the latest values
  const fadeOutRef   = useRef(fadeOut)
  fadeOutRef.current = fadeOut

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = createCtx()
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
  }

  function stopSource(fadeOutSec: number) {
    const ctx  = ctxRef.current
    const gain = gainRef.current
    const src  = sourceRef.current
    if (!ctx || !gain || !src) return

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

    sourceRef.current = null
  }

  useEffect(() => {
    const url = BREAK_TRACKS[track]

    if (!active) {
      stopSource(fadeOutRef.current)
      // Suspend after the fade-out finishes
      const delay = (Math.max(0, fadeOutRef.current) + 0.15) * 1000
      const t = setTimeout(() => ctxRef.current?.suspend(), delay)
      return () => clearTimeout(t)
    }

    ctxRef.current?.resume()

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
