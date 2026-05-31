import type { UserRule } from '../../types'
import type { WorkAuthStatus } from '../../types/profile'

export function generateDefaultRules(workAuth: WorkAuthStatus): UserRule[] {
  const rules: UserRule[] = [
    {
      id: 'default-skip-stale',
      label: 'Highlight jobs older than 60 days',
      enabled: true,
      condition: { type: 'job_age_days_above', days: 60 },
      action: { type: 'highlight', color: 'orange' },
    },
    {
      id: 'default-save-strong',
      label: 'Auto-save strong matches (85+)',
      enabled: true,
      condition: { type: 'score_above', threshold: 85 },
      action: { type: 'auto_save' },
    },
  ]

  if (workAuth === 'needs_sponsorship' || workAuth === 'student_visa') {
    rules.push({
      id: 'default-skip-no-sponsor',
      label: 'Auto-skip jobs with no visa sponsorship',
      enabled: true,
      condition: { type: 'hard_filter_triggered', filterType: 'visa_blocked' },
      action: { type: 'auto_skip' },
    })
  }

  return rules
}
