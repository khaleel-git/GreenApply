import type { IPlatformDetector } from './detector.interface'
export const workwiseDetector: IPlatformDetector = {
  platform: 'workwise',
  isJobPage: (url) => /workwise\.io\/(jobs?|angebote)\/.+/i.test(url)
    || /campusjaeger\.de\/(jobs?|angebote)\/.+/i.test(url),
  getJobContainerSelector: () => '[class*="job-description"], [class*="description"], main',
}
