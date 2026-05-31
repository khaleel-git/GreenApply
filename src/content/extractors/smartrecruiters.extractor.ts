import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const smartrecruitersExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    // SmartRecruiters job pages embed JSON-LD; fall back to DOM selectors.
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent ?? '{}')
        if (data['@type'] === 'JobPosting') {
          return {
            platform: 'smartrecruiters',
            url,
            title: data.title ?? '',
            company: data.hiringOrganization?.name ?? '',
            location: data.jobLocation?.[0]?.address?.addressLocality ?? 'Unknown',
            description: (data.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            scrapedAt: Date.now(),
          }
        }
      } catch { /* skip */ }
    }

    const title = doc.querySelector('h1[class*="title"], [data-testid="job-title"], h1')?.textContent?.trim()
    const company = doc.querySelector('[class*="company"], [data-testid="company"]')?.textContent?.trim()
    const location = doc.querySelector('[class*="location"], [data-testid="location"]')?.textContent?.trim()
    const descEl = doc.querySelector('.job-description, [class*="job-description"], [data-testid*="description"]')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null
    return { platform: 'smartrecruiters', url, title, company: company || 'Unknown', location: location || 'Unknown', description, scrapedAt: Date.now() }
  },
}
