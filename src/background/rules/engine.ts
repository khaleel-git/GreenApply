import type { UserRule, MatchResult, ExtractionResult } from '../../types'

export interface RuleResult {
  rule: UserRule
  triggered: boolean
  action: UserRule['action'] | null
}

export function evaluateRules(
  rules: UserRule[],
  match: MatchResult,
  extraction: ExtractionResult,
): RuleResult[] {
  return rules.filter(r => r.enabled).map(rule => {
    const triggered = checkCondition(rule, match, extraction)
    return { rule, triggered, action: triggered ? rule.action : null }
  })
}

function checkCondition(rule: UserRule, match: MatchResult, extraction: ExtractionResult): boolean {
  const { condition } = rule
  switch (condition.type) {
    case 'score_below':
      return match.score < condition.threshold
    case 'score_above':
      return match.score > condition.threshold
    case 'hard_filter_triggered':
      return match.hardFilters.some(f => f.type === condition.filterType)
    case 'skill_missing':
      return match.skillGap.missing.some(s => s.toLowerCase() === condition.skill.toLowerCase())
    case 'company_matches':
      return new RegExp(condition.pattern, 'i').test(match.jobId)
    case 'job_age_days_above': {
      if (!extraction.postedDate) return false
      const days = Math.floor((Date.now() - new Date(extraction.postedDate).getTime()) / 86_400_000)
      return days > condition.days
    }
    default:
      return false
  }
}
