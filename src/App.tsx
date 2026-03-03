import { useState } from 'react'
import tomatoSvg from '/tomato.svg'
import { useTimer } from './hooks/useTimer'
import { MODE_COLORS } from './types'
import ModeSelector from './components/ModeSelector'
import TimerRing from './components/TimerRing'
import Controls from './components/Controls'
import Stats from './components/Stats'
import PomodoroIndicators from './components/PomodoroIndicators'
import SettingsPanel from './components/SettingsPanel'
import styles from './App.module.css'

export default function App() {
  const {
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
  } = useTimer()

  const [showSettings, setShowSettings] = useState(false)

  const totalTime =
    mode === 'pomodoro' ? settings.pomodoro * 60
    : mode === 'shortBreak' ? settings.shortBreak * 60
    : settings.longBreak * 60

  const accent = MODE_COLORS[mode]

  return (
    <div
      className={styles.app}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {/* Ambient background glow */}
      <div className={styles.glow} style={{ background: accent }} />

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.brand}>
            <img src={tomatoSvg} alt="Pomodoro" className={styles.logo} />
            <span className={styles.brandName}>Pomodoro</span>
          </div>
          <button
            className={styles.settingsBtn}
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Mode selector */}
        <ModeSelector mode={mode} onSelect={setMode} />

        {/* Timer ring */}
        <div className={styles.timerSection}>
          <TimerRing
            timeLeft={timeLeft}
            totalTime={totalTime}
            mode={mode}
            isRunning={isRunning}
          />
        </div>

        {/* Pomodoro progress dots */}
        <PomodoroIndicators
          pomodoroCount={pomodoroCount}
          longBreakInterval={settings.longBreakInterval}
          mode={mode}
        />

        {/* Controls */}
        <Controls
          isRunning={isRunning}
          mode={mode}
          onStart={start}
          onPause={pause}
          onReset={reset}
          onSkip={skip}
        />

        {/* Stats */}
        <Stats
          pomodoroCount={pomodoroCount}
          sessions={sessions}
          totalFocusMinutes={totalFocusMinutes}
        />
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        Created with ❤️ using{' '}
        <a href="https://forgecode.dev" target="_blank" rel="noopener noreferrer">forgecode</a>
        {' · '}
        <a href="https://github.com/tusharmath/pomodoro" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
