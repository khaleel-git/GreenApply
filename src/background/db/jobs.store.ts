import { getDB } from './idb'
import type { JobListing } from '../../types'

export async function saveJob(job: JobListing): Promise<void> {
  const db = await getDB()
  await db.put('jobs', job)
}

export async function getJob(id: string): Promise<JobListing | undefined> {
  const db = await getDB()
  return db.get('jobs', id)
}

export async function getAllJobs(): Promise<JobListing[]> {
  const db = await getDB()
  return db.getAll('jobs')
}

export async function jobExists(id: string): Promise<boolean> {
  const db = await getDB()
  return (await db.count('jobs', id)) > 0
}
