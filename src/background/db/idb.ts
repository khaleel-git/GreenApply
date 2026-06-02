import { openDB, type IDBPDatabase } from 'idb'
import type { UserProfile, JobListing, ExtractionResult, MatchResult, Application, CompanyProfile, UserRule } from '../../types'

export interface ResumeChunkRecord {
  id: string
  text: string
  section: string
  embedding: number[]
  createdAt: number
}

export interface GreenApplyDB {
  profile: {
    key: string
    value: UserProfile
  }
  jobs: {
    key: string
    value: JobListing
    indexes: { 'by-scrapedAt': number; 'by-platform': string }
  }
  extractions: {
    key: string
    value: ExtractionResult
  }
  matches: {
    key: string
    value: MatchResult
  }
  applications: {
    key: string
    value: Application
    indexes: { 'by-status': string; 'by-updatedAt': number }
  }
  companies: {
    key: string
    value: CompanyProfile
  }
  rules: {
    key: string
    value: UserRule
  }
  metrics: {
    key: string
    value: { key: string; value: number }
  }
  resumeChunks: {
    key: string
    value: ResumeChunkRecord
  }
}

let db: IDBPDatabase<GreenApplyDB> | null = null

export async function getDB(): Promise<IDBPDatabase<GreenApplyDB>> {
  if (db) return db
  db = await openDB<GreenApplyDB>('greenapply', 6, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      // v3: language extraction now uses AI-first parsing and expanded phrasing
      // coverage, so drop cached extractions/matches to force a re-analysis.
      if (oldVersion >= 1 && oldVersion < 3) {
        transaction.objectStore('extractions').clear()
        transaction.objectStore('matches').clear()
      }
      // v4: resume vector index for cover letter generation
      if (!database.objectStoreNames.contains('resumeChunks')) {
        database.createObjectStore('resumeChunks', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('files')) {
        database.createObjectStore('files', { keyPath: 'id' })
      }
      // v5: fixed German false-positive — bare "Deutsch" (nav switcher) was matching
      // the language regex; LLM language inference also removed. Clear cache so all
      // jobs re-analyse with the corrected extractor.
      if (oldVersion >= 3 && oldVersion < 5) {
        transaction.objectStore('extractions').clear()
        transaction.objectStore('matches').clear()
      }
      if (!database.objectStoreNames.contains('profile')) {
        database.createObjectStore('profile', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('jobs')) {
        const jobs = database.createObjectStore('jobs', { keyPath: 'id' })
        jobs.createIndex('by-scrapedAt', 'scrapedAt')
        jobs.createIndex('by-platform', 'platform')
      }
      if (!database.objectStoreNames.contains('extractions')) {
        database.createObjectStore('extractions', { keyPath: 'jobId' })
      }
      if (!database.objectStoreNames.contains('matches')) {
        database.createObjectStore('matches', { keyPath: 'jobId' })
      }
      if (!database.objectStoreNames.contains('applications')) {
        const apps = database.createObjectStore('applications', { keyPath: 'id' })
        apps.createIndex('by-status', 'status')
        apps.createIndex('by-updatedAt', 'updatedAt')
      }
      if (!database.objectStoreNames.contains('companies')) {
        database.createObjectStore('companies', { keyPath: 'normalizedName' })
      }
      if (!database.objectStoreNames.contains('rules')) {
        database.createObjectStore('rules', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('metrics')) {
        database.createObjectStore('metrics', { keyPath: 'key' })
      }
    },
  })
  return db
}
