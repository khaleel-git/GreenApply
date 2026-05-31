import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'
import { genericExtractor } from './generic.extractor'

export const personioExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    // Personio: try JSON-LD first (reliable), then stable attrs, then generic fallback
    const title = doc.querySelector('[class*="job-title"], [class*="JobTitle"], h1')?.textContent?.trim()
    const company = doc.querySelector('[class*="company-name"], [class*="CompanyName"]')?.textContent?.trim()
    const location = doc.querySelector('[class*="location"], [class*="Location"]')?.textContent?.trim()
    const descEl = doc.querySelector('[class*="job-description"], [class*="JobDescription"], main')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (title && description) {
      return { platform: 'personio', url, title, company: company || 'Unknown', location: location || 'Unknown', description, scrapedAt: Date.now() }
    }

    // Fallback to generic (JSON-LD is usually present on Personio pages)
    const result = genericExtractor.extract(doc, url)
    return result ? { ...result, platform: 'personio' } : null
  },
}
