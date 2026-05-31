import type { DetectedPlatform } from '../../types'

export interface IPlatformDetector {
  platform: DetectedPlatform
  isJobPage(url: string, document: Document): boolean
  getJobContainerSelector(): string
}
