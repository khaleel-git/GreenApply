import { nimStream } from './client'
import { NIM_MODELS, TOKEN_BUDGETS, JOB_DESCRIPTION_MAX_CHARS } from '../../constants/models'
import { queryResumeIndex } from './vectorstore'
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

  // Pull relevant resume passages from the vector index
  const vectorQuery = `${job.title} at ${job.company}: ${job.description.slice(0, 400)}`
  const relevantExcerpts = await queryResumeIndex(vectorQuery, 4).catch(() => [] as string[])
  // compute tenure at Ericsson (if present) and friendly total years
  const totalYears = Number.isFinite(profile.totalExperienceYears) ? profile.totalExperienceYears.toFixed(1) : '0.0'
  const ericssonEntries = profile.experience.filter(e => /ericsson/i.test(e.company))
  function yearsBetween(entry: typeof profile.experience[0]) {
    const parse = (s: string) => {
      if (s === 'present') return Date.now()
      const [y, m = '01'] = s.split('-').map(Number)
      return new Date(y, (m || 1) - 1, 1).getTime()
    }
    const start = parse(entry.startDate)
    const end = parse(entry.endDate as string)
    return Math.max(0, (end - start) / (365.25 * 24 * 60 * 60 * 1000))
  }
  const ericssonYears = ericssonEntries.length > 0
    ? Math.round(ericssonEntries.reduce((s, e) => s + yearsBetween(e), 0) * 10) / 10
    : 0

  const resumeSummary = [
    `Candidate: ${profile.seniority} level, ${totalYears} years experience`,
    ericssonYears > 0 ? `Tenure at Ericsson: ${ericssonYears} years` : null,
    `Skills: ${profile.skills.slice(0, 15).join(', ')}`,
    `Languages: ${profile.languages.map(l => `${l.language} ${l.level}`).join(', ')}`,
    profile.domains.length > 0 ? `Domains: ${profile.domains.join(', ')}` : null,
  ].filter(Boolean).join('\n')

  const seniority = profile.seniority
  const seniorityNote = (seniority === 'student' || seniority === 'junior' || seniority === 'mid')
    ? `The candidate is ${seniority}-level — do NOT use words like "seasoned", "veteran", "extensive career", or any phrase implying long-term seniority.`
    : ''

  const systemPrompt = [
    'You are an expert cover letter writer for tech professionals in Germany.',
    'Write a professional, specific, non-generic cover letter.',
    'Reference the candidate\'s actual skills and experience — especially the specific achievements and projects in the "Relevant resume excerpts" section.',
    'Reference the specific role and company by name.',
    'Keep it under 380 words. No placeholders like [Your Name] — write as if from the candidate.',
    'Do not use cliché phrases like "I am writing to express my interest".',
    'Use only the exact years explicitly provided in the Candidate profile. Do not invent or inflate experience.',
    'The years value in "Resume total years" is authoritative — never infer a different year count from the job history.',
    'If the profile summary contains a `Tenure at Ericsson` value, use that per-company tenure for Ericsson and not the aggregate.',
    seniorityNote,
    'Include a motivation paragraph that connects the candidate\'s background to this specific role and company.',
    'Output only the cover letter text, no subject line or header.',
  ].filter(Boolean).join(' ')

  const userPrompt = [
    `Job: ${job.title} at ${job.company} (${job.location})`,
    `Job description excerpt:\n${jobDesc}`,
    `\nCandidate profile:\n${resumeSummary}`,
    `\nResume total years: ${totalYears}`,
    `Ericsson tenure years: ${ericssonYears}`,
    `\nMatched skills for this role: ${matchedSkills}`,
    relevantExcerpts.length > 0
      ? `\nRelevant resume excerpts (use these for specific achievements and skills):\n${relevantExcerpts.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      : '',
    '\nWrite the cover letter:',
  ].filter(Boolean).join('\n')

  yield* nimStream({
    model: NIM_MODELS.coverLetter,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: TOKEN_BUDGETS.coverLetter.maxOutput,
  })
}
