import { useEffect, useRef } from 'react'

export const TRACKS: Record<1 | 2 | 3, string> = {
  1: '/sounds/clock-1.mp3',
  2: '/sounds/clock-2.mp3',
  3: '/sounds/clock-3.mp3',
}

/**
 * Plays the selected clock sound in a gapless loop while `active` is true.
 * Uses the Web Audio API (AudioBufferSourceNode) for sample-accurate looping
 * with zero gap between repetitions — HTMLAudioElement loop=true and the
 * 'ended' event approach both introduce a small but audible pause.
 */
export function useSound(active: boolean, track: 1 | 2 | 3) {
  const ctxRef    = useRef<AudioContext | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  // Track which url is currently decoded so we re-fetch on track change
  const loadedUrlRef = useRef<string>('')

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    return ctxRef.current
  }

  async function loadBuffer(url: string): Promise<AudioBuffer> {
    const ctx = getCtx()
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    return ctx.decodeAudioData(arrayBuffer)
  }

  function startSource(buffer: AudioBuffer) {
    const ctx = getCtx()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true          // sample-accurate looping inside the API
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

  // React to active / track changes
  useEffect(() => {
    const url = TRACKS[track]

    if (!active) {
      stopSource()
      // Suspend context to release audio hardware while idle
      ctxRef.current?.suspend()
      return
    }

    // Resume a suspended context (required after user gesture on some browsers)
    ctxRef.current?.resume()

    if (bufferRef.current && loadedUrlRef.current === url) {
      // Buffer already decoded for this track — start immediately
      startSource(bufferRef.current)
    } else {
      // Fetch & decode, then start
      stopSource()
      bufferRef.current = null
      loadedUrlRef.current = url
      loadBuffer(url).then(buffer => {
        // Guard: make sure we're still supposed to be playing this track
        if (loadedUrlRef.current !== url) return
        bufferRef.current = buffer
        if (active) startSource(buffer)
      }).catch(() => { /* fetch/decode failed */ })
    }

    return () => {
      // Cleanup when effect re-runs (track/active changed)
      stopSource()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, track])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSource()
      ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [])
}
