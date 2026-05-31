import type { RawJobData, ExtractionResult } from './job'
import type { MatchResult } from './match'
import type { UserProfile } from './profile'
import type { ApplicationStatus } from './application'

export type BackgroundMessage =
  | { type: 'JOB_DETECTED'; payload: RawJobData }
  | { type: 'GET_MATCH'; jobId: string }
  | { type: 'GENERATE_COVER_LETTER'; jobId: string }
  | { type: 'SAVE_APPLICATION'; jobId: string }
  | { type: 'UPDATE_STATUS'; applicationId: string; status: ApplicationStatus; note?: string }
  | { type: 'GET_DASHBOARD_STATS' }
  | { type: 'SAVE_PROFILE'; profile: Partial<UserProfile> }
  | { type: 'GET_PROFILE' }
  | { type: 'UPLOAD_RESUME'; fileName: string; fileBuffer: ArrayBuffer; fileType: 'pdf' | 'docx' }
  | { type: 'GET_APPLICATIONS' }

export type ContentMessage =
  | { type: 'MATCH_RESULT'; payload: MatchResult }
  | { type: 'MATCH_LOADING' }
  | { type: 'MATCH_ERROR'; error: string }
  | { type: 'EXTRACTION_RESULT'; payload: ExtractionResult }
  | { type: 'GENERATION_CHUNK'; token: string; done: boolean }

export interface DashboardStats {
  jobsViewed: number
  jobsAnalyzed: number
  jobsSkipped: number
  jobsSaved: number
  applicationsSubmitted: number
  rejections: number
  interviews: number
  offers: number
  timeSavedMinutes: number
}
