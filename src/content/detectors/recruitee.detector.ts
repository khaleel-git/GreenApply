import type { IPlatformDetector } from './detector.interface'
export const recruiteeDetector: IPlatformDetector = {
  platform: 'recruitee',
  isJobPage: (url) => /\.recruitee\.com\/(o|careers)\/.+/i.test(url),
  getJobContainerSelector: () => '[class*="job-body"], [class*="offer-body"], .offer-description',
}
