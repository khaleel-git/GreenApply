import { getFreshnessLabel } from '../../background/scoring/freshness'

interface Props {
  postedDate?: string
}

export function JobFreshness({ postedDate }: Props) {
  const { label, warning } = getFreshnessLabel(postedDate)
  if (!label) return null

  return (
    <div style={{
      fontSize: 11, color: warning ? '#ea580c' : '#6b7280',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {warning && <span>⚠</span>}
      <span>{label}</span>
    </div>
  )
}
