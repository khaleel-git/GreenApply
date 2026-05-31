import type { JobListing } from './job'

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export interface TimelineEvent {
  status: ApplicationStatus
  timestamp: number
  note?: string
}

export interface Application {
  id: string
  jobId: string
  job: JobListing
  matchScore: number
  status: ApplicationStatus
  timeline: TimelineEvent[]
  notes: string
  rejectionReason?: string
  coverLetter?: string
  appliedAt?: number
  createdAt: number
  updatedAt: number
}
