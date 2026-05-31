import type { ExtractionResult, VisaAssessment, LanguageRequirement, SalaryRange } from '../../types'
import { VISA_PATTERNS, LANGUAGE_PATTERNS, EMPLOYMENT_PATTERNS } from '../../constants/patterns'

interface JsonLdJobPosting {
  '@type'?: string
  title?: string
  hiringOrganization?: { name?: string; '@type'?: string }
  jobLocation?: { address?: { addressLocality?: string; addressCountry?: string } } | Array<{ address?: { addressLocality?: string } }>
  description?: string
  employmentType?: string | string[]
  baseSalary?: { value?: { minValue?: number; maxValue?: number; unitText?: string; value?: number }; currency?: string }
  datePosted?: string
  validThrough?: string
  jobLocationType?: string  // 'TELECOMMUTE' means remote
}

function extractJsonLd(html: string): JsonLdJobPosting | null {
  const matches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  if (!matches) return null

  for (const block of matches) {
    try {
      const json = JSON.parse(block.replace(/<script[^>]*>|<\/script>/gi, '').trim())
      const items = Array.isArray(json) ? json : [json]
      for (const item of items) {
        if (item?.['@type'] === 'JobPosting') return item
        if (item?.['@graph']) {
          const found = item['@graph'].find((g: JsonLdJobPosting) => g['@type'] === 'JobPosting')
          if (found) return found
        }
      }
    } catch { /* malformed JSON-LD, skip */ }
  }
  return null
}

function parseSalary(posting: JsonLdJobPosting): SalaryRange | undefined {
  const bs = posting.baseSalary
  if (!bs) return undefined
  const currency = bs.currency ?? 'EUR'
  const val = bs.value
  if (!val) return undefined
  const period = (() => {
    const u = val.unitText?.toLowerCase() ?? ''
    if (u.includes('month') || u.includes('monat')) return 'month' as const
    if (u.includes('hour') || u.includes('stunde')) return 'hour' as const
    return 'year' as const
  })()
  return {
    min: val.minValue ?? val.value,
    max: val.maxValue ?? val.value,
    currency,
    period,
  }
}

function parseVisa(description: string): VisaAssessment {
  for (const { pattern, result } of VISA_PATTERNS) {
    const match = description.match(pattern)
    if (match) {
      return { value: result, confidence: 0.90, evidence: [match[0]] }
    }
  }
  return { value: 'unknown', confidence: 0.30, evidence: [] }
}

function parseLanguages(description: string): LanguageRequirement[] {
  const reqs: LanguageRequirement[] = []
  for (const pattern of LANGUAGE_PATTERNS) {
    const match = description.match(pattern)
    if (match) {
      const language = /german|deutsch/i.test(match[1]) ? 'German' : 'English'
      const level = match[2] ?? 'unknown'
      reqs.push({ language, minLevel: level, required: true })
    }
  }
  return reqs
}

function parseEmploymentType(posting: JsonLdJobPosting): string {
  const raw = Array.isArray(posting.employmentType)
    ? posting.employmentType.join(' ')
    : posting.employmentType ?? ''

  for (const { pattern, type } of EMPLOYMENT_PATTERNS) {
    if (pattern.test(raw)) return type
  }
  if (/FULL_TIME|full.time/i.test(raw)) return 'full-time'
  if (/PART_TIME|part.time/i.test(raw)) return 'part-time'
  if (/INTERN/i.test(raw)) return 'internship'
  return 'full-time'
}

export function extractFromJsonLd(html: string, jobId: string): Partial<ExtractionResult> | null {
  const posting = extractJsonLd(html)
  if (!posting) return null

  const description = posting.description ?? ''
  const visa = parseVisa(description)
  const requiredLanguages = parseLanguages(description)
  const salary = parseSalary(posting)
  const employmentType = parseEmploymentType(posting)
  const remote = posting.jobLocationType === 'TELECOMMUTE' ? true : false

  return {
    jobId,
    requiredSkills: [],
    niceToHaveSkills: [],
    requiredLanguages,
    visa,
    employmentType,
    remote,
    salary,
    postedDate: posting.datePosted,
    extractedBy: 'jsonld',
    confidence: {
      skills: 0.40,
      languages: requiredLanguages.length > 0 ? 0.92 : 0.20,
      visa: visa.confidence,
      salary: salary ? 0.95 : 0.10,
      employmentType: 0.90,
      experienceYears: 0.10,
    },
    extractedAt: Date.now(),
  }
}
