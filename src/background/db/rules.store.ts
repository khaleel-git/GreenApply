import { getDB } from './idb'
import type { UserRule } from '../../types'

export async function saveRule(rule: UserRule): Promise<void> {
  const db = await getDB()
  await db.put('rules', rule)
}

export async function getRules(): Promise<UserRule[]> {
  const db = await getDB()
  return db.getAll('rules')
}

export async function deleteRule(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('rules', id)
}
