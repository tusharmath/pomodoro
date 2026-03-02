import { useState, useEffect, useRef, useCallback } from 'react'
import { Mode, Settings, Session } from '../types'
import { useSound } from './useSound'

interface UseTimerReturn {
  mode: Mode
  timeLeft: number        // seconds
  isRunning: boolean
  pomodoroCount: number
  sessions: Session[]
  settings: Settings
  totalFocusMinutes: number
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  setMode: (mode: Mode) => void
  updateSettings: (s: Partial<Settings>) => void
}

const STORAGE_KEY_SETTINGS = 'pomodoro-settings'
const STORAGE_KEY_SESSIONS = 'pomodoro-sessions'

function loadSettings(defaults: Settings): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return defaults
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

import { DEFAULT_SETTINGS } from '../types'

export function useTimer(): UseTimerReturn {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(DEFAULT_SETTINGS))
  const [mode, setModeState] = useState<Mode>('pomodoro')
  const [timeLeft, setTimeLeft] = useState<number>(settings.pomodoro * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions())

  // Play clock sounds in a loop only during an active pomodoro session
  useSound(isRunning && mode === 'pomodoro', settings.clockSound)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const settingsRef = useRef(settings)
  const modeRef = useRef(mode)
  const pomodoroCountRef = useRef(pomodoroCount)

  settingsRef.current = settings
  modeRef.current = mode
  pomodoroCountRef.current = pomodoroCount

  // Persist sessions
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions))
  }, [sessions])

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
  }, [settings])

  const getDuration = useCallback((m: Mode, s: Settings) => {
    if (m === 'pomodoro') return s.pomodoro * 60
    if (m === 'shortBreak') return s.shortBreak * 60
    return s.longBreak * 60
  }, [])

  const playAlarm = useCallback(() => {
    if (!settingsRef.current.alarmSound) return
    try {
      const ctx = new AudioContext()
      const frequencies = [880, 660, 880]
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.25)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.2)
        osc.start(ctx.currentTime + i * 0.25)
        osc.stop(ctx.currentTime + i * 0.25 + 0.25)
      })
    } catch { /* AudioContext not available */ }
  }, [])

  const advance = useCallback(() => {
    const currentMode = modeRef.current
    const currentCount = pomodoroCountRef.current
    const s = settingsRef.current

    let newCount = currentCount
    let nextMode: Mode

    if (currentMode === 'pomodoro') {
      newCount = currentCount + 1
      setPomodoroCount(newCount)
      // Record session
      setSessions(prev => [...prev, {
        id: crypto.randomUUID(),
        mode: 'pomodoro',
        completedAt: new Date().toISOString(),
        duration: s.pomodoro,
      }])
      nextMode = newCount % s.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
    } else {
      nextMode = 'pomodoro'
    }

    playAlarm()

    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: nextMode === 'pomodoro' ? 'Break over! Time to focus.' : 'Pomodoro done! Take a break.',
        icon: '/tomato.svg',
      })
    }

    const nextDuration = getDuration(nextMode, s)
    setModeState(nextMode)
    setTimeLeft(nextDuration)

    const shouldAutoStart =
      (nextMode === 'pomodoro' && s.autoStartPomodoros) ||
      (nextMode !== 'pomodoro' && s.autoStartBreaks)

    if (shouldAutoStart) {
      setIsRunning(true)
    } else {
      setIsRunning(false)
    }
  }, [getDuration, playAlarm])

  // Tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            advance()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, advance])

  // Update page title
  useEffect(() => {
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
    const secs = String(timeLeft % 60).padStart(2, '0')
    document.title = `${mins}:${secs} — Pomodoro`
  }, [timeLeft])

  const start = useCallback(() => {
    // Request notification permission on first start
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => setIsRunning(false), [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(getDuration(modeRef.current, settingsRef.current))
  }, [getDuration])

  const skip = useCallback(() => {
    setIsRunning(false)
    advance()
  }, [advance])

  const setMode = useCallback((m: Mode) => {
    setIsRunning(false)
    setModeState(m)
    setTimeLeft(getDuration(m, settingsRef.current))
  }, [getDuration])

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial }
      // Recalculate timeLeft for current mode if duration changed
      setTimeLeft(getDuration(modeRef.current, next))
      setIsRunning(false)
      return next
    })
  }, [getDuration])

  const totalFocusMinutes = sessions
    .filter(s => s.mode === 'pomodoro')
    .reduce((acc, s) => acc + s.duration, 0)

  return {
    mode,
    timeLeft,
    isRunning,
    pomodoroCount,
    sessions,
    settings,
    totalFocusMinutes,
    start,
    pause,
    reset,
    skip,
    setMode,
    updateSettings,
  }
}
