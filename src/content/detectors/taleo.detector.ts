import type { IPlatformDetector } from './detector.interface'
export const taleoDetector: IPlatformDetector = {
  platform: 'taleo',
  isJobPage: (url) => /\.taleo\.net\/(careersection|ftl).*requisition/i.test(url),
  getJobContainerSelector: () => '#JD_DESCRIPTION, .requisition-content, .req-description',
}
