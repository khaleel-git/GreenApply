import { useTheme } from '../../shared/ThemeContext'

interface Props {
  matched: string[]
  missing: string[]
  bonus: string[]
}

export function SkillGapList({ matched, missing, bonus }: Props) {
  const { colors } = useTheme()
  const empty = matched.length === 0 && missing.length === 0 && bonus.length === 0
  if (empty) {
    return (
      <div style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>Skills</div>
        <div style={{ color: colors.textMuted }}>No specific skills listed in this job posting.</div>
      </div>
    )
  }
  // Deduplicate skills (case-insensitive) and avoid showing the same skill
  // in multiple categories. Priority: matched > bonus > missing.
  const uniq = (arr: string[]) => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const s of arr) {
      const key = s.trim().toLowerCase()
      if (!seen.has(key)) { seen.add(key); out.push(s) }
    }
    return out
  }

  const matchedUnique = uniq(matched)
  const bonusUnique = uniq(bonus).filter(b => !matchedUnique.some(m => m.trim().toLowerCase() === b.trim().toLowerCase()))
  const missingUnique = uniq(missing).filter(m => !matchedUnique.some(mm => mm.trim().toLowerCase() === m.trim().toLowerCase()) && !bonusUnique.some(b => b.trim().toLowerCase() === m.trim().toLowerCase()))

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>Skills</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {matchedUnique.map(s => <Chip key={s} label={s} color="#16a34a" bg="#f0fdf4" />)}
        {bonusUnique.map(s => <Chip key={s} label={s} color="#2563eb" bg="#eff6ff" />)}
        {missingUnique.map(s => <Chip key={s} label={s} color="#dc2626" bg="#fef2f2" icon="✗" />)}
      </div>
      {missingUnique.length > 0 && (
        <div style={{ color: colors.textMuted, marginTop: 6, fontSize: 11 }}>
          {missingUnique.length} required skill{missingUnique.length > 1 ? 's' : ''} missing
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
