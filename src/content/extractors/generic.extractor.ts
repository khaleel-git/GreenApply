import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'

function getTextFromSelectors(doc: Document, selectors: string[]): string {
  for (const sel of selectors) {
    const el = doc.querySelector(sel)
    if (el?.textContent?.trim()) return el.textContent.trim()
  }
  return ''
}

function getLargestTextBlock(doc: Document): string {
  const candidates = doc.querySelectorAll('article, main, section, div[class*="description"], div[class*="content"], div[class*="job"]')
  let best = ''
  for (const el of candidates) {
    const text = (el as HTMLElement).innerText?.trim() ?? ''
    if (text.length > best.length && text.length < 50_000) best = text
  }
  if (!best) best = doc.body?.innerText?.slice(0, 10_000) ?? ''
  return best
}

function extractFromJsonLdTag(doc: Document): Partial<RawJobData> {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent ?? '{}')
      const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data]
      const job = items.find((i: { '@type'?: string }) => i['@type'] === 'JobPosting')
      if (job) {
        const org = job.hiringOrganization
        const loc = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation
        return {
          title: job.title ?? '',
          company: typeof org === 'object' ? (org?.name ?? '') : '',
          location: loc?.address?.addressLocality ?? loc?.address?.addressCountry ?? '',
          description: (job.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        }
      }
    } catch { /* skip */ }
  }
  return {}
}

export const genericExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    // JSON-LD first
    const ld = extractFromJsonLdTag(doc)

    const title = ld.title
      || getTextFromSelectors(doc, ['h1', '[itemprop="title"]', '[class*="job-title"]', '[class*="position-title"]'])
    const company = ld.company
      || getTextFromSelectors(doc, ['[itemprop="hiringOrganization"]', '[class*="company-name"]', '[class*="employer"]'])
    const location = ld.location
      || getTextFromSelectors(doc, ['[itemprop="jobLocation"]', '[class*="location"]', '[class*="city"]'])
    const description = ld.description || getLargestTextBlock(doc)

    if (!title || !description) return null

    return {
      platform: 'generic',
      url,
      title,
      company: company || new URL(url).hostname.replace('www.', ''),
      location: location || 'Unknown',
      description,
      scrapedAt: Date.now(),
    }
  },
}
