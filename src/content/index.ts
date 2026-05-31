import { startObserver } from './observer'
import { genericDetector } from './detectors/generic.detector'
import { linkedinDetector } from './detectors/linkedin.detector'
import { indeedDetector } from './detectors/indeed.detector'
import { greenhouseDetector } from './detectors/greenhouse.detector'
import { leverDetector } from './detectors/lever.detector'
import { workdayDetector } from './detectors/workday.detector'
import { personioDetector } from './detectors/personio.detector'
import { stepstoneDetector } from './detectors/stepstone.detector'
import { tuberlinDetector } from './detectors/tuberlin.detector'
import { genericExtractor } from './extractors/generic.extractor'
import { linkedinExtractor } from './extractors/linkedin.extractor'
import { indeedExtractor } from './extractors/indeed.extractor'
import { greenhouseExtractor } from './extractors/greenhouse.extractor'
import { leverExtractor } from './extractors/lever.extractor'
import { workdayExtractor } from './extractors/workday.extractor'
import { personioExtractor } from './extractors/personio.extractor'
import { stepstoneExtractor } from './extractors/stepstone.extractor'
import { tuberlinExtractor } from './extractors/tuberlin.extractor'
import { mountShadowHost, unmountShadowHost } from './shadow-host'
import { mountOverlay } from './overlay-mount'   // static import — no CSP-blocked dynamic chunk
import { startFeedAnnotation, startGenericListingScan } from './feed'
import type { ContentMessage, RawJobData } from '../types'

const detectors = [
  linkedinDetector, indeedDetector, greenhouseDetector,
  leverDetector, workdayDetector, personioDetector, tuberlinDetector,
  stepstoneDetector, genericDetector,
]

const extractors: Record<string, typeof genericExtractor> = {
  linkedin: linkedinExtractor,
  indeed: indeedExtractor,
  greenhouse: greenhouseExtractor,
  lever: leverExtractor,
  workday: workdayExtractor,
  personio: personioExtractor,
  stepstone: stepstoneExtractor,
  tuberlin: tuberlinExtractor,
  generic: genericExtractor,
}

// Guard: content scripts can be injected into cross-origin iframes where
// chrome.runtime is undefined. Bail out immediately in that case.
if (typeof chrome === 'undefined' || !chrome.runtime) {
  // Not an extension context (e.g. sandboxed iframe) — do nothing.
  throw new Error('GreenApply: no extension context, skipping')
}

let overlayMounted = false

function handleNavigation(): void {
  const url = location.href

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

  if (chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'JOB_DETECTED', payload: raw }).catch(() => {})
  }
}

// Receive match results pushed from service worker.
// Guard against "Extension context invalidated" when the extension is reloaded
// while the page is still open — the listener will simply stop working silently.
try {
  chrome.runtime.onMessage.addListener((msg: ContentMessage) => {
    window.dispatchEvent(new CustomEvent('greenapply:message', { detail: msg }))
  })
} catch { /* extension reloaded — content script orphaned, ignore */ }

startObserver(handleNavigation)
startFeedAnnotation()
startGenericListingScan()
