import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const workdayExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    // Workday is a heavy SPA — wait for MutationObserver to fire this after content loads
    const title = doc.querySelector('[data-automation-id="jobPostingHeader"] h2, [data-automation-id="jobPostingTitle"]')?.textContent?.trim()
      ?? doc.querySelector('h2[class*="css"]')?.textContent?.trim()
    const location = doc.querySelector('[data-automation-id="locations"] dd, [data-automation-id="location"]')?.textContent?.trim()
    const company = doc.querySelector('[data-automation-id="company-name"], .WDUI-Heading')?.textContent?.trim()
      ?? new URL(url).hostname.replace('.myworkdayjobs.com', '')
    const descEl = doc.querySelector('[data-automation-id="jobPostingDescription"]')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null
    return { platform: 'workday', url, title, company: company || 'Unknown', location: location || 'Unknown', description, scrapedAt: Date.now() }
  },
}
