import type { IPlatformDetector } from './detector.interface'
export const leverDetector: IPlatformDetector = {
  platform: 'lever',
  isJobPage: (url) => /jobs\.lever\.co\//i.test(url),
  getJobContainerSelector: () => '.posting-description, .section-wrapper',
}
