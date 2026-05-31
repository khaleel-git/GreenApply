import type { ExtractionResult, RawJobData, LanguageRequirement } from '../../types'
import { extractFromJsonLd } from './jsonld.extractor'
import {
  extractVisa, extractLanguages, extractEmploymentType,
  extractExperienceYears, extractRemote, extractSalary,
} from './regex.extractor'
import { extractSkills } from './dict.extractor'
import { assessConfidence } from './confidence'
import { extractJobSignalsWithAi } from '../nim/extraction'

function mergeWithDefaults(base: Partial<ExtractionResult>, jobId: string): ExtractionResult {
  return {
    jobId,
    requiredSkills: base.requiredSkills ?? [],
    niceToHaveSkills: base.niceToHaveSkills ?? [],
    requiredLanguages: base.requiredLanguages ?? [],
    requiredExperienceYears: base.requiredExperienceYears,
    visa: base.visa ?? { value: 'unknown', confidence: 0.10, evidence: [] },
    employmentType: base.employmentType ?? 'unknown',
    remote: base.remote ?? false,
    salary: base.salary,
    postedDate: base.postedDate,
    extractedBy: base.extractedBy ?? 'regex',
    confidence: base.confidence ?? {
      skills: 0.10,
      languages: 0.10,
      visa: 0.10,
      salary: 0.10,
      employmentType: 0.10,
      experienceYears: 0.10,
    },
    extractedAt: Date.now(),
  }
}

export async function runExtractionPipeline(raw: RawJobData): Promise<ExtractionResult> {
  const { description, url } = raw
  const jobId = raw.url  // Fingerprint assigned by job.handler before calling pipeline
  const jobText = [raw.title, description].filter(Boolean).join('\n')

  // Step 1: AI-first structured extraction
  const aiResult = await extractJobSignalsWithAi(jobText)

  // Step 2: JSON-LD (free, instant, highest quality)
  const jsonldResult = extractFromJsonLd(description, jobId)

  // Step 3: Regex extraction (free, instant)
  // Employment type: prepend the job title so "Student assistant" / "Werkstudent"
  // in the title is detected even when the body text doesn't repeat it. Many ATS
  // systems (Taleo, Oracle) hardcode FULL_TIME in JSON-LD regardless of actual type.
  const empText = [raw.title, description].filter(Boolean).join('\n')
  const visaResult = extractVisa(description)
  const { reqs: langReqs, confidence: langConf } = extractLanguages(jobText)
  const { type: empType, confidence: empConf } = extractEmploymentType(empText)
  const { years: expYears, confidence: expConf } = extractExperienceYears(description)
  const { value: remoteValue } = extractRemote(description)
  const { salary, confidence: salConf } = extractSalary(description)

  // Step 4: Dictionary matching for skills
  const { required: reqSkills, niceToHave: nthSkills } = extractSkills(description)

  // Merge: AI wins where it has data; JSON-LD and regex fill gaps.
  const requiredSkills = aiResult.requiredSkills?.length ? aiResult.requiredSkills : reqSkills
  const niceToHaveSkills = aiResult.niceToHaveSkills?.length ? aiResult.niceToHaveSkills : nthSkills
  // Language detection: JSON-LD → regex only.
  // LLM is intentionally excluded — it hallucinates German/English as required
  // whenever the job description is written in that language, producing false
  // blockers on jobs that have no explicit language requirement.
  let requiredLanguages = [] as LanguageRequirement[]
  let langSource: 'jsonld' | 'regex' | null = null
  if ((jsonldResult?.requiredLanguages?.length ?? 0) > 0) {
    requiredLanguages = jsonldResult!.requiredLanguages
    langSource = 'jsonld'
  } else if ((langReqs?.length ?? 0) > 0) {
    requiredLanguages = langReqs
    langSource = 'regex'
  }
  // Ensure each required language object includes an `inferred` flag when
  // the source was the LLM so downstream scoring can treat inferred entries
  // differently according to user preferences.
  if (requiredLanguages.length > 0) {
    requiredLanguages = requiredLanguages.map(l => ({
      language: (l as any).language,
      minLevel: (l as any).minLevel ?? (l as any).required ?? 'B2',
      required: (l as any).required ?? true,
      inferred: false,
    }))
  }
  const requiredExperienceYears = typeof aiResult.requiredExperienceYears === 'number'
    ? aiResult.requiredExperienceYears
    : expYears
  const visa = aiResult.visa ?? (jsonldResult?.visa?.confidence ?? 0 > visaResult.confidence ? jsonldResult!.visa! : visaResult)
  // Prefer a high-confidence regex detection (title/body) for employment type
  // (e.g., "Werkstudent" / "Working Student") since some ATS JSON-LD fields
  // incorrectly default to FULL_TIME. AI output may also be noisy for type, so
  // only use it when regex didn't find a confident match.
  const employmentType = empConf > 0.5
    ? empType
    : (aiResult.employmentType ?? (jsonldResult?.employmentType ?? empType))
  const remote = aiResult.remote ?? (jsonldResult?.remote ?? remoteValue)
  const salaryResult = aiResult.salary ?? (jsonldResult?.salary ?? salary)
  const postedDate = aiResult.postedDate ?? jsonldResult?.postedDate
  const extractedBy = (langSource === 'jsonld' || (jsonldResult && (requiredSkills.length === 0 && niceToHaveSkills.length === 0)))
    ? 'jsonld'
    : (langSource === 'regex' || (langSource === null && (reqSkills.length > 0 || nthSkills.length > 0)))
      ? 'regex'
      : (aiResult.requiredSkills?.length || aiResult.niceToHaveSkills?.length)
        ? 'llm'
        : 'regex'

  const base: Partial<ExtractionResult> = {
    jobId,
    requiredSkills,
    niceToHaveSkills,
    requiredLanguages,
    requiredExperienceYears,
    visa,
    employmentType,
    remote,
    salary: salaryResult,
    postedDate,
    extractedBy,
    confidence: {
      skills: aiResult.requiredSkills?.length || aiResult.niceToHaveSkills?.length ? 0.92 : (reqSkills.length > 0 ? 0.80 : 0.20),
      languages: langSource === 'regex'
        ? langConf
        : (jsonldResult?.confidence?.languages ?? 0.15),
      visa: aiResult.visa ? (aiResult.confidence?.visa ?? aiResult.visa.confidence ?? 0.92) : Math.max(jsonldResult?.confidence?.visa ?? 0, visaResult.confidence),
      salary: aiResult.salary ? (aiResult.confidence?.salary ?? 0.90) : (jsonldResult?.salary ? 0.95 : salConf),
      employmentType: aiResult.employmentType ? (aiResult.confidence?.employmentType ?? 0.90) : (jsonldResult?.confidence?.employmentType ?? empConf),
      experienceYears: aiResult.requiredExperienceYears ? (aiResult.confidence?.experienceYears ?? 0.90) : expConf,
    },
    extractedAt: Date.now(),
  }

  const result = mergeWithDefaults(base, jobId)
  assessConfidence(result.confidence)

  return result
}
