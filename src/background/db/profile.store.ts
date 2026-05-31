import { getDB } from './idb'
import type { UserProfile } from '../../types'

const PROFILE_KEY = 'main'

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB()
  await db.put('profile', { ...profile, id: PROFILE_KEY })
}

export async function getProfile(): Promise<UserProfile | undefined> {
  const db = await getDB()
  return db.get('profile', PROFILE_KEY)
}
