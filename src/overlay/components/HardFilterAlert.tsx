import type { HardFilter } from '../../types'

interface Props {
  filters: HardFilter[]
}

const BLOCKER_COLOR = '#dc2626'
const WARNING_COLOR = '#ea580c'

export function HardFilterAlert({ filters }: Props) {
  if (filters.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filters.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: f.severity === 'blocker' ? '#fef2f2' : '#fff7ed',
          border: `1px solid ${f.severity === 'blocker' ? '#fecaca' : '#fed7aa'}`,
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
