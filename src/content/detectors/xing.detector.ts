import type { IPlatformDetector } from './detector.interface'
export const xingDetector: IPlatformDetector = {
  platform: 'xing',
  isJobPage: (url) => /xing\.com\/(jobs|stellenangebote)\/.+/i.test(url),
  getJobContainerSelector: () => '[data-testid="job-details"], [class*="job-description"]',
}
