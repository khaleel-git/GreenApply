import type { RawJobData, JobListing } from '../../types'
import { saveJob, jobExists } from '../db/jobs.store'
import { saveExtraction, getExtraction } from '../db/extractions.store'
import { runExtractionPipeline } from '../extraction/pipeline'
import { fingerprintJob } from '../../shared/utils/fingerprint'
import { incrementMetric } from '../db/metrics.store'

export async function handleJobDetected(raw: RawJobData): Promise<{ jobId: string; isNew: boolean }> {
  const jobId = await fingerprintJob(raw.company, raw.title, raw.location)

  // Check duplicate
  const exists = await jobExists(jobId)

  const job: JobListing = {
    id: jobId,
    url: raw.url,
    platform: raw.platform,
    title: raw.title,
    company: raw.company,
    location: raw.location,
    description: raw.description,
    isDuplicate: exists,
    scrapedAt: raw.scrapedAt,
  }

  await saveJob(job)
  await incrementMetric('jobsViewed')

  // Check extraction cache — skip if already extracted
  const cached = await getExtraction(jobId)
  if (!cached) {
    const extraction = await runExtractionPipeline({ ...raw })
    const result = { ...extraction, jobId }
    await saveExtraction(result)
    await incrementMetric('jobsAnalyzed')
  }

  return { jobId, isNew: !exists }
}
