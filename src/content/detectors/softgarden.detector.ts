import type { IPlatformDetector } from './detector.interface'
export const softgardenDetector: IPlatformDetector = {
  platform: 'softgarden',
  isJobPage: (url) => /\.softgarden\.(de|io)\/(job|jobad)\//i.test(url)
    || /api\.softgarden\.de\/api\/job/i.test(url),
  getJobContainerSelector: () => '[class*="job-description"], [class*="jobDescription"], .job-content',
}
