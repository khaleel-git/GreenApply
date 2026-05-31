import type { MatchResult } from '../../types'
import { scoreToColor } from '../../shared/utils/score.utils'

interface Props {
  score: number
  recommendation: MatchResult['recommendation']
  size?: number
}

export function ScoreRing({ score, recommendation, size = 80 }: Props) {
  const r = (size / 2) - 6
  const circumference = 2 * Math.PI * r
  const progress = circumference - (score / 100) * circumference
  const color = scoreToColor(score, recommendation)

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>/ 100</span>
      </div>
    </div>
  )
}
