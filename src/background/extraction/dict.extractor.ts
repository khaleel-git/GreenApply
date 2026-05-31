const TECH_SKILLS: string[] = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Node.js', 'Express', 'FastAPI', 'Django', 'Flask',
  'Spring', 'Spring Boot', '.NET', 'Laravel',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite', 'DynamoDB', 'Cassandra',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Helm', 'Pulumi',
  'AWS', 'GCP', 'Azure', 'Cloudflare', 'Heroku', 'DigitalOcean',
  'Git', 'GitHub', 'GitLab', 'CI/CD', 'Jenkins', 'GitHub Actions', 'CircleCI',
  'REST', 'GraphQL', 'gRPC', 'WebSockets', 'OpenAPI',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy',
  'Spark', 'Kafka', 'Airflow', 'dbt', 'Snowflake', 'BigQuery',
  'Linux', 'Bash', 'Shell', 'PowerShell',
  'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
  'Jira', 'Confluence', 'Notion', 'Slack', 'Agile', 'Scrum', 'Kanban',
  'Salesforce', 'SAP', 'Workday',
  'HTML', 'CSS', 'SCSS', 'Tailwind', 'Bootstrap',
  'React Native', 'Flutter', 'iOS', 'Android',
]

const NICE_TO_HAVE_KEYWORDS = [
  'nice to have', 'nice-to-have', 'preferred', 'plus', 'bonus', 'advantage', 'beneficial',
  'von vorteil', 'wünschenswert', 'wäre toll', 'ideal',
]

// A skill mention is only trusted when nearby text signals it's a requirement.
// This prevents false positives from page navigation, sidebar job-category links,
// and ATS boilerplate that mention tools unrelated to the job's actual requirements.
const SKILL_CONTEXT_RE = /\b(required?|mandatory|must[\s-]have|experience|proficient|proficiency|knowledge|familiar|expertise|work(?:ing)?\s+with|use[sd]?|using|skill|background|tool|technolog|software|stack|platform|suite|Kenntnisse|Erfahrung|Umgang|erforderlich|notwendig|beherrschen|vorausgesetzt|Vorkenntnisse|Kompetenz)\b/i

function buildSkillRegex(skill: string): RegExp {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\./g, '\\.')
  return new RegExp(`\\b${escaped}\\b`, 'i')
}

function isNiceToHave(text: string, matchIndex: number): boolean {
  const window = text.substring(Math.max(0, matchIndex - 200), matchIndex).toLowerCase()
  return NICE_TO_HAVE_KEYWORDS.some(kw => window.includes(kw))
}

function hasSkillContext(text: string, matchIndex: number): boolean {
  // Check a 350-char window around the match for requirement-signaling words.
  // Isolated mentions in navigation/footer won't have these nearby.
  const window = text.slice(Math.max(0, matchIndex - 350), matchIndex + 150)
  return SKILL_CONTEXT_RE.test(window)
}

export function extractSkills(text: string): { required: string[]; niceToHave: string[] } {
  const required: string[] = []
  const niceToHave: string[] = []

  for (const skill of TECH_SKILLS) {
    const rx = buildSkillRegex(skill)
    const match = rx.exec(text)
    if (match) {
      if (!hasSkillContext(text, match.index)) continue  // no requirements context → skip
      if (isNiceToHave(text, match.index)) {
        niceToHave.push(skill)
      } else {
        required.push(skill)
      }
    }
  }

  return { required, niceToHave }
}

export { TECH_SKILLS }
