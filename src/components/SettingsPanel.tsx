import { useRef, useState } from 'react'
import { Settings } from '../types'
import { TRACKS } from '../hooks/useSound'
import styles from './SettingsPanel.module.css'

interface Props {
  settings: Settings
  onUpdate: (s: Partial<Settings>) => void
  onClose: () => void
}

interface NumberInputProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

function NumberInput({ label, value, min, max, onChange }: NumberInputProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.stepper}>
        <button
          className={styles.stepBtn}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
        >−</button>
        <span className={styles.stepValue}>{value}</span>
        <button
          className={styles.stepBtn}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  )
}

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <button
        className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}

const SOUND_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Clock 1',
  2: 'Clock 2',
  3: 'Clock 3',
  4: 'Clock 4',
}

function SoundPicker({ value, onChange }: { value: 1 | 2 | 3 | 4; onChange: (v: 1 | 2 | 3 | 4) => void }) {
  const previewRef = useRef<HTMLAudioElement | null>(null)

  function preview(track: 1 | 2 | 3 | 4) {
    if (previewRef.current) {
      previewRef.current.pause()
      previewRef.current.currentTime = 0
    }
    const audio = new Audio(TRACKS[track])
    previewRef.current = audio
    // Play a 3-second preview then stop
    audio.play().catch(() => {})
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 3000)
  }

  return (
    <div className={styles.field} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
      <span className={styles.fieldLabel}>Clock Sound</span>
      <div className={styles.soundOptions}>
        {([1, 2, 3, 4] as const).map(n => (
          <button
            key={n}
            className={`${styles.soundOption} ${value === n ? styles.soundOptionActive : ''}`}
            onClick={() => { onChange(n); preview(n) }}
            aria-pressed={value === n}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
            {SOUND_LABELS[n]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  const [local, setLocal] = useState<Settings>(settings)

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setLocal(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    onUpdate(local)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Settings">
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Timer (minutes)</h3>
          <NumberInput label="Pomodoro" value={local.pomodoro} min={1} max={60} onChange={v => set('pomodoro', v)} />
          <NumberInput label="Short Break" value={local.shortBreak} min={1} max={30} onChange={v => set('shortBreak', v)} />
          <NumberInput label="Long Break" value={local.longBreak} min={1} max={60} onChange={v => set('longBreak', v)} />
          <NumberInput label="Long Break Interval" value={local.longBreakInterval} min={2} max={10} onChange={v => set('longBreakInterval', v)} />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Auto Start</h3>
          <Toggle label="Auto-start Breaks" checked={local.autoStartBreaks} onChange={v => set('autoStartBreaks', v)} />
          <Toggle label="Auto-start Pomodoros" checked={local.autoStartPomodoros} onChange={v => set('autoStartPomodoros', v)} />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Sound</h3>
          <Toggle label="Alarm Sound" checked={local.alarmSound} onChange={v => set('alarmSound', v)} />
          <SoundPicker value={local.clockSound} onChange={v => set('clockSound', v)} />
        </div>

        <button className={styles.saveBtn} onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  )
}
