import type { BackgroundMessage } from '../types'
import { handleJobDetected } from './handlers/job.handler'
import { handleGetMatch } from './handlers/match.handler'
import { handleGetProfile, handleSaveProfile } from './handlers/profile.handler'
import {
  handleSaveApplication,
  handleUpdateStatus,
  handleGetApplications,
  handleUpdateApplicationDetails,
  handleDeleteApplication,
} from './handlers/tracker.handler'
import { handleExportConfig, handleImportConfig } from './handlers/export.handler'
import { handleGenerateCoverLetter } from './handlers/generate.handler'
import { handleApplicationQA } from './handlers/application-qa.handler'
import { getMetrics } from './db/metrics.store'
import { getRules, saveRule } from './db/rules.store'
import { stripCachedSummaries } from './db/matches.store'
import { clearExtractions } from './db/extractions.store'

// Bump this constant when the regex extraction logic changes in a way that
// would produce different (better) results from existing cached extractions.
// On next SW startup the stale cache is wiped so jobs get re-extracted.
const EXTRACTION_VERSION = '4'

// On each SW startup, evict any cached LLM summaries that reference removed
// features (e.g. visa) so they're regenerated cleanly on next job visit.
stripCachedSummaries().catch(() => {})

// Clear stale extractions when the detector version changes.
chrome.storage.local.get('extractionVersion').then(async stored => {
  if (stored.extractionVersion !== EXTRACTION_VERSION) {
    await clearExtractions().catch(() => {})
    await chrome.storage.local.set({ extractionVersion: EXTRACTION_VERSION })
  }
}).catch(() => {})

// Sites already handled by declarative content_scripts — skip dynamic injection
const LISTED_ORIGINS = [
  'linkedin.com', 'indeed.', 'glassdoor.', 'stepstone.de',
  'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com', 'personio.',
  'jobs.tu-berlin.de',
  // ATS
  'successfactors.com', 'successfactors.eu', 'taleo.net', 'bamboohr.com',
  'icims.com', 'recruitee.com', 'softgarden.de', 'softgarden.io',
  'jobs.smartrecruiters.com',
  // German boards
  'xing.com', 'jobteaser.com', 'absolventa.de', 'workwise.io',
  'join.com', 'monster.de', 'monster.com', 'jobware.de',
]
// URL fragments that suggest a job listing or application form page
const JOB_URL_SIGNALS = [
  '/job/', '/jobs/', '/career/', '/careers/', '/karriere/', '/stellenangebote/',
  '/vacancy/', '/vacancies/', '/position/', '/positions/', '/opening/', '/openings/',
  '/stellenanzeige/', '/jobangebote/', '/search/', '/offre/',
  '/job-postings', '/job-posting',
  // ATS-specific path segments
  '/careersection/', '/requisition', '/jobdetail', '/jobad/',
  // German-specific
  '/stellenangebote', '/bewerbung', '/praktikum', '/praktika',
  // Application form signals
  '/apply', '/application', '/bewerben',
  'smartrecruiters.com', 'lever.co/apply', 'greenhouse.io/application',
  // Boards injected declaratively — still list here so job pages on sub-paths work
  'successfactors.com', 'taleo.net', 'bamboohr.com', 'icims.com',
  'recruitee.com', 'softgarden', 'xing.com/jobs', 'jobteaser.com',
  'absolventa.de', 'workwise.io', 'join.com/companies', 'monster.de/jobs',
  'monster.com/jobs', 'jobware.de',
]

// Auto-inject content script on career pages and user-enabled sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  if (tab.url.startsWith('chrome') || tab.url.startsWith('about')) return
  if (LISTED_ORIGINS.some(o => tab.url!.includes(o))) return  // already declaratively injected

  const urlLower = tab.url.toLowerCase()
  const matchesUrlSignal = JOB_URL_SIGNALS.some(s => urlLower.includes(s))

  let hostname = ''
  try { hostname = new URL(tab.url).hostname } catch { return }

  // Check user-enabled sites and global on/off toggle
  chrome.storage.local.get(['enabledSites', 'extensionEnabled']).then(({ enabledSites, extensionEnabled }) => {
    if (extensionEnabled === false) return  // extension is turned off
    const isUserEnabled = Array.isArray(enabledSites) && enabledSites.includes(hostname)
    if (!matchesUrlSignal && !isUserEnabled) return

    const files = (chrome.runtime.getManifest().content_scripts?.[0]?.js ?? []) as string[]
    if (!files.length) return
    chrome.scripting.executeScript({ target: { tabId }, files }).catch(() => {
      // Silently fail — permission may have been revoked in browser settings
    })
  }).catch(() => {})
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
      // Store so application-form Q&A can reference the last-seen job
      chrome.storage.local.set({ lastJobId: jobId }).catch(() => {})

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

    case 'APPLICATION_LOADING':
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'APPLICATION_LOADING' }).catch(() => {})
      }
      return null

    case 'APPLICATION_QA': {
      const answers = await handleApplicationQA(msg.questions)
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'APPLICATION_ANSWERS', answers }).catch(() => {})
      }
      return answers
    }

    case 'GET_MATCH':
      return handleGetMatch(msg.jobId)

    case 'GET_PROFILE':
      return handleGetProfile()

    case 'SAVE_PROFILE':
      await handleSaveProfile(msg.profile)
      return { ok: true }

    case 'GET_FILE': {
      const { getFile } = await import('./db/files.store')
      return getFile(msg.id) ?? null
    }

    case 'UPLOAD_RESUME': {
      // payload: { fileName, fileBuffer, fileType }
      const { fileName, fileBuffer, fileType } = msg as unknown as { type: string; fileName: string; fileBuffer: ArrayBuffer; fileType: 'pdf' | 'docx' }
      try {
        // store under fixed id 'resume'
        const { saveFile } = await import('./db/files.store')
        await saveFile('resume', fileName, fileType, fileBuffer)
      } catch (e) {
        // ignore
      }
      return { ok: true }
    }

    case 'SAVE_APPLICATION':
      return handleSaveApplication(msg.jobId)

    case 'UPDATE_STATUS':
      await handleUpdateStatus(msg.applicationId, msg.status, msg.note)
      return { ok: true }

    case 'UPDATE_APPLICATION_DETAILS':
      await handleUpdateApplicationDetails(msg.applicationId, msg.jobPatch)
      return { ok: true }

    case 'DELETE_APPLICATION':
      await handleDeleteApplication(msg.applicationId)
      return { ok: true }

    case 'GET_APPLICATIONS':
      return handleGetApplications()

    case 'EXPORT_CONFIG':
      return handleExportConfig()

    case 'IMPORT_CONFIG':
      // msg may include optional mode
      await handleImportConfig((msg as any).payload, (msg as any).mode ?? 'merge')
      return { ok: true }

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
