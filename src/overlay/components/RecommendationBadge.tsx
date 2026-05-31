import type { MatchResult } from '../../types'
import { scoreToLabel, scoreToEmoji, scoreToColor } from '../../shared/utils/score.utils'

interface Props {
  recommendation: MatchResult['recommendation']
  score: number
}

export function RecommendationBadge({ recommendation, score }: Props) {
  const label = scoreToLabel(recommendation)
  const emoji = scoreToEmoji(recommendation)
  const color = scoreToColor(score, recommendation)

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 999,
      background: `${color}20`, border: `1px solid ${color}40`,
      fontSize: 13, fontWeight: 600, color,
    }}>
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  )
}
