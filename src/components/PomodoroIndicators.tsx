import { Mode, MODE_COLORS } from '../types'
import styles from './PomodoroIndicators.module.css'

interface Props {
  pomodoroCount: number
  longBreakInterval: number
  mode: Mode
}

export default function PomodoroIndicators({ pomodoroCount, longBreakInterval, mode }: Props) {
  const completed = pomodoroCount % longBreakInterval
  const color = MODE_COLORS[mode]

  return (
    <div className={styles.container} aria-label={`${completed} of ${longBreakInterval} pomodoros completed`}>
      {Array.from({ length: longBreakInterval }).map((_, i) => (
        <div
          key={i}
          className={`${styles.dot} ${i < completed ? styles.filled : ''}`}
          style={i < completed
            ? { background: color, borderColor: color, boxShadow: `0 0 10px ${color}99` }
            : {}
          }
        />
      ))}
    </div>
  )
}
