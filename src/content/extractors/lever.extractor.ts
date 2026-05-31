import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const leverExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    const title = doc.querySelector('.posting-headline h2, h2.posting-headline--title')?.textContent?.trim()
    const company = doc.querySelector('.main-header-logo img')?.getAttribute('alt')?.trim()
      ?? url.split('/')[3] ?? 'Unknown'
    const location = doc.querySelector('.posting-categories .location, .sort-by-time')?.textContent?.trim()
    const descEl = doc.querySelector('.posting-description, .section-wrapper, [class*="description"]')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null
    return { platform: 'lever', url, title, company, location: location || 'Unknown', description, scrapedAt: Date.now() }
  },
}
