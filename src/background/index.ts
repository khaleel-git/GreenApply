import type { BackgroundMessage } from '../types'
import { handleJobDetected } from './handlers/job.handler'
import { handleGetMatch } from './handlers/match.handler'
import { handleGetProfile, handleSaveProfile } from './handlers/profile.handler'
import { handleSaveApplication, handleUpdateStatus, handleGetApplications } from './handlers/tracker.handler'
import { handleGenerateCoverLetter } from './handlers/generate.handler'
import { getMetrics } from './db/metrics.store'
import { getRules, saveRule } from './db/rules.store'
import { stripCachedSummaries } from './db/matches.store'

// On each SW startup, evict any cached LLM summaries that reference removed
// features (e.g. visa) so they're regenerated cleanly on next job visit.
stripCachedSummaries().catch(() => {})

// Sites already handled by declarative content_scripts — skip dynamic injection
const LISTED_ORIGINS = [
  'linkedin.com', 'indeed.', 'glassdoor.', 'stepstone.de',
  'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com', 'personio.',
  'jobs.tu-berlin.de',
]
// URL fragments that suggest a job or job-listing page
const JOB_URL_SIGNALS = [
  '/job/', '/jobs/', '/career/', '/careers/', '/karriere/', '/stellenangebote/',
  '/vacancy/', '/vacancies/', '/position/', '/positions/', '/opening/', '/openings/',
  '/stellenanzeige/', '/jobangebote/', '/search/', '/offre/',
  '/job-postings', '/job-posting',
]

// Auto-inject content script on any career page the user visits
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  if (tab.url.startsWith('chrome')) return
  if (LISTED_ORIGINS.some(o => tab.url!.includes(o))) return
  const urlLower = tab.url.toLowerCase()
  if (!JOB_URL_SIGNALS.some(s => urlLower.includes(s))) return

  // Read the current loader filename from the manifest — handles hash changes automatically
  const files = (chrome.runtime.getManifest().content_scripts?.[0]?.js ?? []) as string[]
  if (!files.length) return

  chrome.scripting.executeScript({ target: { tabId }, files }).catch(() => {
    // Silently fail — user hasn't granted permission for this origin yet
    // The popup "Activate" button handles that flow
  })
})

// One-shot message handler — sender.tab.id is the reliable way to reply to the right tab
chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id
    handleMessage(message, tabId).then(sendResponse).catch(err => {
      console.error('[GreenApply SW]', err)
      sendResponse({ error: String(err) })
    })
    return true
  },
)

// Long-lived port for cover letter streaming (keeps SW alive during generation)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'generate') return
  port.onMessage.addListener((msg: { type: string; jobId: string }) => {
    if (msg.type === 'GENERATE_COVER_LETTER') {
      handleGenerateCoverLetter(msg.jobId, port)
    }
  })
})

async function handleMessage(msg: BackgroundMessage, tabId?: number): Promise<unknown> {
  switch (msg.type) {
    case 'JOB_DETECTED': {
      const { jobId } = await handleJobDetected(msg.payload)
      const match = await handleGetMatch(jobId, tabId)  // tabId passed for async enrichment too

      // Send initial result immediately — don't wait for LLM explanation
      if (tabId) {
        chrome.tabs.sendMessage(tabId, match
          ? { type: 'MATCH_RESULT', payload: match }
          : { type: 'MATCH_ERROR', error: 'Upload your resume first — Settings → Resume' },
        ).catch(() => {})
      }
      return { jobId }
    }

    case 'GET_MATCH':
      return handleGetMatch(msg.jobId)

    case 'GET_PROFILE':
      return handleGetProfile()

    case 'SAVE_PROFILE':
      await handleSaveProfile(msg.profile)
      return { ok: true }

    case 'SAVE_APPLICATION':
      return handleSaveApplication(msg.jobId)

    case 'UPDATE_STATUS':
      await handleUpdateStatus(msg.applicationId, msg.status, msg.note)
      return { ok: true }

    case 'GET_APPLICATIONS':
      return handleGetApplications()

    case 'GET_DASHBOARD_STATS':
      return getMetrics()

    case 'GET_RULES':
      return getRules()

    case 'SAVE_RULE': {
      const { rule } = msg as unknown as { type: string; rule: import('../types').UserRule }
      await saveRule(rule)
      return { ok: true }
    }

    default:
      return null
  }
}
