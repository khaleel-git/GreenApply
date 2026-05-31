import { nimComplete } from './client'
import { NIM_MODELS, TOKEN_BUDGETS } from '../../constants/models'
import type { MatchResult } from '../../types'

export async function generateScoreExplanation(match: MatchResult): Promise<string> {
  const { score, skillGap, hardFilters, breakdown } = match

  const prompt = [
    `Score: ${score}/100`,
    skillGap.matched.length > 0 ? `Matched skills: ${skillGap.matched.slice(0, 8).join(', ')}` : null,
    skillGap.missing.length > 0 ? `Missing skills: ${skillGap.missing.slice(0, 5).join(', ')}` : null,
    skillGap.languageGaps.some(g => !g.met)
      ? `Language gaps: ${skillGap.languageGaps.filter(g => !g.met).map(g => `${g.language} (required ${g.required}, has ${g.actual ?? 'none'})`).join(', ')}`
      : null,
    hardFilters.length > 0 ? `Hard filters: ${hardFilters.map(f => f.message).join(' | ')}` : null,
    `Visa compatibility: ${breakdown.visaCompatibility}/100`,
    `Location score: ${breakdown.location}/100`,
  ].filter(Boolean).join('\n')

  const text = await nimComplete({
    model: NIM_MODELS.scoreExplainer,
    messages: [
      {
        role: 'system',
        content: 'You are a job-fit analyst. The score is already calculated deterministically. Write a 2–3 sentence plain-English explanation of why the candidate scored this way. Be specific and mention concrete factors. Do not recalculate or second-guess the score.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: TOKEN_BUDGETS.scoreExplanation.maxOutput,
  })

  return text.trim()
}
