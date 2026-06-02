import type { HardFilter } from '../../types'
import { useTheme } from '../../shared/ThemeContext'

interface Props {
  filters: HardFilter[]
}

const BLOCKER_COLOR = '#dc2626'
const WARNING_COLOR = '#ea580c'

export function HardFilterAlert({ filters }: Props) {
  const { theme } = useTheme()
  if (filters.length === 0) return null
  const isDark = theme === 'dark'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filters.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: f.severity === 'blocker'
            ? (isDark ? '#3b0f0f' : '#fef2f2')
            : (isDark ? '#3b1c08' : '#fff7ed'),
          border: `1px solid ${f.severity === 'blocker'
            ? (isDark ? '#7f1d1d' : '#fecaca')
            : (isDark ? '#78350f' : '#fed7aa')}`,
          fontSize: 12,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>
            {f.severity === 'blocker' ? '🚫' : '⚠️'}
          </span>
          <span style={{ color: f.severity === 'blocker' ? BLOCKER_COLOR : WARNING_COLOR, lineHeight: 1.4 }}>
            {f.message}
          </span>
        </div>
      ))}
    </div>
  )
}
