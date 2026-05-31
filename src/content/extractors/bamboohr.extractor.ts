import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const bamboohrExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    const title =
      doc.querySelector('.BambooHR-ATS-Jobs-Item h2, h1[class*="title"], h1')?.textContent?.trim()

    // Company name is in the page <title> or the site logo alt text
    const pageTitle = doc.title // e.g. "Software Engineer | Acme Corp"
    const company =
      doc.querySelector('[class*="company-name"], .employer-name')?.textContent?.trim()
      || (pageTitle.includes('|') ? pageTitle.split('|').pop()?.trim() : undefined)
      || new URL(url).hostname.split('.')[0]

    const location =
      doc.querySelector('.BambooHR-ATS-Location, [class*="location"]')?.textContent?.trim()

    const descEl =
      doc.querySelector('.BambooHR-ATS-body, #description, [class*="description"]')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null

    return {
      platform: 'bamboohr',
      url,
      title,
      company: company || 'Unknown',
      location: location || 'Unknown',
      description,
      scrapedAt: Date.now(),
    }
  },
}
