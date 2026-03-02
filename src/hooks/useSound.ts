import { useEffect, useRef } from 'react'

import clock1 from '../sounds/clock-1.mp3'
import clock2 from '../sounds/clock-2.mp3'
import clock3 from '../sounds/clock-3.mp3'

export const TRACKS: Record<1 | 2 | 3, string> = {
  1: clock1,
  2: clock2,
  3: clock3,
}

/**
 * Plays the selected clock sound in a loop while `active` is true.
 * Switches to the new track immediately when `track` changes.
 * When `active` becomes false the audio is paused and reset.
 */
export function useSound(active: boolean, track: 1 | 2 | 3) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Swap src whenever the chosen track changes
  useEffect(() => {
    if (!audioRef.current) return
    const wasPlaying = !audioRef.current.paused
    audioRef.current.pause()
    audioRef.current.src = TRACKS[track]
    audioRef.current.currentTime = 0
    if (wasPlaying) {
      audioRef.current.play().catch(() => { /* autoplay blocked */ })
    }
  }, [track])

  // Start / stop based on `active`
  useEffect(() => {
    if (active) {
      if (!audioRef.current) {
        audioRef.current = new Audio(TRACKS[track])
        audioRef.current.loop = true
      }
      audioRef.current.play().catch(() => { /* autoplay blocked */ })
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])
}
