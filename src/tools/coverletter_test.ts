import { streamCoverLetter } from '../background/nim/generator'

// Minimal mocks for chrome.storage used by nim/client.getApiKey()
// Read NVIDIA API key from environment variable NIM_KEY for local testing.
;(globalThis as any).chrome = (globalThis as any).chrome ?? { storage: { local: { get: async (k: string) => ({ nvidiaApiKey: process.env.NIM_KEY }) } } }

async function run() {
  const job = {
    title: 'Working Student (m/f/d) in Project Management - ERP Migration',
    company: 'X-FAB Sarawak',
    location: 'Erfurt, Germany',
    description: `Support the Project Management team within the scope of a company-wide ERP migration...`,
    url: 'https://example.com/job/werkstudent-erp',
  }

  const profile = {
    seniority: 'student',
    totalExperienceYears: 2.5,
    skills: ['Python', 'Project Management'],
    languages: [{ language: 'German', level: 'B2' }, { language: 'English', level: 'C1' }],
    domains: ['Backend'],
    experience: [
      { title: 'Software Engineer', company: 'Ericsson', startDate: '2021-01', endDate: '2023-07', bullets: [] },
    ],
    raw: '',
    fileName: 'resume.pdf',
    fileType: 'pdf',
    uploadedAt: Date.now(),
    parsedBy: 'deterministic',
    skills: ['Python'],
    industries: [],
    totalExperienceYears: 2.5,
    domains: [],
    education: [],
    experience: [],
    languages: [],
    certifications: [],
  } as any

  console.log('Starting cover-letter test (will call NIM). Ensure NIM_KEY env var is set.')
  try {
    for await (const chunk of streamCoverLetter(job as any, { skillGap: { matched: [] } } as any, profile)) {
      process.stdout.write(chunk)
    }
    console.log('\n\nCover letter generation completed.')
  } catch (err) {
    console.error('Error during generation:', err)
  }
}

run()
