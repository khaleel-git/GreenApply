import type { IPlatformDetector } from './detector.interface'
export const icimsDetector: IPlatformDetector = {
  platform: 'icims',
  isJobPage: (url) => /\.icims\.com\/jobs\/\d+/i.test(url),
  getJobContainerSelector: () => '.iCIMS_JobContent, #iCIMS_Content, [class*="job-content"]',
}
