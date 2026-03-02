import { Mode, MODE_COLORS } from '../types'
import styles from './TimerRing.module.css'

interface Props {
  timeLeft: number    // seconds
  totalTime: number   // seconds
  mode: Mode
  isRunning: boolean
}

export default function TimerRing({ timeLeft, totalTime, mode, isRunning }: Props) {
  const size = 248
  const strokeWidth = 11
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = totalTime > 0 ? timeLeft / totalTime : 1
  const dashOffset = circumference * (1 - progress)

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const color = MODE_COLORS[mode]

  const isReady = !isRunning && timeLeft === totalTime
  const statusLabel = isRunning ? 'Focus' : isReady ? 'Ready' : 'Paused'

  return (
    <div className={styles.wrapper}>
      <svg
        width={size}
        height={size}
        className={`${styles.svg} ${isRunning ? styles.running : ''}`}
        style={{ '--ring-color': color } as React.CSSProperties}
      >
        {/* Inner fill for depth */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth / 2}
          fill="rgba(255,255,255,0.05)"
        />
        {/* Colored inner glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth / 2}
          fill={color}
          opacity="0.08"
          style={{ transition: 'fill 0.4s ease, opacity 0.4s ease' }}
        />
        {/* Background track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.4s ease' }}
        />
      </svg>
      <div className={styles.display}>
        <span className={styles.time}>{mins}:{secs}</span>
        <span className={styles.status} style={{ color }}>
          {statusLabel}
        </span>
      </div>
    </div>
  )
}
