import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

export const successfactorsExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    // SuccessFactors renders job data in a mix of meta tags, JSON blobs, and
    // deeply nested Angular/React components. We try multiple strategies.

    // 1. JSON-LD (present on some SF tenants)
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent ?? '{}')
        if (data['@type'] === 'JobPosting') {
          return {
            platform: 'successfactors',
            url,
            title: data.title ?? '',
            company: data.hiringOrganization?.name ?? new URL(url).hostname,
            location: data.jobLocation?.[0]?.address?.addressLocality ?? 'Unknown',
            description: (data.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            scrapedAt: Date.now(),
          }
        }
      } catch { /* skip */ }
    }

    // 2. SF-specific selectors (varies by version / tenant theming)
    const title =
      doc.querySelector('[class*="jobTitle"] h1, [data-automation="jobTitle"], h1[class*="title"]')?.textContent?.trim()
      || doc.querySelector('h1')?.textContent?.trim()

    const company =
      doc.querySelector('[class*="companyName"], [data-automation="companyName"]')?.textContent?.trim()
      || new URL(url).hostname.split('.')[0]

    const location =
      doc.querySelector('[class*="jobLocation"], [data-automation="jobLocation"], [class*="location"]')?.textContent?.trim()

    const descEl =
      doc.querySelector('[class*="jobDesc"], #JD_DESCRIPTION, [class*="jobDescription"], [class*="job-description"]')
    const description = (descEl as HTMLElement | null)?.innerText?.trim()
      || (doc.querySelector('main') as HTMLElement | null)?.innerText?.trim()

    if (!title || !description) return null

    return {
      platform: 'successfactors',
      url,
      title,
      company: company || 'Unknown',
      location: location || 'Unknown',
      description,
      scrapedAt: Date.now(),
    }
  },
}
