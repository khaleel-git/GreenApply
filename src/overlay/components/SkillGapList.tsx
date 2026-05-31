interface Props {
  matched: string[]
  missing: string[]
  bonus: string[]
}

export function SkillGapList({ matched, missing, bonus }: Props) {
  if (matched.length === 0 && missing.length === 0 && bonus.length === 0) return null

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>Skills</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {matched.map(s => <Chip key={s} label={s} color="#16a34a" bg="#f0fdf4" />)}
        {bonus.map(s => <Chip key={s} label={s} color="#2563eb" bg="#eff6ff" />)}
        {missing.map(s => <Chip key={s} label={s} color="#dc2626" bg="#fef2f2" icon="✗" />)}
      </div>
      {missing.length > 0 && (
        <div style={{ color: '#6b7280', marginTop: 6, fontSize: 11 }}>
          {missing.length} required skill{missing.length > 1 ? 's' : ''} missing
        </div>
      )}
    </div>
  )
}

function Chip({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 999, fontSize: 11,
      background: bg, color, border: `1px solid ${color}30`,
    }}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
  )
}
