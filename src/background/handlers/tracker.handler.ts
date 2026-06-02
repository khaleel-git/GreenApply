import type { Application, ApplicationStatus } from '../../types'
import {
  saveApplication, getAllApplications, getApplicationByJobId,
  updateApplicationStatus,
  updateApplicationJob, deleteApplication, getApplication,
} from '../db/applications.store'
import { getJob, updateJob } from '../db/jobs.store'
import { getMatch } from '../db/matches.store'
import { incrementMetric, decrementMetric } from '../db/metrics.store'

function generateId(): string {
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export async function handleSaveApplication(jobId: string): Promise<Application | null> {
  const [job, match] = await Promise.all([getJob(jobId), getMatch(jobId)])
  if (!job) return null

  const existing = await getApplicationByJobId(jobId)
  if (existing) return existing

  const now = Date.now()
  const app: Application = {
    id: generateId(),
    jobId,
    job,
    matchScore: match?.score ?? 0,
    status: 'saved',
    timeline: [{ status: 'saved', timestamp: now }],
    notes: '',
    createdAt: now,
    updatedAt: now,
  }

  await saveApplication(app)
  await incrementMetric('jobsSaved')
  return app
}

export async function handleUpdateStatus(
  applicationId: string,
  status: ApplicationStatus,
  note?: string,
): Promise<void> {
  await updateApplicationStatus(applicationId, status, note)

  if (status === 'applied') await incrementMetric('applicationsSubmitted')
  if (status === 'interview') await incrementMetric('interviews')
  if (status === 'offer') await incrementMetric('offers')
  if (status === 'rejected') await incrementMetric('rejections')
}

export async function handleUpdateApplicationDetails(
  applicationId: string,
  jobPatch: Partial<Pick<Application['job'], 'title' | 'company' | 'location' | 'url'>>,
): Promise<void> {
  const app = await getApplication(applicationId)
  if (!app) return
  await updateApplicationJob(applicationId, jobPatch)
  await updateJob(app.jobId, jobPatch)
}

export async function handleDeleteApplication(applicationId: string): Promise<void> {
  const app = await getApplication(applicationId)
  if (!app) return

  await deleteApplication(applicationId)
  await decrementMetric('jobsSaved')
  if (app.status === 'applied') await decrementMetric('applicationsSubmitted')
  if (app.status === 'interview') await decrementMetric('interviews')
  if (app.status === 'offer') await decrementMetric('offers')
  if (app.status === 'rejected') await decrementMetric('rejections')
}

export async function handleGetApplications(): Promise<Application[]> {
  return getAllApplications()
}
