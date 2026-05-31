import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const tuberlinExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    // TU Berlin job portal — try heading + main content area
    const title =
      doc.querySelector('h1')?.textContent?.trim() ||
      doc.querySelector('[class*="title"] h1, [class*="heading"] h1')?.textContent?.trim()

    if (!title) return null

    // Grab the largest visible content block
    const contentSelectors = [
      'main', 'article',
      '[class*="job-detail"]', '[class*="job-posting"]',
      '[class*="content"]', '[class*="description"]',
    ]
    let description = ''
    for (const sel of contentSelectors) {
      const el = doc.querySelector(sel)
      const text = (el as HTMLElement | null)?.innerText?.trim() ?? ''
      if (text.length > description.length) description = text
    }
    if (!description) description = doc.body?.innerText?.slice(0, 15_000) ?? ''
    if (!description) return null

    return {
      platform: 'tuberlin',
      url,
      title,
      company: 'Technische Universität Berlin',
      location: 'Berlin, Germany',
      description,
      scrapedAt: Date.now(),
    }
  },
}
