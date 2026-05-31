import type { VisaAssessment, LanguageRequirement } from '../../types'
import {
  VISA_PATTERNS,
  LANGUAGE_DEFS,
  CEFR_LEVEL_RE,
  NATIVE_LEVEL_RE,
  FLUENT_LEVEL_RE,
  LANG_REQUIRED_CTX_RE,
  LANG_OPTIONAL_CTX_RE,
  EMPLOYMENT_PATTERNS,
  EXPERIENCE_PATTERNS,
  REMOTE_PATTERNS,
  SALARY_PATTERNS,
} from '../../constants/patterns'

const CEFR_RANK: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, Native: 7 }

export function extractVisa(text: string): VisaAssessment {
  for (const { pattern, result } of VISA_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return { value: result, confidence: result === 'unknown' ? 0.50 : 0.88, evidence: [match[0].trim()] }
    }
  }
  return { value: 'unknown', confidence: 0.20, evidence: [] }
}

// Detect required languages by finding each language mention, then inspecting a
// small window around it for an explicit CEFR level (B2, C1…), a fluency word
// (native, fließend), or a requirement signal. A bare mention with no signal is
// ignored — only confident requirements are returned to avoid false blockers.
export function extractLanguages(text: string): { reqs: LanguageRequirement[]; confidence: number } {
  const byLang = new Map<string, LanguageRequirement>()

  for (const { canonical, rx } of LANGUAGE_DEFS) {
    rx.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rx.exec(text)) !== null) {
      const start = m.index
      const end = m.index + m[0].length
      // Look mostly after the language ("German … B2", "German skills (at least B2)");
      // a short look-behind catches "B2 German" / "fluent in German". Keeping the
      // CEFR look-behind tight avoids a neighbouring language's level bleeding in.
      const after = text.slice(end, end + 45)
      const beforeCefr = text.slice(Math.max(0, start - 18), start)
      const ctxWindow = text.slice(Math.max(0, start - 30), start) + ' ' + after
      // Clause-bounded so a qualifier on a different language ("…; English optional")
      // doesn't flip this one.
      const afterClause = after.split(/[;.]/)[0]

      let level: string | null = null
      const cefrAfter = after.match(CEFR_LEVEL_RE)
      const cefrBefore = beforeCefr.match(CEFR_LEVEL_RE)
      if (cefrAfter) level = cefrAfter[1].toUpperCase()
      else if (cefrBefore) level = cefrBefore[1].toUpperCase()
      else if (NATIVE_LEVEL_RE.test(ctxWindow)) level = 'Native'
      else if (FLUENT_LEVEL_RE.test(ctxWindow)) level = 'C1'
      else if (LANG_REQUIRED_CTX_RE.test(ctxWindow)) level = 'B2'  // required, level unspecified

      if (!level) continue  // bare mention, no requirement signal → skip

      const required = !LANG_OPTIONAL_CTX_RE.test(afterClause)
      const existing = byLang.get(canonical)
      // Keep the strongest signal: highest level, and required wins over optional.
      if (!existing
        || (CEFR_RANK[level] ?? 0) > (CEFR_RANK[existing.minLevel] ?? 0)
        || (required && !existing.required)) {
        byLang.set(canonical, {
          language: canonical,
          minLevel: existing && (CEFR_RANK[existing.minLevel] ?? 0) > (CEFR_RANK[level] ?? 0) ? existing.minLevel : level,
          required: required || existing?.required || false,
        })
      }
    }
  }

  const reqs = [...byLang.values()]
  return { reqs, confidence: reqs.length > 0 ? 0.9 : 0.15 }
}

export function extractEmploymentType(text: string): { type: string; confidence: number } {
  for (const { pattern, type } of EMPLOYMENT_PATTERNS) {
    if (pattern.test(text)) return { type, confidence: 0.92 }
  }
  return { type: 'unknown', confidence: 0.10 }
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
