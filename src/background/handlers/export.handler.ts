import { getDB } from '../db/idb'
import { saveProfile } from '../db/profile.store'
import { getAllFiles, saveFile } from '../db/files.store'

export async function handleExportConfig(): Promise<unknown> {
  const db = await getDB()
  const profile = await db.get('profile', 'main')
  const jobs = await db.getAll('jobs')
  const applications = await db.getAll('applications')
  const resumeChunks = await db.getAll('resumeChunks')
  const files = await getAllFiles()
  const rules = await db.getAll('rules')
  const metrics = await db.getAll('metrics')
  const companies = await db.getAll('companies')
  const extractions = await db.getAll('extractions')
  const matches = await db.getAll('matches')

  return {
    exportedAt: Date.now(),
    profile,
    jobs,
    applications,
    resumeChunks,
    files,
    rules,
    metrics,
    companies,
    extractions,
    matches,
  }
}

export async function handleImportConfig(payload: any, mode: 'merge' | 'replace' = 'merge'): Promise<void> {
  if (!payload || typeof payload !== 'object') return
  const db = await getDB()

  // Profile: overwrite, but preserve API key from current profile if not in payload
  if (payload.profile) {
    try {
      const existingProfile = await (await getDB()).get('profile', 'main') as any
      const incomingProfile = { ...payload.profile } as any
      // Don't wipe the API key if the import file predates it
      if (!incomingProfile.nimApiKey && existingProfile?.nimApiKey) {
        incomingProfile.nimApiKey = existingProfile.nimApiKey
      }
      await saveProfile(incomingProfile)
      // Keep chrome.storage.local in sync
      const key = incomingProfile.nimApiKey
      if (key) await chrome.storage.local.set({ nvidiaApiKey: key })
    } catch (e) {
      // ignore
    }
  }

  async function replaceStore(storeName: string, items: any[]) {
    if (!Array.isArray(items)) return
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    await store.clear()
    for (const it of items) {
      try { await store.put(it) } catch (e) { /* skip bad record */ }
    }
    await tx.done
  }

  async function mergeStore(storeName: string, items: any[]) {
    if (!Array.isArray(items)) return
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const it of items) {
      try { await store.put(it) } catch (e) { /* skip bad record */ }
    }
    await tx.done
  }

  const doReplace = mode === 'replace'

  // Jobs
  if (doReplace) await replaceStore('jobs', payload.jobs ?? [])
  else await mergeStore('jobs', payload.jobs ?? [])

  // Applications
  if (doReplace) await replaceStore('applications', payload.applications ?? [])
  else await mergeStore('applications', payload.applications ?? [])

  // Resume chunks
  if (doReplace) await replaceStore('resumeChunks', payload.resumeChunks ?? [])
  else await mergeStore('resumeChunks', payload.resumeChunks ?? [])

  // Files
  if (Array.isArray(payload.files)) {
    if (doReplace) {
      const tx = db.transaction('files', 'readwrite')
      await tx.store.clear()
      for (const it of payload.files) {
        try { await tx.store.put(it) } catch (e) { }
      }
      await tx.done
    } else {
      await mergeStore('files', payload.files)
    }
  }

  // Rules
  if (doReplace) await replaceStore('rules', payload.rules ?? [])
  else await mergeStore('rules', payload.rules ?? [])

  // Metrics: overwrite imported entries (do not sum)
  if (Array.isArray(payload.metrics)) {
    const tx = db.transaction('metrics', 'readwrite')
    if (doReplace) await tx.store.clear()
    for (const m of payload.metrics) {
      try { await tx.store.put(m) } catch (e) { }
    }
    await tx.done
  }

  // Companies
  if (doReplace) await replaceStore('companies', payload.companies ?? [])
  else await mergeStore('companies', payload.companies ?? [])

  // Extractions & matches
  if (doReplace) await replaceStore('extractions', payload.extractions ?? [])
  else await mergeStore('extractions', payload.extractions ?? [])

  if (doReplace) await replaceStore('matches', payload.matches ?? [])
  else await mergeStore('matches', payload.matches ?? [])
}
