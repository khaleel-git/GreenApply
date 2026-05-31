import type { ExtractionResult, JobListing, ResumeProfile, UserPreferences, ScoreBreakdown, MatchResult, UserProfile, AcademicProfile } from '../../types'
import { SCORE_WEIGHTS, SCORE_THRESHOLDS } from '../../constants/scoring'
import { computeFreshnessModifier } from './freshness'
import { runHardFilters } from './hard-filters'

const CEFR_INDEX: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, Native: 7 }

// Academic relevance modifier: +/-10 based on how well the job matches the
// student's field of study and courses. Applied on top of the base score.
function academicRelevanceModifier(description: string, academic?: AcademicProfile): number {
  if (!academic) return 0

  const desc = description.toLowerCase()
  let hits = 0

  // Field of study keywords
  for (const word of academic.fieldOfStudy.toLowerCase().split(/\s+/)) {
    if (word.length > 4 && desc.includes(word)) hits++
  }

  // Courses — extract meaningful keywords and check against description
  for (const course of academic.courses.slice(0, 30)) {
    for (const word of course.toLowerCase().split(/\s+/)) {
      if (word.length > 5 && desc.includes(word)) { hits++; break }
    }
  }

  // Certifications
  for (const cert of academic.certifications) {
    for (const word of cert.toLowerCase().split(/[\s()]+/)) {
      if (word.length > 5 && desc.includes(word)) { hits++; break }
    }
  }

  if (hits >= 5) return 10
  if (hits >= 3) return 6
  if (hits >= 1) return 3
  return 0
}

function skillScore(required: string[], niceToHave: string[], candidateSkills: string[]): { score: number; matched: string[]; missing: string[]; bonus: string[] } {
  const lower = candidateSkills.map(s => s.toLowerCase())
  const matched = required.filter(s => lower.includes(s.toLowerCase()))
  const missing = required.filter(s => !lower.includes(s.toLowerCase()))
  const bonus = niceToHave.filter(s => lower.includes(s.toLowerCase()))

  const baseScore = required.length === 0 ? 70 : Math.round((matched.length / required.length) * 100)
  const bonusPoints = Math.min(10, bonus.length * 3)
  return { score: Math.min(100, baseScore + bonusPoints), matched, missing, bonus }
}

function experienceScore(extraction: ExtractionResult, profile: ResumeProfile): number {
  const required = extraction.requiredExperienceYears
  if (!required) return 70  // unknown requirement: neutral
  const candidate = profile.totalExperienceYears
  if (candidate >= required) return 100
  if (candidate >= required * 0.75) return 70
  if (candidate >= required * 0.5) return 40
  return 10
}

function languageScore(required: ExtractionResult['requiredLanguages'], languages: ResumeProfile['languages']): { score: number; gaps: MatchResult['skillGap']['languageGaps'] } {
  if (required.length === 0) return { score: 100, gaps: [] }
  const gaps: MatchResult['skillGap']['languageGaps'] = []
  let totalPenalty = 0

  for (const req of required) {
    const userLang = languages.find(l => l.language.toLowerCase() === req.language.toLowerCase())
    const met = userLang ? (CEFR_INDEX[userLang.level] ?? 0) >= (CEFR_INDEX[req.minLevel] ?? 0) : false
    gaps.push({
      language: req.language,
      required: req.minLevel,
      actual: userLang?.level ?? null,
      met,
      requiredByJob: req.required,
    })
    if (!met && req.required) totalPenalty += 40
  }

  return { score: Math.max(0, 100 - totalPenalty), gaps }
}

function locationScore(extraction: ExtractionResult, prefs: UserPreferences): number {
  if (extraction.remote === true) return 100
  if (extraction.remote === 'hybrid') {
    return prefs.remotePreference === 'onsite' ? 80 : 90
  }
  if (prefs.remotePreference === 'remote') return 10
  return 80
}

function employmentTypeScore(type: string, preferred: UserPreferences['jobTypes']): number {
  if (type === 'unknown') return 70  // no confident detection — neutral, don't penalize
  if (preferred.length === 0) return 80
  return preferred.includes(type as never) ? 100 : 20
}


function salaryScore(salary: ExtractionResult['salary'], minEur?: number): number {
  if (!salary || !minEur) return 50
  const annual = salary.period === 'month' ? (salary.min ?? 0) * 12 : (salary.min ?? 0)
  if (annual >= minEur * 1.2) return 100
  if (annual >= minEur) return 75
  if (annual >= minEur * 0.85) return 40
  return 0
}

function scoreToRecommendation(score: number): MatchResult['recommendation'] {
  if (score >= SCORE_THRESHOLDS.green) return 'green'
  if (score >= SCORE_THRESHOLDS.yellow) return 'yellow'
  if (score >= SCORE_THRESHOLDS.orange) return 'orange'
  return 'red'
}

export function computeMatch(
  job: JobListing,
  extraction: ExtractionResult,
  profile: UserProfile,
): MatchResult {
  const resume = profile.resume
  const prefs = profile.preferences

  // Hard filters first
  const hardFilters = runHardFilters(job, extraction, profile)
  const hasBlocker = hardFilters.some(f => f.severity === 'blocker')

  // profile.skills is the source of truth (pre-populated from resume on upload, user-editable)
  const candidateSkills = profile.skills?.length ? profile.skills : (resume?.skills ?? [])
  const { score: skillsSc, matched, missing, bonus } = skillScore(
    extraction.requiredSkills, extraction.niceToHaveSkills, candidateSkills,
  )

  // Other dimensions — profile.languages is the source of truth (seeded from the
  // résumé on upload, editable in Options); fall back to résumé only if empty.
  const userLanguages = profile.languages.length > 0 ? profile.languages : (resume?.languages ?? [])
  const experienceSc = resume ? experienceScore(extraction, resume) : 50
  const { score: languageSc, gaps: languageGaps } = languageScore(extraction.requiredLanguages, userLanguages)
  const locationSc = locationScore(extraction, prefs)

  // Merge user's stated job-type preferences with degree-level-implied types.
  // A current student automatically fits werkstudent/internship/thesis even if
  // they haven't explicitly set those in preferences.
  const degreeLevel = profile.academic?.degreeLevel
  const impliedTypes: UserPreferences['jobTypes'] = []
  if (degreeLevel === 'bachelor_student' || degreeLevel === 'master_student' || degreeLevel === 'phd_student') {
    impliedTypes.push('werkstudent', 'internship', 'thesis')
  }
  const effectiveJobTypes = [...new Set([...prefs.jobTypes, ...impliedTypes])] as UserPreferences['jobTypes']

  const empTypeSc = employmentTypeScore(extraction.employmentType, effectiveJobTypes)
  const salarySc = salaryScore(extraction.salary, prefs.minSalaryEur)
  const academicModifier = academicRelevanceModifier(job.description, profile.academic)

  const base = Math.round(
    skillsSc * SCORE_WEIGHTS.skills +
    experienceSc * SCORE_WEIGHTS.experience +
    languageSc * SCORE_WEIGHTS.language +
    locationSc * SCORE_WEIGHTS.location +
    salarySc * SCORE_WEIGHTS.salaryMatch +
    empTypeSc * SCORE_WEIGHTS.employmentType,
  )

  const freshnessModifier = computeFreshnessModifier(extraction.postedDate)
  const total = hasBlocker
    ? Math.min(34, Math.max(0, base + freshnessModifier + academicModifier))
    : Math.min(100, Math.max(0, base + freshnessModifier + academicModifier))

  const breakdown: ScoreBreakdown = {
    total,
    base,
    freshnessModifier,
    skills: skillsSc,
    experience: experienceSc,
    language: languageSc,
    location: locationSc,
    employmentType: empTypeSc,
    salaryMatch: salarySc,
  }

  return {
    jobId: job.id,
    profileId: profile.id,
    hardFilters,
    score: total,
    recommendation: hasBlocker ? 'red' : scoreToRecommendation(total),
    breakdown,
    skillGap: { matched, missing, bonus, languageGaps },
    computedAt: Date.now(),
  }
}
