import type { IPlatformDetector } from './detector.interface'
export const workdayDetector: IPlatformDetector = {
  platform: 'workday',
  isJobPage: (url) => /myworkdayjobs\.com/i.test(url),
  getJobContainerSelector: () => '[data-automation-id="jobPostingDescription"]',
}
