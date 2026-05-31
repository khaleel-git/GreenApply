import type { IPlatformDetector } from './detector.interface'
export const greenhouseDetector: IPlatformDetector = {
  platform: 'greenhouse',
  isJobPage: (url) => /boards\.greenhouse\.io\/.+\/jobs\/\d+|greenhouse\.io\/embed\/job/i.test(url),
  getJobContainerSelector: () => '#content, .job-post-content',
}
