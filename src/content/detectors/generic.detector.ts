import type { IPlatformDetector } from './detector.interface'
import { JOB_URL_PATTERNS } from '../../constants/patterns'

export const genericDetector: IPlatformDetector = {
  platform: 'generic',

  isJobPage(url: string, doc: Document): boolean {
    const urlLower = url.toLowerCase()

    // Check URL patterns
    if (JOB_URL_PATTERNS.some(p => urlLower.includes(p))) return true

    // Check JSON-LD JobPosting
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent ?? '{}')
        const items = Array.isArray(data) ? data : [data]
        if (items.some((i: { '@type'?: string }) => i['@type'] === 'JobPosting')) return true
        if (data['@graph']?.some((i: { '@type'?: string }) => i['@type'] === 'JobPosting')) return true
      } catch { /* skip */ }
    }

    // DOM heuristic: large h1 + substantial description block
    const h1 = doc.querySelector('h1')
    if (h1 && h1.textContent && h1.textContent.length > 5) {
      const bodyText = doc.body?.innerText ?? ''
      if (bodyText.length > 500) {
        const jobKeywords = /(?:responsibilities|qualifications|requirements|we offer|benefits|apply now|job description|stellenbeschreibung|anforderungen|aufgaben)/i
        if (jobKeywords.test(bodyText)) return true
      }
    }

    return false
  },

  getJobContainerSelector(): string {
    return 'main, article, [role="main"], .job-description, .job-post, #content'
  },
}
