import type { ResumeProfile } from '../../types'
import { nimEmbed } from './client'
import { getDB, type ResumeChunkRecord } from '../db/idb'

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8)
}

function chunkProfile(profile: ResumeProfile): Array<{ text: string; section: string }> {
  const chunks: Array<{ text: string; section: string }> = []

  for (const exp of profile.experience) {
    const bullets = exp.bullets.filter(Boolean).join('. ')
    const text = `${exp.title} at ${exp.company} (${exp.startDate}–${exp.endDate})${bullets ? ': ' + bullets : ''}`
    chunks.push({ text, section: 'experience' })
  }

  if (profile.skills.length > 0) {
    chunks.push({ text: `Technical skills: ${profile.skills.join(', ')}`, section: 'skills' })
  }

  for (const edu of profile.education) {
    const text = `${edu.degree} in ${edu.field} at ${edu.institution}${edu.year ? ` (${edu.year})` : ''}`
    chunks.push({ text, section: 'education' })
  }

  if (profile.languages.length > 0) {
    chunks.push({
      text: `Languages: ${profile.languages.map(l => `${l.language} ${l.level}`).join(', ')}`,
      section: 'languages',
    })
  }

  if (profile.domains.length > 0) {
    chunks.push({ text: `Domain expertise: ${profile.domains.join(', ')}`, section: 'domains' })
  }

  if (profile.certifications?.length > 0) {
    chunks.push({ text: `Certifications: ${profile.certifications.join(', ')}`, section: 'certifications' })
  }

  return chunks.filter(c => c.text.trim().length > 20)
}

export async function buildResumeIndex(profile: ResumeProfile): Promise<void> {
  const rawChunks = chunkProfile(profile)
  if (rawChunks.length === 0) return

  const embeddings = await nimEmbed(rawChunks.map(c => c.text))

  const db = await getDB()
  const tx = db.transaction('resumeChunks', 'readwrite')
  await tx.store.clear()
  const now = Date.now()
  for (let i = 0; i < rawChunks.length; i++) {
    const record: ResumeChunkRecord = {
      id: `chunk-${i}`,
      text: rawChunks[i].text,
      section: rawChunks[i].section,
      embedding: embeddings[i],
      createdAt: now,
    }
    await tx.store.put(record)
  }
  await tx.done
}

export async function queryResumeIndex(query: string, topK = 4): Promise<string[]> {
  const db = await getDB()
  const chunks = await db.getAll('resumeChunks')
  if (chunks.length === 0) return []

  const [queryVec] = await nimEmbed([query])

  const scored = chunks
    .map(c => ({ text: c.text, score: cosineSimilarity(queryVec, c.embedding) }))
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map(s => s.text)
}
