import type { IPlatformDetector } from './detector.interface'
export const personioDetector: IPlatformDetector = {
  platform: 'personio',
  isJobPage: (url) => /personio\.(de|com)\/job\//i.test(url) || /jobs\.personio\.(de|com)\//i.test(url),
  getJobContainerSelector: () => 'main, [class*="job-description"]',
}
