import { openDB, type IDBPDatabase } from 'idb'
import type { UserProfile, JobListing, ExtractionResult, MatchResult, Application, CompanyProfile, UserRule } from '../../types'

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
}

let db: IDBPDatabase<GreenApplyDB> | null = null

export async function getDB(): Promise<IDBPDatabase<GreenApplyDB>> {
  if (db) return db
  db = await openDB<GreenApplyDB>('greenapply', 2, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      // v2: language extraction improved — drop cached extractions/matches so
      // previously-visited jobs are re-analysed with the new detection.
      if (oldVersion >= 1 && oldVersion < 2) {
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
