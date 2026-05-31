import type { RawJobData } from '../../types'

export interface IPlatformExtractor {
  extract(document: Document, url: string): RawJobData | null
}
