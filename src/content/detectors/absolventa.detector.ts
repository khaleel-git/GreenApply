import type { IPlatformDetector } from './detector.interface'
export const absolventaDetector: IPlatformDetector = {
  platform: 'absolventa',
  isJobPage: (url) => /absolventa\.de\/(jobs|praktika|stellenangebote)\/.+/i.test(url),
  getJobContainerSelector: () => '[class*="job-detail"], [class*="jobDetail"], .job-description',
}
