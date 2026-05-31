import type { VisaAssessment, LanguageRequirement } from '../../types'
import {
  VISA_PATTERNS,
  LANGUAGE_PATTERNS,
  EMPLOYMENT_PATTERNS,
  EXPERIENCE_PATTERNS,
  REMOTE_PATTERNS,
  SALARY_PATTERNS,
} from '../../constants/patterns'

export function extractVisa(text: string): VisaAssessment {
  for (const { pattern, result } of VISA_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return { value: result, confidence: result === 'unknown' ? 0.50 : 0.88, evidence: [match[0].trim()] }
    }
  }
  return { value: 'unknown', confidence: 0.20, evidence: [] }
}

export function extractLanguages(text: string): { reqs: LanguageRequirement[]; confidence: number } {
  const reqs: LanguageRequirement[] = []
  for (const pattern of LANGUAGE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const langRaw = match[1]
      const language = /german|deutsch/i.test(langRaw) ? 'German' : /french|franz/i.test(langRaw) ? 'French' : /spanish|spanisch/i.test(langRaw) ? 'Spanish' : 'English'
      const levelRaw = (match[2] ?? '').toLowerCase()
      const level = levelRaw === 'native' || levelRaw === 'muttersprachler' ? 'Native'
        : levelRaw === 'fließend' || levelRaw === 'fluent' || levelRaw === 'verhandlungssicher' ? 'C1'
        : levelRaw.toUpperCase()
      if (!reqs.find(r => r.language === language)) {
        reqs.push({ language, minLevel: level || 'B2', required: true })
      }
    }
  }
  return { reqs, confidence: reqs.length > 0 ? 0.95 : 0.15 }
}

export function extractEmploymentType(text: string): { type: string; confidence: number } {
  for (const { pattern, type } of EMPLOYMENT_PATTERNS) {
    if (pattern.test(text)) return { type, confidence: 0.92 }
  }
  return { type: 'full-time', confidence: 0.35 }
}

export function extractExperienceYears(text: string): { years: number | undefined; confidence: number } {
  for (const { pattern, groupIndex } of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const years = parseInt(match[groupIndex], 10)
      if (!isNaN(years) && years > 0 && years <= 30) {
        return { years, confidence: 0.82 }
      }
    }
  }
  return { years: undefined, confidence: 0.10 }
}

export function extractRemote(text: string): { value: boolean | 'hybrid'; confidence: number } {
  for (const { pattern, value } of REMOTE_PATTERNS) {
    if (pattern.test(text)) return { value, confidence: 0.88 }
  }
  return { value: false, confidence: 0.30 }
}

export function extractSalary(text: string) {
  for (const pattern of SALARY_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const parse = (s: string) => parseInt(s.replace(/[,\.]/g, '').replace(/\D/g, ''), 10)
      const min = parse(match[1])
      const max = match[2] ? parse(match[2]) : undefined
      const periodRaw = (match[3] ?? 'year').toLowerCase()
      const period = periodRaw.includes('month') || periodRaw.includes('monat') ? 'month' as const
        : periodRaw.includes('hour') || periodRaw.includes('stunde') ? 'hour' as const
        : 'year' as const
      if (!isNaN(min)) {
        return { salary: { min, max, currency: 'EUR', period }, confidence: 0.85 }
      }
    }
  }
  return { salary: undefined, confidence: 0.05 }
}
