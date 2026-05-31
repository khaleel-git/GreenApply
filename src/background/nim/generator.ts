import { nimStream } from './client'
import { NIM_MODELS, TOKEN_BUDGETS, JOB_DESCRIPTION_MAX_CHARS } from '../../constants/models'
import type { MatchResult, JobListing, ResumeProfile } from '../../types'

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export async function* streamCoverLetter(
  job: JobListing,
  match: MatchResult,
  profile: ResumeProfile,
): AsyncGenerator<string> {
  const matchedSkills = match.skillGap.matched.slice(0, 10).join(', ')
  const jobDesc = truncate(job.description, JOB_DESCRIPTION_MAX_CHARS)
  const resumeSummary = [
    `Candidate: ${profile.seniority} level, ${profile.totalExperienceYears.toFixed(1)} years experience`,
    `Skills: ${profile.skills.slice(0, 15).join(', ')}`,
    `Languages: ${profile.languages.map(l => `${l.language} ${l.level}`).join(', ')}`,
    profile.domains.length > 0 ? `Domains: ${profile.domains.join(', ')}` : null,
  ].filter(Boolean).join('\n')

  const systemPrompt = [
    'You are an expert cover letter writer for tech professionals in Germany.',
    'Write a professional, specific, non-generic cover letter.',
    'Reference the candidate\'s actual skills and experience.',
    'Reference the specific role and company by name.',
    'Keep it under 350 words. No placeholders like [Your Name] — write as if from the candidate.',
    'Do not use cliché phrases like "I am writing to express my interest".',
    'Output only the cover letter text, no subject line or header.',
  ].join(' ')

  const userPrompt = [
    `Job: ${job.title} at ${job.company} (${job.location})`,
    `Job description excerpt:\n${jobDesc}`,
    `\nCandidate profile:\n${resumeSummary}`,
    `\nMatched skills for this role: ${matchedSkills}`,
    '\nWrite the cover letter:',
  ].join('\n')

  yield* nimStream({
    model: NIM_MODELS.coverLetter,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: TOKEN_BUDGETS.coverLetter.maxOutput,
  })
}
