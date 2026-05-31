import type { IPlatformDetector } from './detector.interface'
export const stepstoneDetector: IPlatformDetector = {
  platform: 'stepstone',
  isJobPage: (url) => /stepstone\.de\/(stellenangebote|stellenanzeige)\//i.test(url),
  getJobContainerSelector: () => '[class*="listing-content"], article',
}
