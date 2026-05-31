export type DetectedPlatform =
  | 'linkedin'
  | 'indeed'
  | 'glassdoor'
  | 'stepstone'
  | 'greenhouse'
  | 'lever'
  | 'workday'
  | 'ashby'
  | 'personio'
  | 'fetchjobs'
  | 'tuberlin'
  // ATS platforms
  | 'successfactors'
  | 'taleo'
  | 'bamboohr'
  | 'icims'
  | 'recruitee'
  | 'softgarden'
  | 'smartrecruiters'
  // German / student job boards
  | 'xing'
  | 'jobteaser'
  | 'absolventa'
  | 'workwise'
  | 'join'
  | 'monster'
  | 'jobware'
  | 'generic'

export interface SalaryRange {
  min?: number
  max?: number
  currency: string
  period: 'year' | 'month' | 'hour'
}

export interface LanguageRequirement {
  language: string
  minLevel: string       // 'B2', 'C1', 'Native'
  inferred?: boolean
  required: boolean
}

export interface VisaAssessment {
  value: true | false | 'unknown'
  confidence: number     // 0.0–1.0
  evidence: string[]     // sentences that triggered the detection
}

export interface JobListing {
  id: string             // sha256(normalizedCompany|normalizedTitle|normalizedLocation)
  url: string
  platform: DetectedPlatform
  title: string
  company: string
  location: string
  description: string
  isDuplicate?: boolean
  scrapedAt: number
}

export interface ExtractionResult {
  jobId: string
  requiredSkills: string[]
  niceToHaveSkills: string[]
  requiredLanguages: LanguageRequirement[]
  requiredExperienceYears?: number
  visa: VisaAssessment
  employmentType: string
  remote: boolean | 'hybrid'
  salary?: SalaryRange
  postedDate?: string    // ISO date string
  extractedBy: 'jsonld' | 'regex' | 'dict' | 'llm'
  confidence: {
    skills: number
    languages: number
    visa: number
    salary: number
    employmentType: number
    experienceYears: number
  }
  extractedAt: number
}

export interface RawJobData {
  platform: DetectedPlatform
  url: string
  title: string
  company: string
  location: string
  description: string
  scrapedAt: number
}
