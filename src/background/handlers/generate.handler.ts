import { streamCoverLetter } from '../nim/generator'
import { getJob } from '../db/jobs.store'
import { getMatch } from '../db/matches.store'
import { getProfile } from '../db/profile.store'

export async function handleGenerateCoverLetter(
  jobId: string,
  port: chrome.runtime.Port,
): Promise<void> {
  const [job, match, profile] = await Promise.all([
    getJob(jobId),
    getMatch(jobId),
    getProfile(),
  ])

  if (!job || !match || !profile?.resume) {
    port.postMessage({ type: 'GENERATION_CHUNK', token: 'Upload your resume first to generate a cover letter.', done: true })
    return
  }

  try {
    for await (const token of streamCoverLetter(job, match, profile.resume)) {
      port.postMessage({ type: 'GENERATION_CHUNK', token, done: false })
      // Check if port is still open
    }
    port.postMessage({ type: 'GENERATION_CHUNK', token: '', done: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    port.postMessage({ type: 'GENERATION_CHUNK', token: `Error: ${msg}`, done: true })
  }
}
