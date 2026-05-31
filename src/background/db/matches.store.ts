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

// Strip the LLM summary from all cached matches so stale explanations (e.g.
// ones that mentioned visa before the feature was removed) are regenerated on
// the next visit without requiring a full re-score.
export async function stripCachedSummaries(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll('matches')
  for (const m of all) {
    if (m.summary) {
      const { summary: _, ...rest } = m as MatchResult & { summary?: string }
      await db.put('matches', rest)
    }
  }
}
