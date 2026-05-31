import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'GreenApply',
  version: '0.1.0',
  description: 'Know before you apply. Instant job-fit scoring for international students in Germany.',
  permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
  host_permissions: [
    // Job boards — original
    'https://*.linkedin.com/*',
    'https://*.indeed.com/*',
    'https://*.glassdoor.com/*',
    'https://*.glassdoor.de/*',
    'https://*.stepstone.de/*',
    'https://*.fetchjobs.co/*',
    'https://fetchjobs.co/*',
    'https://boards.greenhouse.io/*',
    'https://jobs.lever.co/*',
    'https://*.myworkdayjobs.com/*',
    'https://jobs.ashbyhq.com/*',
    'https://*.personio.de/*',
    'https://www.jobs.tu-berlin.de/*',
    // ATS platforms
    'https://*.successfactors.com/*',
    'https://*.successfactors.eu/*',
    'https://*.taleo.net/*',
    'https://*.bamboohr.com/*',
    'https://*.icims.com/*',
    'https://*.recruitee.com/*',
    'https://*.softgarden.de/*',
    'https://*.softgarden.io/*',
    'https://*.smartrecruiters.com/*',
    'https://*.greenhouse.io/*',
    'https://*.lever.co/*',
    'https://*.workday.com/*',
    'https://*.ashbyhq.com/*',
    // German & student job boards
    'https://*.xing.com/*',
    'https://*.jobteaser.com/*',
    'https://*.absolventa.de/*',
    'https://*.workwise.io/*',
    'https://*.campusjaeger.de/*',
    'https://*.join.com/*',
    'https://*.monster.de/*',
    'https://*.monster.com/*',
    'https://*.jobware.de/*',
    // NIM API
    'https://integrate.api.nvidia.com/*',
  ],
  optional_host_permissions: ['*://*/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        // Original job boards
        'https://*.linkedin.com/*',
        'https://*.indeed.com/*',
        'https://*.glassdoor.com/*',
        'https://*.glassdoor.de/*',
        'https://*.stepstone.de/*',
        'https://*.fetchjobs.co/*',
        'https://fetchjobs.co/*',
        'https://boards.greenhouse.io/*',
        'https://jobs.lever.co/*',
        'https://*.myworkdayjobs.com/*',
        'https://jobs.ashbyhq.com/*',
        'https://*.personio.de/*',
        'https://www.jobs.tu-berlin.de/*',
        // ATS platforms
        'https://*.successfactors.com/*',
        'https://*.successfactors.eu/*',
        'https://*.taleo.net/*',
        'https://*.bamboohr.com/*',
        'https://*.icims.com/*',
        'https://*.recruitee.com/*',
        'https://*.softgarden.de/*',
        'https://*.softgarden.io/*',
        'https://jobs.smartrecruiters.com/*',
        // German & student job boards
        'https://*.xing.com/*',
        'https://*.jobteaser.com/*',
        'https://*.absolventa.de/*',
        'https://*.workwise.io/*',
        'https://*.join.com/*',
        'https://*.monster.de/*',
        'https://*.monster.com/*',
        'https://*.jobware.de/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  // Make built chunks loadable by the content script when it is injected at
  // runtime (chrome.scripting.executeScript) on company career pages. The crxjs
  // loader does `import(chrome.runtime.getURL('assets/…'))`; that dynamic import
  // is gated by web_accessible_resources. Without an all-origins entry the chunks
  // are only reachable on the named job-board origins, so the overlay never
  // mounts on a company's own career site even after the user activates it.
  web_accessible_resources: [
    {
      matches: ['*://*/*'],
      resources: ['assets/*'],
    },
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  options_page: 'src/options/index.html',
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
})
