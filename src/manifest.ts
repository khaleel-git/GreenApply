import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'GreenApply',
  version: '0.1.0',
  description: 'Know before you apply. Instant job-fit scoring for international students in Germany.',
  permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
  host_permissions: [
    'https://*.linkedin.com/*',
    'https://*.indeed.com/*',
    'https://*.glassdoor.com/*',
    'https://*.glassdoor.de/*',
    'https://*.stepstone.de/*',
    'https://boards.greenhouse.io/*',
    'https://jobs.lever.co/*',
    'https://*.myworkdayjobs.com/*',
    'https://jobs.ashbyhq.com/*',
    'https://*.personio.de/*',
  ],
  optional_host_permissions: ['*://*/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://*.linkedin.com/*',
        'https://*.indeed.com/*',
        'https://*.glassdoor.com/*',
        'https://*.glassdoor.de/*',
        'https://*.stepstone.de/*',
        'https://boards.greenhouse.io/*',
        'https://jobs.lever.co/*',
        'https://*.myworkdayjobs.com/*',
        'https://jobs.ashbyhq.com/*',
        'https://*.personio.de/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
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
