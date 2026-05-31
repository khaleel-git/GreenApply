import type { MatchResult } from '../../types'
import { getJob } from '../db/jobs.store'
import { getExtraction } from '../db/extractions.store'
import { getMatch, saveMatch } from '../db/matches.store'
import { getProfile } from '../db/profile.store'
import { computeMatch } from '../scoring/engine'
import { incrementMetric } from '../db/metrics.store'
import { TIME_SAVED_PER_SKIP_MINUTES } from '../../constants/scoring'
import { generateScoreExplanation } from '../nim/explainer'

export async function handleGetMatch(jobId: string, tabId?: number): Promise<MatchResult | null> {
  const cached = await getMatch(jobId)
  if (cached) return cached

  const [job, extraction, profile] = await Promise.all([
    getJob(jobId),
    getExtraction(jobId),
    getProfile(),
  ])

  if (!job || !extraction || !profile) return null

  const result = computeMatch(job, extraction, profile)
  await saveMatch(result)

  if (result.recommendation === 'red') {
    await incrementMetric('jobsSkipped')
    await incrementMetric('timeSavedMinutes', TIME_SAVED_PER_SKIP_MINUTES)
  }

  // Fire-and-forget: enrich with LLM explanation and push update to tab
  enrichWithExplanation(result, tabId).catch(() => {})

  return result
}

async function enrichWithExplanation(result: MatchResult, tabId?: number): Promise<void> {
  const stored = await chrome.storage.local.get('nvidiaApiKey')
  if (!stored.nvidiaApiKey) return

  try {
    const summary = await generateScoreExplanation(result)
    const enriched: MatchResult = { ...result, summary }
    await saveMatch(enriched)

    // Push updated result to the exact tab that triggered the analysis
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'MATCH_RESULT', payload: enriched }).catch(() => {})
    }
  } catch {
    // Silently fail — score explanation is optional
  }
}
