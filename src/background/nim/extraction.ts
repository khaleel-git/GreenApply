import { nimComplete } from './client'
import { NIM_MODELS, TOKEN_BUDGETS } from '../../constants/models'
import type { ExtractionResult, LanguageRequirement, SalaryRange, VisaAssessment } from '../../types'

interface AiJobExtraction {
  requiredSkills?: string[]
  niceToHaveSkills?: string[]
  requiredLanguages: LanguageRequirement[]
  requiredExperienceYears?: number | null
  visa?: VisaAssessment
  employmentType?: string
  remote?: boolean | 'hybrid'
  salary?: SalaryRange
  postedDate?: string
  confidence?: Partial<ExtractionResult['confidence']>
}

function safeJsonParse(text: string): AiJobExtraction | null {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as AiJobExtraction
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as AiJobExtraction
    } catch {
      return null
    }
  }
}

function toLanguageArray(input: unknown): LanguageRequirement[] {
  if (!Array.isArray(input)) return []
  return input.filter((item): item is LanguageRequirement => {
    if (!item || typeof item !== 'object') return false
    const candidate = item as LanguageRequirement
    return typeof candidate.language === 'string'
      && typeof candidate.minLevel === 'string'
      && typeof candidate.required === 'boolean'
  })
}

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
}

export async function extractJobSignalsWithAi(text: string): Promise<Partial<AiJobExtraction>> {
  const userPrompt = [
    'Extract structured job requirements from the full job text.',
    'Return JSON only in the format: {"requiredSkills":[],"niceToHaveSkills":[],"requiredLanguages":[{"language":"<language>","minLevel":"<level>","required":true}],"requiredExperienceYears":null,"visa":{"value":"unknown","confidence":0.1,"evidence":[]},"employmentType":"unknown","remote":false,"salary":null,"postedDate":null}.',
    'requiredSkills should contain skills explicitly required by the job.',
    'niceToHaveSkills should contain skills explicitly described as optional or beneficial.',
    'requiredLanguages should only include languages that the job text explicitly lists as a skill or requirement. Do NOT add a language just because the job description is written in that language.',
    'Use one of these levels only: A1, A2, B1, B2, C1, C2, Native.',
    'If the text says a language is needed but does not specify a level, infer B2 for a standard requirement, C1 for very good / fluent / strong wording, and Native for mother tongue / native speaker wording.',
    'Set required to true only when the text clearly describes a requirement, not a nice-to-have.',
    'Do not include unrelated skills, visas, or work authorization.',
    'For visa, employment type, remote, salary, and experience, only fill a field if the text states it clearly.',
    'If a field is absent or unclear, use null, false, or "unknown" as appropriate.',
    'Return valid JSON only with no markdown fences or commentary.',
  ].join(' ')

  try {
    const response = await nimComplete({
      model: NIM_MODELS.jobExtractorFallback,
      messages: [
        {
          role: 'system',
          content: 'You extract structured job requirements. Return valid JSON only. Do not wrap the JSON in markdown.',
        },
        { role: 'user', content: `${userPrompt}\n\nJob text:\n${text}` },
      ],
      maxTokens: TOKEN_BUDGETS.jobExtraction.maxOutput,
      jsonMode: true,
    })

    const parsed = safeJsonParse(response)
    if (!parsed) return {}

    const requiredLanguages = toLanguageArray(parsed.requiredLanguages)
    const requiredSkills = toStringArray(parsed.requiredSkills)
    const niceToHaveSkills = toStringArray(parsed.niceToHaveSkills)

    return {
      requiredSkills,
      niceToHaveSkills,
      requiredLanguages,
      requiredExperienceYears: typeof parsed.requiredExperienceYears === 'number' ? parsed.requiredExperienceYears : undefined,
      visa: parsed.visa && typeof parsed.visa === 'object' ? parsed.visa : undefined,
      employmentType: typeof parsed.employmentType === 'string' ? parsed.employmentType : undefined,
      remote: typeof parsed.remote === 'boolean' || parsed.remote === 'hybrid' ? parsed.remote : undefined,
      salary: parsed.salary && typeof parsed.salary === 'object' ? parsed.salary : undefined,
      postedDate: typeof parsed.postedDate === 'string' ? parsed.postedDate : undefined,
      confidence: parsed.confidence,
    }
  } catch {
    return {}
  }
}