import type { IPlatformDetector } from './detector.interface'

export const fetchjobsDetector: IPlatformDetector = {
  platform: 'fetchjobs',

  isJobPage(url: string, document: Document): boolean {
    const urlLower = url.toLowerCase()
    if (/fetchjobs\.co\/job-description-/i.test(urlLower)) return true

    const bodyText = document.body?.innerText ?? ''
    const hasTitle = Boolean(document.querySelector('h1, h2'))
    const hasJobSignals = /(?:about the job|your responsibilities|your profile|qualifikation|qualifications|requirements|apply|bewerbung)/i.test(bodyText)
    return hasTitle && bodyText.length > 500 && hasJobSignals
  },

  getJobContainerSelector(): string {
    return 'main, article, [role="main"], .job-description, [class*="description"], [class*="content"]'
  },
}
