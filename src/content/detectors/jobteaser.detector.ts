import type { IPlatformDetector } from './detector.interface'
export const jobteaserDetector: IPlatformDetector = {
  platform: 'jobteaser',
  isJobPage: (url) => /jobteaser\.com\/[a-z-]+\/jobs\//i.test(url),
  getJobContainerSelector: () => '[class*="job-description"], [class*="jobDescription"], .offer-description',
}
