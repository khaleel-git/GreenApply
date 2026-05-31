import { getDB } from './idb'
import type { MatchResult } from '../../types'

export async function saveMatch(result: MatchResult): Promise<void> {
  const db = await getDB()
  await db.put('matches', result)
}

export async function getMatch(jobId: string): Promise<MatchResult | undefined> {
  const db = await getDB()
  return db.get('matches', jobId)
}

// Cached matches are keyed by jobId and computed against the profile. When the
// profile changes they are stale, so clear them to force a fresh re-score on the
// next visit.
export async function clearMatches(): Promise<void> {
  const db = await getDB()
  await db.clear('matches')
}
