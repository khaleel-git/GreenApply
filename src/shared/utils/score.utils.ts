import { SCORE_THRESHOLDS } from '../../constants/scoring'
import type { MatchResult } from '../../types'

export function scoreToColor(score: number, recommendation?: MatchResult['recommendation']): string {
  const rec = recommendation ?? scoreToRecommendation(score)
  switch (rec) {
    case 'green': return '#16a34a'
    case 'yellow': return '#ca8a04'
    case 'orange': return '#ea580c'
    case 'red': return '#dc2626'
  }
}

export function scoreToRecommendation(score: number): MatchResult['recommendation'] {
  if (score >= SCORE_THRESHOLDS.green) return 'green'
  if (score >= SCORE_THRESHOLDS.yellow) return 'yellow'
  if (score >= SCORE_THRESHOLDS.orange) return 'orange'
  return 'red'
}

export function scoreToLabel(recommendation: MatchResult['recommendation']): string {
  switch (recommendation) {
    case 'green': return 'Strong Apply'
    case 'yellow': return 'Apply'
    case 'orange': return 'Apply If Interested'
    case 'red': return 'Skip'
  }
}

export function scoreToEmoji(recommendation: MatchResult['recommendation']): string {
  switch (recommendation) {
    case 'green': return '🟢'
    case 'yellow': return '🟡'
    case 'orange': return '🟠'
    case 'red': return '🔴'
  }
}
