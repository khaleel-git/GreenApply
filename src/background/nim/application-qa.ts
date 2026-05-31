import { nimComplete } from './client'
import { NIM_MODELS, TOKEN_BUDGETS } from '../../constants/models'
import type { FormQuestion, ApplicationAnswer } from '../../types'
import type { UserProfile } from '../../types'

interface JobContext {
  title: string
  company: string
  description: string
  matchedSkills: string[]
}

// ─── Question classifier ─────────────────────────────────────────────────────

type AnswerStrategy =
  | 'ai_motivation'
  | 'enrolled'
  | 'internship_required'
  | 'availability'
  | 'work_permit'
  | 'residence_permit'
  | 'gender'
  | 'disability'
  | 'referral_source'
  | 'profile_sharing'
  | 'skip'

function classify(text: string): AnswerStrategy {
  const t = text.toLowerCase()
  if (/excit|motivat|why.*apply|why.*interest|what.*attract|what.*appeal|begeist|interesse|warum|weshalb/.test(t)) return 'ai_motivation'
  if (/enroll|immatriku|student\s*(status|id|during)|eingeschrieben/.test(t)) return 'enrolled'
  if (/internship.*required|pflichtpraktikum|vorgeschrieben|study.*regulat|studienordnung/.test(t)) return 'internship_required'
  if (/available|availability|period|zeitraum|from.*to|von.*bis|start.*date|begin/.test(t)) return 'availability'
  if (/work\s*permit|arbeitserlaubnis|permission to work|aufenthalts/.test(t) && !/which|welche/.test(t)) return 'work_permit'
  if (/residence\s*permit|aufenthaltstitel|aufenthaltserlaubnis|which.*permit|welche.*erlaubnis/.test(t)) return 'residence_permit'
  if (/gender|geschlecht|identify/.test(t)) return 'gender'
  if (/disabilit|behinderung|einschränkung|assistance.*application|unterstützung/.test(t)) return 'disability'
  if (/aware|hear|erfahren|wie.*kenntnis|source|channel/.test(t)) return 'referral_source'
  if (/consider.*profile|other.*vacanc|anderen.*stellen|weiteren.*positionen|profile.*share/.test(t)) return 'profile_sharing'
  return 'skip'
}

// ─── Profile-based answers ───────────────────────────────────────────────────

const WORK_AUTH_PERMIT: Record<string, string> = {
  citizen:            'EU citizen — no permit required',
  permanent_resident: 'Niederlassungserlaubnis (permanent residence)',
  eu_blue_card:       'EU Blue Card',
  work_permit:        'Work Permit (Aufenthaltserlaubnis)',
  student_visa:       'Student Visa (Aufenthaltserlaubnis zum Studium)',
  needs_sponsorship:  'Currently seeking work authorisation',
}

function answerFromProfile(
  strategy: AnswerStrategy,
  profile: UserProfile,
  q: FormQuestion,
): ApplicationAnswer | null {
  const src = (v: string, s: ApplicationAnswer['source'] = 'profile'): ApplicationAnswer =>
    ({ questionId: q.id, value: v, source: s })

  const isStudent = profile.academic?.degreeLevel?.includes('_student') ?? false

  switch (strategy) {
    case 'enrolled':
      return src(isStudent ? 'Yes' : 'No')

    case 'internship_required':
      // Default No — most internships are voluntary; user can correct
      return src('No', 'default')

    case 'availability': {
      // Suggest: starting next month, lasting ~12 months
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const end   = new Date(now.getFullYear() + 1, now.getMonth() + 1, 1)
      const fmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      return src(`From ${fmt(start)} to ${fmt(end)}`, 'default')
    }

    case 'work_permit': {
      const hasPermit = profile.workAuth !== 'needs_sponsorship'
      // Try to match a select option if available
      if (q.type === 'select' && q.options) {
        const target = hasPermit ? /yes|ja|work permit|erlaubnis/i : /no|nein|not yet/i
        const opt = q.options.find(o => target.test(o))
        if (opt) return src(opt)
      }
      return src(hasPermit ? 'Yes' : 'No')
    }

    case 'residence_permit':
      return src(WORK_AUTH_PERMIT[profile.workAuth] ?? 'Other')

    case 'gender':
      // Sensitive — return empty so the panel shows it as user-must-fill
      return src('', 'default')

    case 'disability':
      return src('No', 'default')

    case 'referral_source': {
      if (q.type === 'select' && q.options) {
        const pref = q.options.find(o => /linkedin|job.*board|online|internet|portal/i.test(o))
        if (pref) return src(pref, 'default')
      }
      return src('Online Job Board', 'default')
    }

    case 'profile_sharing': {
      if (q.type === 'select' && q.options) {
        const yes = q.options.find(o => /yes|ja/i.test(o))
        if (yes) return src(yes, 'default')
      }
      return src('Yes', 'default')
    }

    default:
      return null
  }
}

// ─── AI motivation answer ────────────────────────────────────────────────────

async function generateMotivationAnswer(
  q: FormQuestion,
  profile: UserProfile,
  job: JobContext,
): Promise<string> {
  const skills = [...(profile.skills ?? []), ...(job.matchedSkills)].slice(0, 10).join(', ')
  const field   = profile.academic?.fieldOfStudy ?? ''
  const maxLen  = q.maxLength ? ` Keep the answer under ${q.maxLength} characters.` : ' Keep it under 600 characters.'

  const prompt = `You are filling in a job application for the following role:
Job: ${job.title} at ${job.company}
Job description excerpt: ${job.description.slice(0, 800)}

Candidate profile:
- Field of study: ${field || 'Technology / Computer Science'}
- Skills: ${skills || 'Python, data analysis, software development'}

Write a concise, honest, specific answer to this application question:
"${q.text}"

${maxLen}
Do not start with "I" — vary the opening. Be specific to THIS role and company.
No generic phrases like "I have always been passionate about". Output only the answer text, nothing else.`

  try {
    return await nimComplete({
      model: NIM_MODELS.jobExtractorFallback,
      messages: [
        { role: 'system', content: 'You write concise, genuine job-application answers. Output only the answer text.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: TOKEN_BUDGETS.jobExtraction.maxOutput,
    })
  } catch {
    return ''
  }
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function generateApplicationAnswers(
  questions: FormQuestion[],
  profile: UserProfile,
  job: JobContext,
): Promise<ApplicationAnswer[]> {
  const answers: ApplicationAnswer[] = []

  // Run all AI-requiring questions in parallel; profile-based ones are synchronous
  const aiTasks: Array<{ q: FormQuestion; promise: Promise<string> }> = []

  for (const q of questions) {
    const strategy = classify(q.text)

    if (strategy === 'ai_motivation') {
      aiTasks.push({ q, promise: generateMotivationAnswer(q, profile, job) })
      continue
    }

    const a = answerFromProfile(strategy, profile, q)
    if (a) answers.push(a)
  }

  // Resolve AI tasks
  for (const { q, promise } of aiTasks) {
    const value = await promise
    answers.push({ questionId: q.id, value, source: 'ai' })
  }

  return answers
}
