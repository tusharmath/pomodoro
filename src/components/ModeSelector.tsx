import { Mode, MODE_LABELS, MODE_COLORS } from '../types'
import styles from './ModeSelector.module.css'

interface Props {
  mode: Mode
  onSelect: (mode: Mode) => void
}

const MODES: Mode[] = ['pomodoro', 'shortBreak', 'longBreak']

export default function ModeSelector({ mode, onSelect }: Props) {
  return (
    <div className={styles.container}>
      {MODES.map(m => (
        <button
          key={m}
          className={`${styles.btn} ${mode === m ? styles.active : ''}`}
          style={mode === m ? { '--accent': MODE_COLORS[m] } as React.CSSProperties : {}}
          onClick={() => onSelect(m)}
          aria-pressed={mode === m}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  )
}
