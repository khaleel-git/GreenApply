import { getDB } from './idb'
import type { CompanyProfile } from '../../types'

export function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

export async function getCompany(name: string): Promise<CompanyProfile | undefined> {
  const db = await getDB()
  return db.get('companies', normalizeCompanyName(name))
}

export async function saveCompany(company: CompanyProfile): Promise<void> {
  const db = await getDB()
  await db.put('companies', { ...company, normalizedName: normalizeCompanyName(company.displayName) })
}
