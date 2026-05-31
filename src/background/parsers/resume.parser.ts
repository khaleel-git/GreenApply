import type { ResumeProfile, ExperienceEntry, EducationEntry, LanguageEntry } from '../../types'
import { extractSkills, TECH_SKILLS } from '../extraction/dict.extractor'

// ─── Date range merging ──────────────────────────────────────────────────────

function parseYearMonth(s: string): number {
  const [year, month = '1'] = s.split('-').map(Number)
  return new Date(year, month - 1, 1).getTime()
}

export function computeMergedExperienceYears(entries: ExperienceEntry[]): number {
  const now = Date.now()
  const intervals = entries
    .map(e => ({
      start: e.startDate ? parseYearMonth(e.startDate) : 0,
      end: e.endDate === 'present' ? now : (e.endDate ? parseYearMonth(e.endDate) : 0),
    }))
    .filter(i => i.start > 0 && i.end > i.start)
    .sort((a, b) => a.start - b.start)

  let merged = 0
  let cursor = 0
  for (const { start, end } of intervals) {
    if (start > cursor) { merged += end - start; cursor = end }
    else if (end > cursor) { merged += end - cursor; cursor = end }
  }

  return merged / (365.25 * 24 * 60 * 60 * 1000)
}

// ─── Experience section parsing ──────────────────────────────────────────────

const DATE_RANGE_RE = /(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.\s,]*)?(\d{4})\s*[-–—to]+\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Present|Now|Heute|bis heute)?[.\s,]*(\d{4})?/gi

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07',
  aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function monthToNum(m?: string): string {
  if (!m) return '01'
  return MONTH_MAP[m.toLowerCase()] ?? '01'
}

// Section header patterns — used to isolate the work-experience block so
// education dates (Bachelor 2015-2019, Master 2019-2022 …) are excluded.
const EXP_SECTION_RE = /^[ \t]*(?:(?:work|professional|relevant|key|career)\s+)?(?:experience|employment|history|berufserfahrung|berufliche\s+erfahrung|arbeitserfahrung|tätigkeiten|beruflicher\s+werdegang)[ \t]*:?[ \t]*$/im
const NON_EXP_SECTION_RE = /^[ \t]*(?:education|ausbildung|studium|akademische|qualifications?|academic|skills?|kenntnisse|languages?|sprachen|certifications?|awards?|honors?|projects?|publications?|volunteer|interests?|references?|objective|summary|profile|über mich)[ \t]*:?[ \t]*$/im

// Narrow the text to the work-experience section so education date ranges
// (e.g. Bachelor 2015-2019) are not mistaken for employment periods.
function extractWorkExperienceSection(text: string): string {
  const expMatch = EXP_SECTION_RE.exec(text)
  if (!expMatch) return text  // no clear header — fall back to full text

  const afterHeader = text.slice(expMatch.index + expMatch[0].length)
  const endMatch = NON_EXP_SECTION_RE.exec(afterHeader)
  return endMatch
    ? text.slice(expMatch.index, expMatch.index + expMatch[0].length + endMatch.index)
    : text.slice(expMatch.index)
}

function parseExperienceEntries(text: string): ExperienceEntry[] {
  const section = extractWorkExperienceSection(text)
  const entries: ExperienceEntry[] = []
  const matches = [...section.matchAll(DATE_RANGE_RE)]

  for (const match of matches) {
    const [, startMonth, startYear, endMonthOrPresent, endYear] = match
    const isPresent = !endYear || /present|now|heute/i.test(endMonthOrPresent ?? '')

    entries.push({
      title: '',
      company: '',
      startDate: `${startYear}-${monthToNum(startMonth)}`,
      endDate: isPresent ? 'present' : `${endYear}-${monthToNum(endMonthOrPresent)}`,
      bullets: [],
    })
  }

  return entries
}

// ─── Language detection ──────────────────────────────────────────────────────

const RESUME_LANGUAGE_RE = /\b(German|Deutsch|English|Englisch|French|Français|Spanish|Español)\s*[:\-–]?\s*(Native|Muttersprachler|C2|C1|B2|B1|A2|A1|Fluent|Fließend|Business|Professional|Basic|Beginner)\b/gi

function extractResumeLanguages(text: string): LanguageEntry[] {
  const entries: LanguageEntry[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(RESUME_LANGUAGE_RE)) {
    const langRaw = match[1]
    const language = /german|deutsch/i.test(langRaw) ? 'German'
      : /french|franz|français/i.test(langRaw) ? 'French'
      : /spanish|spanisch|español/i.test(langRaw) ? 'Spanish'
      : 'English'
    if (seen.has(language)) continue
    seen.add(language)
    const levelRaw = match[2].toLowerCase()
    const level = levelRaw === 'native' || levelRaw === 'muttersprachler' ? 'Native'
      : levelRaw === 'fluent' || levelRaw === 'fließend' || levelRaw === 'c1' ? 'C1'
      : levelRaw === 'business' || levelRaw === 'professional' || levelRaw === 'b2' ? 'B2'
      : levelRaw === 'b1' ? 'B1' : levelRaw === 'a2' ? 'A2' : levelRaw === 'a1' ? 'A1'
      : levelRaw.toUpperCase()
    entries.push({ language, level })
  }
  return entries
}

// ─── Certifications ──────────────────────────────────────────────────────────

const CERT_RE = /\b(AWS|Azure|GCP|Google)\s+(?:Certified|Certification)[^\n,.]*/gi
const CERT_KEYWORDS = ['certificate', 'certification', 'certified', 'zertifikat', 'zertifiziert']

function extractCertifications(text: string): string[] {
  const certs: string[] = []
  for (const m of text.matchAll(CERT_RE)) certs.push(m[0].trim())
  return certs
}

// ─── Seniority inference ─────────────────────────────────────────────────────

function inferSeniority(years: number, text: string): ResumeProfile['seniority'] {
  if (/\b(working student|werkstudent|intern|praktikant|student)\b/i.test(text) || years < 0.5) return 'student'
  if (years < 2) return 'junior'
  if (years < 5) return 'mid'
  if (years < 9) return 'senior'
  return 'lead'
}

// ─── Main deterministic parser ───────────────────────────────────────────────

export function parseResumeDeterministic(
  raw: string,
  fileName: string,
  fileType: 'pdf' | 'docx',
): ResumeProfile {
  const { required: skills } = extractSkills(raw, false)  // resume: no context check needed
  const languages = extractResumeLanguages(raw)
  const experience = parseExperienceEntries(raw)
  const totalExperienceYears = computeMergedExperienceYears(experience)
  const certifications = extractCertifications(raw)

  const industryKeywords: Record<string, string[]> = {
    SaaS: ['saas', 'software as a service', 'subscription'],
    FinTech: ['fintech', 'payments', 'banking', 'financial'],
    HealthTech: ['health', 'medical', 'clinical', 'pharma'],
    'E-commerce': ['ecommerce', 'e-commerce', 'retail', 'shop'],
    'Data & AI': ['machine learning', 'ai', 'data science', 'analytics'],
  }
  const rawLower = raw.toLowerCase()
  const industries = Object.entries(industryKeywords)
    .filter(([, kws]) => kws.some(kw => rawLower.includes(kw)))
    .map(([name]) => name)

  const domains: string[] = []
  if (/backend|api|server|database|microservice/i.test(raw)) domains.push('Backend')
  if (/frontend|react|vue|angular|css|html|ui\b/i.test(raw)) domains.push('Frontend')
  if (/devops|infrastructure|kubernetes|terraform|ci\/cd/i.test(raw)) domains.push('DevOps')
  if (/data|analytics|spark|kafka|warehouse/i.test(raw)) domains.push('Data Engineering')
  if (/machine learning|deep learning|nlp|pytorch|tensorflow/i.test(raw)) domains.push('ML/AI')
  if (/mobile|ios|android|react native|flutter/i.test(raw)) domains.push('Mobile')

  return {
    raw,
    fileName,
    fileType,
    uploadedAt: Date.now(),
    parsedBy: 'deterministic',
    skills,
    industries,
    seniority: inferSeniority(totalExperienceYears, raw),
    totalExperienceYears: Math.round(totalExperienceYears * 10) / 10,
    domains,
    education: [],
    experience,
    languages,
    certifications,
  }
}
