import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const taleoExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    // Taleo (Oracle) ATS — classic version uses table-based layout;
    // newer version uses web components.

    const title =
      doc.querySelector('#JD_TITLE, .req-title, [class*="reqTitle"], h1')?.textContent?.trim()

    const company =
      doc.querySelector('.ats-company, [class*="companyName"], [class*="organization"]')?.textContent?.trim()
      || new URL(url).hostname.replace('careers.', '').replace('.taleo.net', '').replace(/\./g, ' ')

    const location =
      doc.querySelector('#JD_LOCATION, .req-location, [class*="location"]')?.textContent?.trim()

    const descEl =
      doc.querySelector('#JD_DESCRIPTION, .requisition-content, .req-description, [class*="jobDescription"]')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null

    return {
      platform: 'taleo',
      url,
      title,
      company: company || 'Unknown',
      location: location || 'Unknown',
      description,
      scrapedAt: Date.now(),
    }
  },
}
