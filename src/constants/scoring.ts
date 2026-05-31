export const SCORE_WEIGHTS = {
  skills: 0.33,
  experience: 0.24,
  language: 0.22,
  location: 0.11,
  salaryMatch: 0.05,
  employmentType: 0.05,
} as const

export const FRESHNESS_MODIFIERS = {
  freshDays: 7,
  freshBoost: 5,
  normalDays: 30,
  staleThreshold: 60,
  stalePenalty: -5,
  veryStaleModifier: -15,
} as const

export const SCORE_THRESHOLDS = {
  green: 75,
  yellow: 50,
  orange: 35,
} as const

export const CONFIDENCE_THRESHOLD = 0.7

export const EXPERIENCE_GAP_BLOCKER = 0.5     // <50% of required → blocker
export const EXPERIENCE_GAP_WARNING = 0.75    // <75% of required → warning

export const TIME_SAVED_PER_SKIP_MINUTES = 15
