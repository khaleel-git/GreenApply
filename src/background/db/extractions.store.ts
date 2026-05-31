import { getDB } from './idb'
import type { ExtractionResult } from '../../types'

export async function saveExtraction(result: ExtractionResult): Promise<void> {
  const db = await getDB()
  await db.put('extractions', result)
}

export async function getExtraction(jobId: string): Promise<ExtractionResult | undefined> {
  const db = await getDB()
  return db.get('extractions', jobId)
}
