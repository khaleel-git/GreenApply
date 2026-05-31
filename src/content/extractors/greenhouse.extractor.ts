import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const greenhouseExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    const title = doc.querySelector('.app-title, h1[class*="title"], h1')?.textContent?.trim()
    const company = (doc.querySelector('.company-name, .company, [class*="company"]')?.textContent?.trim())
      ?? (new URL(url).hostname.replace('boards.greenhouse.io', '').replace(/\./g, '') || 'Unknown')
    const location = doc.querySelector('.location, [class*="location"]')?.textContent?.trim()
    const descEl = doc.querySelector('#content, .job-post-content, [class*="content"]')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null
    return { platform: 'greenhouse', url, title, company, location: location || 'Unknown', description, scrapedAt: Date.now() }
  },
}
