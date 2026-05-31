import type { IPlatformDetector } from './detector.interface'
export const joinDetector: IPlatformDetector = {
  platform: 'join',
  isJobPage: (url) => /join\.com\/companies\/.+\/jobs\//i.test(url),
  getJobContainerSelector: () => '[class*="job-description"], [class*="description"], article',
}
