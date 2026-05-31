import type { IPlatformExtractor } from './extractor.interface'
import type { RawJobData } from '../../types'
import { genericExtractor } from './generic.extractor'

function textOf(doc: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const el = doc.querySelector(selector)
    const text = el?.textContent?.trim()
    if (text) return text
  }
  return ''
}

function bodyText(doc: Document): string {
  const candidates = doc.querySelectorAll('main, article, section, [class*="description"], [class*="content"]')
  let best = ''
  for (const candidate of candidates) {
    const text = (candidate as HTMLElement).innerText?.trim() ?? ''
    if (text.length > best.length) best = text
  }
  return best || (doc.body?.innerText?.trim() ?? '')
}

export const fetchjobsExtractor: IPlatformExtractor = {
  extract(doc: Document, url: string): RawJobData | null {
    const title = textOf(doc, ['h1', 'h2', '[class*="title"]'])
    const company = textOf(doc, ['[class*="company"]', '[class*="employer"]'])
    const location = textOf(doc, ['[class*="location"]', '[class*="place"]'])
    const description = bodyText(doc)

    if (title && description) {
      return {
        platform: 'fetchjobs',
        url,
        title,
        company: company || 'Unknown',
        location: location || 'Unknown',
        description,
        scrapedAt: Date.now(),
      }
    }

    const fallback = genericExtractor.extract(doc, url)
    return fallback ? { ...fallback, platform: 'fetchjobs' } : null
  },
}
