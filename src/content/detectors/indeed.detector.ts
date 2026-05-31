import type { IPlatformDetector } from './detector.interface'
export const indeedDetector: IPlatformDetector = {
  platform: 'indeed',
  isJobPage: (url) => /indeed\.(com|de|co\.uk)\/(viewjob|rc\/clk|pagead)/i.test(url),
  getJobContainerSelector: () => '#jobDescriptionText, [id*="jobDescription"]',
}
