import type { HardFilter, ExtractionResult, JobListing, UserProfile } from '../../types'
import { EXPERIENCE_GAP_BLOCKER, EXPERIENCE_GAP_WARNING } from '../../constants/scoring'

const CEFR_INDEX: Record<string, number> = {
  A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, Native: 7,
}

function levelIndex(level: string): number {
  return CEFR_INDEX[level] ?? 0
}

export function runHardFilters(
  job: JobListing,
  extraction: ExtractionResult,
  profile: UserProfile,
): HardFilter[] {
  const filters: HardFilter[] = []

  // Language gap
  for (const req of extraction.requiredLanguages) {
    if (!req.required) continue
    const userLang = profile.languages.find(
      l => l.language.toLowerCase() === req.language.toLowerCase(),
    )
    const userLevel = userLang?.level
    const requiredIdx = levelIndex(req.minLevel)
    const userIdx = userLevel ? levelIndex(userLevel) : 0

    if (!userLevel || userIdx < requiredIdx - 1) {
      filters.push({
        type: 'language_gap',
        severity: 'blocker',
        message: `${req.language} ${req.minLevel} required — your level is ${userLevel ?? 'unknown'}`,
      })
    } else if (userIdx < requiredIdx) {
      filters.push({
        type: 'language_gap',
        severity: 'warning',
        message: `${req.language} ${req.minLevel} required — your level is ${userLevel} (close but verify)`,
      })
    }
  }

  // Visa blocked
  if (extraction.visa.value === false && profile.workAuth === 'needs_sponsorship') {
    const evidence = extraction.visa.evidence.join(' | ')
    filters.push({
      type: 'visa_blocked',
      severity: 'blocker',
      message: `No visa sponsorship${evidence ? ` — "${evidence}"` : ''}`,
    })
  }

  // Work auth: "must have work permit" + user needs sponsorship
  if (extraction.visa.value === false && profile.workAuth === 'student_visa') {
    filters.push({
      type: 'visa_blocked',
      severity: 'warning',
      message: 'Job may require existing work authorization — verify visa requirements',
    })
  }

  // Employment type mismatch
  if (
    extraction.employmentType &&
    profile.preferences.jobTypes.length > 0 &&
    !profile.preferences.jobTypes.includes(extraction.employmentType as never)
  ) {
    filters.push({
      type: 'employment_type_mismatch',
      severity: 'warning',
      message: `Job is ${extraction.employmentType} — you prefer ${profile.preferences.jobTypes.join(', ')}`,
    })
  }

  // Location blocked
  const isOnsite = extraction.remote === false
  if (isOnsite) {
    if (profile.preferences.remotePreference === 'remote') {
      filters.push({
        type: 'location_blocked',
        severity: 'blocker',
        message: `On-site in ${job.location} — you only want remote`,
      })
    } else if (
      profile.targetLocations.length > 0 &&
      !profile.targetLocations.some(city =>
        job.location.toLowerCase().includes(city.toLowerCase()),
      )
    ) {
      filters.push({
        type: 'location_blocked',
        severity: 'warning',
        message: `On-site in ${job.location} — outside your preferred locations`,
      })
    }
  }

  // Excluded company
  if (
    profile.preferences.excludedCompanies.some(c =>
      job.company.toLowerCase().includes(c.toLowerCase()),
    )
  ) {
    filters.push({
      type: 'excluded_company',
      severity: 'blocker',
      message: `${job.company} is on your excluded companies list`,
    })
  }

  // Experience gap
  const required = extraction.requiredExperienceYears
  if (required) {
    const candidate = profile.resume?.totalExperienceYears ?? 0
    if (candidate < required * EXPERIENCE_GAP_BLOCKER) {
      filters.push({
        type: 'experience_gap',
        severity: 'blocker',
        message: `${required}+ years required — you have ${candidate.toFixed(1)} years`,
      })
    } else if (candidate < required * EXPERIENCE_GAP_WARNING) {
      filters.push({
        type: 'experience_gap',
        severity: 'warning',
        message: `${required}+ years preferred — you have ${candidate.toFixed(1)} years`,
      })
    }
  }

  return filters
}
