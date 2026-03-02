export type Mode = 'pomodoro' | 'shortBreak' | 'longBreak'

export interface Settings {
  pomodoro: number      // minutes
  shortBreak: number
  longBreak: number
  longBreakInterval: number  // pomodoros before long break
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  alarmSound: boolean
}

export interface Session {
  id: string
  mode: Mode
  completedAt: string   // ISO date string
  duration: number      // minutes
}

export const DEFAULT_SETTINGS: Settings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  alarmSound: true,
}

export const MODE_LABELS: Record<Mode, string> = {
  pomodoro: 'Pomodoro',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
}

export const MODE_COLORS: Record<Mode, string> = {
  pomodoro: '#e94560',
  shortBreak: '#4ecca3',
  longBreak: '#6c63ff',
}
