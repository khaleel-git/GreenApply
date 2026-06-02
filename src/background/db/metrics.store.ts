import { getDB } from './idb'

export interface UsageMetrics {
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

const DEFAULT_METRICS: UsageMetrics = {
  jobsViewed: 0,
  jobsAnalyzed: 0,
  jobsSkipped: 0,
  jobsSaved: 0,
  applicationsSubmitted: 0,
  rejections: 0,
  interviews: 0,
  offers: 0,
  timeSavedMinutes: 0,
}

export async function getMetrics(): Promise<UsageMetrics> {
  const db = await getDB()
  const all = await db.getAll('metrics')
  const map = Object.fromEntries(all.map(({ key, value }) => [key, value]))
  return { ...DEFAULT_METRICS, ...map } as UsageMetrics
}

export async function incrementMetric(key: keyof UsageMetrics, by = 1): Promise<void> {
  const db = await getDB()
  const existing = await db.get('metrics', key)
  const current = existing?.value ?? 0
  await db.put('metrics', { key, value: current + by })
}

export async function decrementMetric(key: keyof UsageMetrics, by = 1): Promise<void> {
  const db = await getDB()
  const existing = await db.get('metrics', key)
  const current = existing?.value ?? 0
  await db.put('metrics', { key, value: Math.max(0, current - by) })
}
