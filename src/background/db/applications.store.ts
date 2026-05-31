import { getDB } from './idb'
import type { Application, ApplicationStatus } from '../../types'

export async function saveApplication(app: Application): Promise<void> {
  const db = await getDB()
  await db.put('applications', app)
}

export async function getApplication(id: string): Promise<Application | undefined> {
  const db = await getDB()
  return db.get('applications', id)
}

export async function getApplicationByJobId(jobId: string): Promise<Application | undefined> {
  const all = await getAllApplications()
  return all.find(a => a.jobId === jobId)
}

export async function getAllApplications(): Promise<Application[]> {
  const db = await getDB()
  return db.getAll('applications')
}

export async function getApplicationsByStatus(status: ApplicationStatus): Promise<Application[]> {
  const db = await getDB()
  return db.getAllFromIndex('applications', 'by-status', status)
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  note?: string,
): Promise<void> {
  const app = await getApplication(id)
  if (!app) return
  app.status = status
  app.updatedAt = Date.now()
  app.timeline.push({ status, timestamp: Date.now(), note })
  if (status === 'applied' && !app.appliedAt) app.appliedAt = Date.now()
  await saveApplication(app)
}
