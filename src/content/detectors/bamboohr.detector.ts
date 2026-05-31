import type { IPlatformDetector } from './detector.interface'
export const bamboohrDetector: IPlatformDetector = {
  platform: 'bamboohr',
  isJobPage: (url) => /\.bamboohr\.com\/careers\/.+|bamboohr\.com\/jobs\//i.test(url),
  getJobContainerSelector: () => '.BambooHR-ATS-body, #description, [class*="description"]',
}
