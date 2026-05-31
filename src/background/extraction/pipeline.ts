import type { ExtractionResult, RawJobData } from '../../types'
import { extractFromJsonLd } from './jsonld.extractor'
import {
  extractVisa, extractLanguages, extractEmploymentType,
  extractExperienceYears, extractRemote, extractSalary,
} from './regex.extractor'
import { extractSkills } from './dict.extractor'
import { assessConfidence } from './confidence'

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

  // Step 1: JSON-LD (free, instant, highest quality)
  const jsonldResult = extractFromJsonLd(description, jobId)

  // Step 2: Regex extraction (free, instant)
  // Employment type: prepend the job title so "Student assistant" / "Werkstudent"
  // in the title is detected even when the body text doesn't repeat it. Many ATS
  // systems (Taleo, Oracle) hardcode FULL_TIME in JSON-LD regardless of actual type.
  const empText = [raw.title, description].filter(Boolean).join('\n')
  const visaResult = extractVisa(description)
  const { reqs: langReqs, confidence: langConf } = extractLanguages(description)
  const { type: empType, confidence: empConf } = extractEmploymentType(empText)
  const { years: expYears, confidence: expConf } = extractExperienceYears(description)
  const { value: remoteValue } = extractRemote(description)
  const { salary, confidence: salConf } = extractSalary(description)

  // Step 3: Dictionary matching for skills
  const { required: reqSkills, niceToHave: nthSkills } = extractSkills(description)

  // Merge: JSON-LD wins where it has high confidence; regex fills gaps
  const base: Partial<ExtractionResult> = {
    jobId,
    requiredSkills: reqSkills,
    niceToHaveSkills: nthSkills,
    requiredLanguages: (jsonldResult?.requiredLanguages?.length ?? 0) > 0
      ? jsonldResult!.requiredLanguages
      : langReqs,
    requiredExperienceYears: expYears,
    visa: jsonldResult?.visa?.confidence ?? 0 > visaResult.confidence
      ? jsonldResult!.visa!
      : visaResult,
    // Regex wins when it found a specific type (conf > 0.5) — many ATS systems
    // (Taleo/Oracle) hardcode FULL_TIME in JSON-LD even for student/intern roles.
    employmentType: empConf > 0.5 ? empType : (jsonldResult?.employmentType ?? empType),
    remote: jsonldResult?.remote ?? remoteValue,
    salary: jsonldResult?.salary ?? salary,
    postedDate: jsonldResult?.postedDate,
    extractedBy: jsonldResult ? 'jsonld' : 'regex',
    confidence: {
      skills: reqSkills.length > 0 ? 0.80 : 0.20,
      languages: langReqs.length > 0 ? langConf : (jsonldResult?.confidence?.languages ?? 0.15),
      visa: Math.max(jsonldResult?.confidence?.visa ?? 0, visaResult.confidence),
      salary: jsonldResult?.salary ? 0.95 : salConf,
      employmentType: jsonldResult?.confidence?.employmentType ?? empConf,
      experienceYears: expConf,
    },
    extractedAt: Date.now(),
  }

  const result = mergeWithDefaults(base, jobId)
  const { overallConfident } = assessConfidence(result.confidence)

  // Step 4: LLM fallback — only if API key available AND confidence is low
  // (LLM fallback is skipped in MVP — marked as optional post-MVP)
  if (!overallConfident) {
    const apiKey = await getStoredApiKey()
    if (apiKey) {
      // LLM fallback will be wired in Phase 7 when nim/extractor.ts is implemented
      // For now, return what we have with low confidence marked
    }
  }

  return result
}

async function getStoredApiKey(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get('nvidiaApiKey')
    return result.nvidiaApiKey ?? null
  } catch {
    return null
  }
}
