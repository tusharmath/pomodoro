import { Mode, MODE_COLORS } from '../types'
import styles from './Controls.module.css'

interface Props {
  isRunning: boolean
  mode: Mode
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onSkip: () => void
}

export default function Controls({ isRunning, mode, onStart, onPause, onReset, onSkip }: Props) {
  const accent = MODE_COLORS[mode]

  return (
    <div className={styles.container}>
      <button
        className={styles.iconBtn}
        onClick={onReset}
        title="Reset"
        aria-label="Reset timer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>

      <button
        className={styles.mainBtn}
        style={{ '--accent': accent, '--accent-glow': accent + '55' } as React.CSSProperties}
        onClick={isRunning ? onPause : onStart}
        aria-label={isRunning ? 'Pause' : 'Start'}
      >
        {isRunning ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        )}
      </button>

      <button
        className={styles.iconBtn}
        onClick={onSkip}
        title="Skip"
        aria-label="Skip to next"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5,4 15,12 5,20"/>
          <line x1="19" y1="5" x2="19" y2="19"/>
        </svg>
      </button>
    </div>
  )
}
