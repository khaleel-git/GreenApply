import { startObserver } from './observer'
import { genericDetector } from './detectors/generic.detector'
import { linkedinDetector } from './detectors/linkedin.detector'
import { indeedDetector } from './detectors/indeed.detector'
import { greenhouseDetector } from './detectors/greenhouse.detector'
import { leverDetector } from './detectors/lever.detector'
import { workdayDetector } from './detectors/workday.detector'
import { personioDetector } from './detectors/personio.detector'
import { fetchjobsDetector } from './detectors/fetchjobs.detector'
import { stepstoneDetector } from './detectors/stepstone.detector'
import { tuberlinDetector } from './detectors/tuberlin.detector'
import { successfactorsDetector } from './detectors/successfactors.detector'
import { taleoDetector } from './detectors/taleo.detector'
import { bamboohrDetector } from './detectors/bamboohr.detector'
import { icimsDetector } from './detectors/icims.detector'
import { recruiteeDetector } from './detectors/recruitee.detector'
import { softgardenDetector } from './detectors/softgarden.detector'
import { smartrecruitersDetector } from './detectors/smartrecruiters.detector'
import { xingDetector } from './detectors/xing.detector'
import { jobteaserDetector } from './detectors/jobteaser.detector'
import { absolventaDetector } from './detectors/absolventa.detector'
import { workwiseDetector } from './detectors/workwise.detector'
import { joinDetector } from './detectors/join.detector'
import { monsterDetector } from './detectors/monster.detector'
import { jobwareDetector } from './detectors/jobware.detector'
import { genericExtractor } from './extractors/generic.extractor'
import { linkedinExtractor } from './extractors/linkedin.extractor'
import { indeedExtractor } from './extractors/indeed.extractor'
import { greenhouseExtractor } from './extractors/greenhouse.extractor'
import { leverExtractor } from './extractors/lever.extractor'
import { workdayExtractor } from './extractors/workday.extractor'
import { personioExtractor } from './extractors/personio.extractor'
import { fetchjobsExtractor } from './extractors/fetchjobs.extractor'
import { stepstoneExtractor } from './extractors/stepstone.extractor'
import { tuberlinExtractor } from './extractors/tuberlin.extractor'
import { successfactorsExtractor } from './extractors/successfactors.extractor'
import { taleoExtractor } from './extractors/taleo.extractor'
import { bamboohrExtractor } from './extractors/bamboohr.extractor'
import { smartrecruitersExtractor } from './extractors/smartrecruiters.extractor'
import { mountShadowHost, unmountShadowHost } from './shadow-host'
import { mountOverlay } from './overlay-mount'   // static import — no CSP-blocked dynamic chunk
import { startFeedAnnotation, startGenericListingScan } from './feed'
import { isApplicationFormPage, extractFormQuestions } from './application/extractor'
import { fillField, fillCombobox } from './application/filler'
import type { ContentMessage, RawJobData } from '../types'

const detectors = [
  // Specific ATS platforms — ordered before generic so they don't get swallowed
  linkedinDetector, indeedDetector,
  greenhouseDetector, leverDetector, workdayDetector, personioDetector,
  fetchjobsDetector, tuberlinDetector, stepstoneDetector,
  successfactorsDetector, taleoDetector, bamboohrDetector,
  icimsDetector, recruiteeDetector, softgardenDetector, smartrecruitersDetector,
  // Job boards
  xingDetector, jobteaserDetector, absolventaDetector,
  workwiseDetector, joinDetector, monsterDetector, jobwareDetector,
  // Catch-all last
  genericDetector,
]

const extractors: Record<string, typeof genericExtractor> = {
  linkedin: linkedinExtractor,
  indeed: indeedExtractor,
  greenhouse: greenhouseExtractor,
  lever: leverExtractor,
  workday: workdayExtractor,
  personio: personioExtractor,
  fetchjobs: fetchjobsExtractor,
  stepstone: stepstoneExtractor,
  tuberlin: tuberlinExtractor,
  successfactors: successfactorsExtractor,
  taleo: taleoExtractor,
  bamboohr: bamboohrExtractor,
  smartrecruiters: smartrecruitersExtractor,
  // icims, recruitee, softgarden, xing, jobteaser, absolventa,
  // workwise, join, monster, jobware → generic extractor (JSON-LD + DOM fallback)
  generic: genericExtractor,
}

// Guard: content scripts can be injected into cross-origin iframes where
// chrome.runtime is undefined. Bail out immediately in that case.
if (typeof chrome === 'undefined' || !chrome.runtime) {
  // Not an extension context (e.g. sandboxed iframe) — do nothing.
  // eslint-disable-next-line no-console
  console.warn('GreenApply: no extension context, content script exiting.')
} else {
  let overlayMounted = false
  let extensionEnabled = true  // optimistic default; corrected by async storage read below

  // React to the popup toggle while the page is already loaded
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !('extensionEnabled' in changes)) return
    extensionEnabled = changes.extensionEnabled.newValue !== false
    if (!extensionEnabled && overlayMounted) {
      unmountShadowHost()
      overlayMounted = false
    }
  })

  function handleNavigation(): void {
    if (!extensionEnabled) return

    const url = location.href

    // ── Application form pages: skip entirely ─────────────────────────────
    // These are the "apply" steps after a user clicks Apply on a job listing.
    // Running job analysis here is wasteful — the page content isn't a job description.
    if (isApplicationFormPage(url, document)) {
      if (overlayMounted) {
        unmountShadowHost()
        overlayMounted = false
      }
      return
    }

    // ── Job listing mode ───────────────────────────────────────────────────
    const detector = detectors.find(d => d.isJobPage(url, document))
    if (!detector) {
      if (overlayMounted) {
        unmountShadowHost()
        overlayMounted = false
      }
      return
    }

    const platformExtractor = extractors[detector.platform]
    const raw: RawJobData | null =
      (platformExtractor && platformExtractor !== genericExtractor
        ? platformExtractor.extract(document, url) ?? genericExtractor.extract(document, url)
        : genericExtractor.extract(document, url))
    if (!raw) return

    if (!overlayMounted) {
      const shadow = mountShadowHost()
      mountOverlay(shadow)
      overlayMounted = true
    }

    if (chrome.runtime?.id) {
      try {
        chrome.runtime.sendMessage({ type: 'JOB_DETECTED', payload: raw }).catch(() => {})
      } catch { /* extension reloaded — context invalidated, ignore */ }
    }
  }

  // Receive messages pushed from service worker, including fill commands.
  try {
    chrome.runtime.onMessage.addListener((msg: ContentMessage & { type: string }) => {
      if (msg.type === 'FILL_FIELD') {
        const { selector, value, isCombobox } = msg as unknown as {
          type: string; selector: string; value: string; isCombobox?: boolean
        }
        if (isCombobox) fillCombobox(selector, value)
        else fillField(selector, value)
        return
      }
      window.dispatchEvent(new CustomEvent('greenapply:message', { detail: msg }))
    })
  } catch { /* extension reloaded — content script orphaned, ignore */ }

  // Listen for fill-field events emitted by the overlay (cross-shadow-boundary).
  window.addEventListener('greenapply:fill', (e: Event) => {
    const { selector, value, isCombobox } = (e as CustomEvent<{
      selector: string; value: string; isCombobox?: boolean
    }>).detail
    if (isCombobox) fillCombobox(selector, value)
    else fillField(selector, value)
  })

  // Read the enabled flag from storage, then start observers.
  // Wrapping in storage.get means we never run on pages visited while disabled.
  chrome.storage.local.get('extensionEnabled').then(({ extensionEnabled: stored }) => {
    extensionEnabled = stored !== false
    if (!extensionEnabled) return
    startObserver(handleNavigation)
    startFeedAnnotation()
    startGenericListingScan()
    handleNavigation()
  }).catch(() => {
    // Storage unavailable — start anyway with the optimistic default (enabled)
    startObserver(handleNavigation)
    startFeedAnnotation()
    startGenericListingScan()
    handleNavigation()
  })
}
