import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const stepstoneExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    const title = doc.querySelector('[data-at="header-job-title"], h1.listing-header, h1[class*="title"]')?.textContent?.trim()
    const company = doc.querySelector('[data-at="header-company-name"], [class*="company"]')?.textContent?.trim()
    const location = doc.querySelector('[data-at="job-ad-location"], [class*="location"]')?.textContent?.trim()
    const descEl = doc.querySelector('[class*="listing-content"], [class*="job-description"], article')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null
    return { platform: 'stepstone', url, title, company: company || 'Unknown', location: location || 'Unknown', description, scrapedAt: Date.now() }
  },
}
