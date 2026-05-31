import type { UserProfile } from '../../types'
import { getProfile, saveProfile } from '../db/profile.store'
import { generateDefaultRules } from '../rules/defaults'
import { saveRule } from '../db/rules.store'

export async function handleGetProfile(): Promise<UserProfile | undefined> {
  return getProfile()
}

export async function handleSaveProfile(partial: Partial<UserProfile>): Promise<void> {
  const existing = await getProfile()
  const now = Date.now()
  const base: UserProfile = {
    id: 'main',
    name: '',
    email: '',
    location: '',
    targetLocations: [],
    workAuth: 'needs_sponsorship',
    preferences: {
      jobTypes: ['full-time'],
      remotePreference: 'any',
      excludedCompanies: [],
      targetRoles: [],
      targetIndustries: [],
      uiLanguage: 'en',
    },
    languages: [],
    createdAt: now,
    updatedAt: now,
  }
  const profile: UserProfile = { ...base, ...existing, ...partial, updatedAt: now }
  await saveProfile(profile)

  if (!existing && partial.resume) {
    const rules = generateDefaultRules(profile.workAuth)
    for (const rule of rules) await saveRule(rule)
  }
}

