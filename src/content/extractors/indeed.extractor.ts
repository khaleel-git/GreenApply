import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const indeedExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    const title = doc.querySelector('[class*="jobTitle"] span, h1[class*="title"], h2.icl-u-xs-mb--xs')?.textContent?.trim()
    const company = doc.querySelector('[class*="companyName"], [data-testid="inlineHeader-companyName"]')?.textContent?.trim()
    const location = doc.querySelector('[class*="companyLocation"], [data-testid="job-location"]')?.textContent?.trim()
    const descEl = doc.querySelector('#jobDescriptionText, [id*="jobDescription"], [class*="jobDescription"]')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null
    return { platform: 'indeed', url, title, company: company || 'Unknown', location: location || 'Unknown', description, scrapedAt: Date.now() }
  },
}
