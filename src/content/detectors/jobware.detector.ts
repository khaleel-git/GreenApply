import type { IPlatformDetector } from './detector.interface'
export const jobwareDetector: IPlatformDetector = {
  platform: 'jobware',
  isJobPage: (url) => /jobware\.de\/(stellenangebote|job)\/.+/i.test(url),
  getJobContainerSelector: () => '[class*="job-description"], [class*="jobDescription"], .job-ad-text',
}
