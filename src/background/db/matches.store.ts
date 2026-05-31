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
