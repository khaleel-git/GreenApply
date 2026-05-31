import type { FormQuestion, ApplicationAnswer } from '../../types'
import { getProfile } from '../db/profile.store'
import { getJob } from '../db/jobs.store'
import { getMatch } from '../db/matches.store'
import { generateApplicationAnswers } from '../nim/application-qa'

export async function handleApplicationQA(
  questions: FormQuestion[],
): Promise<ApplicationAnswer[]> {
  const profile = await getProfile()
  if (!profile) return []

  // Retrieve job context — the background stored the last job ID when it was detected
  const { lastJobId } = await chrome.storage.local.get('lastJobId') as { lastJobId?: string }

  let jobContext = { title: '', company: '', description: '', matchedSkills: [] as string[] }

  if (lastJobId) {
    const [job, match] = await Promise.all([
      getJob(lastJobId),
      getMatch(lastJobId),
    ])
    if (job) {
      jobContext = {
        title:         job.title,
        company:       job.company,
        description:   job.description,
        matchedSkills: match?.skillGap.matched ?? [],
      }
    }
  }

  return generateApplicationAnswers(questions, profile, jobContext)
}
