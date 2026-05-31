import type { HardFilter } from './match'

export type RuleCondition =
  | { type: 'score_below'; threshold: number }
  | { type: 'score_above'; threshold: number }
  | { type: 'hard_filter_triggered'; filterType: HardFilter['type'] }
  | { type: 'skill_missing'; skill: string }
  | { type: 'company_matches'; pattern: string }
  | { type: 'job_age_days_above'; days: number }

export type RuleAction =
  | { type: 'auto_skip' }
  | { type: 'auto_save' }
  | { type: 'highlight'; color: string }
  | { type: 'notify'; message: string }

export interface UserRule {
  id: string
  label: string
  enabled: boolean
  condition: RuleCondition
  action: RuleAction
}
