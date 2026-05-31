import type { IPlatformDetector } from './detector.interface'

export const linkedinDetector: IPlatformDetector = {
  platform: 'linkedin',
  isJobPage: (url: string) => /linkedin\.com\/jobs\/view\//i.test(url),
  getJobContainerSelector: () =>
    '#job-details, .jobs-description__container, [data-test="job-details-content"]',
}
