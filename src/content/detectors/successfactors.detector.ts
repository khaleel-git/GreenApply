import type { IPlatformDetector } from './detector.interface'
export const successfactorsDetector: IPlatformDetector = {
  platform: 'successfactors',
  isJobPage: (url) => /successfactors\.(com|eu)\/.*\/(job|jobdetail|career)\b/i.test(url)
    || /career\.sap\.com\/careers\/job/i.test(url),
  getJobContainerSelector: () => '[class*="jobDesc"], [class*="job-description"], #JD_DESCRIPTION, .jd-content',
}
