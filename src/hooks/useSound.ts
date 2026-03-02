import { useEffect, useRef } from 'react'

import clock1 from '../sounds/clock-1.mp3'
import clock2 from '../sounds/clock-2.mp3'
import clock3 from '../sounds/clock-3.mp3'

const TRACKS = [clock1, clock2, clock3]

/**
 * Plays the clock sound files in a looping sequence while `active` is true.
 * When `active` becomes false the current track is paused and reset.
 */
export function useSound(active: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const trackIndexRef = useRef(0)

  useEffect(() => {
    if (active) {
      // Create audio element for the current track if needed
      if (!audioRef.current) {
        const audio = new Audio(TRACKS[trackIndexRef.current])
        audioRef.current = audio

        // Advance to next track when one finishes
        audio.addEventListener('ended', () => {
          trackIndexRef.current = (trackIndexRef.current + 1) % TRACKS.length
          audio.src = TRACKS[trackIndexRef.current]
          audio.play().catch(() => { /* autoplay blocked */ })
        })
      }

      audioRef.current.play().catch(() => { /* autoplay blocked */ })
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
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
