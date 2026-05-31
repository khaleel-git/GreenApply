import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'
import { LINKEDIN_SELECTORS } from '../../constants/platforms'

export const linkedinExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    const title = doc.querySelector(LINKEDIN_SELECTORS.jobTitle)?.textContent?.trim()
    const company = doc.querySelector(LINKEDIN_SELECTORS.company)?.textContent?.trim()
    const location = doc.querySelector(LINKEDIN_SELECTORS.location)?.textContent?.trim()
    const descEl = doc.querySelector(LINKEDIN_SELECTORS.description)
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null

    return {
      platform: 'linkedin',
      url,
      title,
      company: company || 'Unknown',
      location: location || 'Unknown',
      description,
      scrapedAt: Date.now(),
    }
  },
}
