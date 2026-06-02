import type { UserProfile } from '../../types'
import { getProfile, saveProfile } from '../db/profile.store'
import { generateDefaultRules } from '../rules/defaults'
import { saveRule } from '../db/rules.store'
import { clearMatches } from '../db/matches.store'

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

  // Mirror API key to chrome.storage.local so the NIM client can read it
  const nimKey = (partial as any).nimApiKey
  if (nimKey !== undefined) {
    if (nimKey) await chrome.storage.local.set({ nvidiaApiKey: nimKey })
    else await chrome.storage.local.remove('nvidiaApiKey')
  }

  // Profile changed → previously cached match scores are stale. Clear them so the
  // next job visit re-scores against the updated languages / skills / preferences.
  await clearMatches()

  if (!existing && partial.resume) {
    const rules = generateDefaultRules()
    for (const rule of rules) await saveRule(rule)
  }
}

