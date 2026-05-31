import type { IPlatformDetector } from './detector.interface'

export const tuberlinDetector: IPlatformDetector = {
  platform: 'tuberlin',
  // Individual job page: /en/job-postings/204511
  isJobPage: (url: string) => /jobs\.tu-berlin\.de\/(?:[a-z]{2}\/)?job-postings\/\d+/.test(url),
  getJobContainerSelector: () => 'main, article, [class*="job"], [class*="posting"], .content',
}
