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
    'https://www.jobs.tu-berlin.de/*',
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
        'https://www.jobs.tu-berlin.de/*',
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
