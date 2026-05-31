import type { IPlatformDetector } from './detector.interface'
export const monsterDetector: IPlatformDetector = {
  platform: 'monster',
  isJobPage: (url) => /monster\.(de|com|at|ch)\/jobs?\//i.test(url)
    && !/monster\.(de|com|at|ch)\/(jobs?\/search|jobs?\/browse)/i.test(url),
  getJobContainerSelector: () => '[class*="job-description"], #job-description, .des-section',
}
