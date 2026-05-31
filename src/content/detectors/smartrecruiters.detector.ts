import type { IPlatformDetector } from './detector.interface'
export const smartrecruitersDetector: IPlatformDetector = {
  platform: 'smartrecruiters',
  isJobPage: (url) => /jobs\.smartrecruiters\.com\/(job|[^/]+\/[^/]+$)/i.test(url),
  getJobContainerSelector: () => '.job-description, [class*="job-description"], [data-testid*="description"]',
}
