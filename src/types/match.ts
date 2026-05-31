export interface LanguageGap {
  language: string
  required: string
  actual: string | null
  met: boolean
}

export interface HardFilter {
  type:
    | 'language_gap'
    | 'visa_blocked'
    | 'employment_type_mismatch'
    | 'location_blocked'
    | 'excluded_company'
    | 'experience_gap'
  message: string
  severity: 'blocker' | 'warning'
}

export interface ScoreBreakdown {
  total: number
  base: number
  freshnessModifier: number
  skills: number
  experience: number
  language: number
  location: number
  employmentType: number
  visaCompatibility: number
  salaryMatch: number
}

export interface MatchResult {
  jobId: string
  profileId: string
  hardFilters: HardFilter[]
  score: number
  recommendation: 'green' | 'yellow' | 'orange' | 'red'
  breakdown: ScoreBreakdown
  skillGap: {
    matched: string[]
    missing: string[]
    bonus: string[]
    languageGaps: LanguageGap[]
  }
  summary?: string       // LLM-generated, only when API key configured
  computedAt: number
}
