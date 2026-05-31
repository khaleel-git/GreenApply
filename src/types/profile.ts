export interface LanguageEntry {
  language: string
  level: string  // 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native'
}

export interface ExperienceEntry {
  title: string
  company: string
  startDate: string        // ISO "YYYY-MM"
  endDate: string | 'present'
  bullets: string[]
}

export interface EducationEntry {
  degree: string
  field: string
  institution: string
  year?: number
}

export interface ResumeProfile {
  raw: string
  fileName: string
  fileType: 'pdf' | 'docx'
  uploadedAt: number
  parsedBy: 'deterministic' | 'llm'
  skills: string[]
  industries: string[]
  seniority: 'student' | 'junior' | 'mid' | 'senior' | 'lead'
  totalExperienceYears: number    // merged intervals, not naive sum
  domains: string[]
  education: EducationEntry[]
  experience: ExperienceEntry[]
  languages: LanguageEntry[]
  certifications: string[]
}

export type DegreeLevel =
  | 'bachelor_student'    // currently enrolled in bachelor's
  | 'bachelor_graduate'   // completed bachelor's
  | 'master_student'      // currently enrolled in master's
  | 'master_graduate'     // completed master's
  | 'phd_student'         // currently in PhD programme
  | 'phd_graduate'        // completed PhD
  | 'other'

export interface AcademicProfile {
  degreeLevel: DegreeLevel
  fieldOfStudy: string          // e.g. "Computer Science", "Electrical Engineering"
  university: string
  courses: string[]             // extracted from transcript + manually added
  certifications: string[]      // e.g. "Machine Learning Specialization (Coursera, 2024)"
  gpa?: number
  graduationYear?: number
  uploadedFileNames: string[]   // names of uploaded docs for display
  uploadedAt: number
}

export type WorkAuthStatus =
  | 'citizen'
  | 'permanent_resident'
  | 'eu_blue_card'
  | 'work_permit'
  | 'needs_sponsorship'
  | 'student_visa'

export interface UserPreferences {
  jobTypes: ('full-time' | 'part-time' | 'internship' | 'werkstudent' | 'freelance' | 'thesis')[]
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any'
  minSalaryEur?: number
  excludedCompanies: string[]
  targetRoles: string[]
  targetIndustries: string[]
  uiLanguage: 'en' | 'de'
  // If true, language requirements produced by inference (AI) are treated as
  // hard filters. If false, inferred languages are considered informational only.
  treatInferredLanguagesAsHardFilter?: boolean
}

export interface UserProfile {
  id: string
  name: string
  email: string
  location: string
  targetLocations: string[]
  workAuth: WorkAuthStatus
  resume?: ResumeProfile
  academic?: AcademicProfile
  preferences: UserPreferences
  languages: LanguageEntry[]
  skills?: string[]        // manually entered skills — merged with resume-detected skills for scoring
  createdAt: number
  updatedAt: number
}
