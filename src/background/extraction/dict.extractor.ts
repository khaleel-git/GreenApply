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

function buildSkillRegex(skill: string): RegExp {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\./g, '\\.')
  return new RegExp(`\\b${escaped}\\b`, 'i')
}

function isNiceToHave(text: string, matchIndex: number): boolean {
  const window = text.substring(Math.max(0, matchIndex - 200), matchIndex).toLowerCase()
  return NICE_TO_HAVE_KEYWORDS.some(kw => window.includes(kw))
}

export function extractSkills(text: string): { required: string[]; niceToHave: string[] } {
  const required: string[] = []
  const niceToHave: string[] = []

  for (const skill of TECH_SKILLS) {
    const rx = buildSkillRegex(skill)
    const match = rx.exec(text)
    if (match) {
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
