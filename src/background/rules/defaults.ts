import type { UserRule } from '../../types'

export function generateDefaultRules(): UserRule[] {
  return [
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
}
