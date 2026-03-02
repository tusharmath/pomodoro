import { Session } from '../types'
import styles from './Stats.module.css'

interface Props {
  pomodoroCount: number
  sessions: Session[]
  totalFocusMinutes: number
}

function getTodaySessions(sessions: Session[]): Session[] {
  const today = new Date().toDateString()
  return sessions.filter(s => new Date(s.completedAt).toDateString() === today)
}

export default function Stats({ pomodoroCount, sessions, totalFocusMinutes }: Props) {
  const todaySessions = getTodaySessions(sessions)
  const todayPomodoros = todaySessions.filter(s => s.mode === 'pomodoro').length
  const todayMinutes = todaySessions
    .filter(s => s.mode === 'pomodoro')
    .reduce((acc, s) => acc + s.duration, 0)

  function formatMinutes(mins: number): string {
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    return `${mins}m`
  }

  return (
    <div className={styles.container}>
      <div className={styles.stat}>
        <span className={`${styles.value} ${pomodoroCount === 0 ? styles.empty : ''}`}>
          {pomodoroCount}
        </span>
        <span className={styles.label}>Sessions</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={`${styles.value} ${todayPomodoros === 0 ? styles.empty : ''}`}>
          {todayPomodoros}
        </span>
        <span className={styles.label}>Today</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={`${styles.value} ${todayMinutes === 0 ? styles.empty : ''}`}>
          {formatMinutes(todayMinutes)}
        </span>
        <span className={styles.label}>Focus time</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={`${styles.value} ${totalFocusMinutes === 0 ? styles.empty : ''}`}>
          {formatMinutes(totalFocusMinutes)}
        </span>
        <span className={styles.label}>All time</span>
      </div>
    </div>
  )
}
