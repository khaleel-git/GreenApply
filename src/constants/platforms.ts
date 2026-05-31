export const PLATFORM_URL_PATTERNS: Record<string, RegExp[]> = {
  linkedin: [/linkedin\.com\/jobs\/view\//i, /linkedin\.com\/jobs\/search\//i],
  indeed: [/indeed\.(com|de|co\.uk)\/viewjob/i, /indeed\.(com|de)\/rc\/clk/i, /indeed\.(com|de)\/pagead/i],
  glassdoor: [/glassdoor\.(com|de)\/job-listing\//i, /glassdoor\.(com|de)\/Jobs\//i],
  stepstone: [/stepstone\.de\/stellenangebote\//i, /stepstone\.de\/stellenanzeige\//i],
  greenhouse: [/boards\.greenhouse\.io\//i, /greenhouse\.io\/embed\/job/i],
  lever: [/jobs\.lever\.co\//i],
  workday: [/myworkdayjobs\.com\//i, /workday\.com\/.*\/jobs\//i],
  ashby: [/jobs\.ashbyhq\.com\//i, /ashbyhq\.com\/embed\//i],
  personio: [/personio\.(de|com)\/job\//i, /jobs\.personio\.(de|com)\//i],
}

export const LINKEDIN_SELECTORS = {
  jobTitle: 'h1.t-24, [data-test="job-details-title"], .job-details-jobs-unified-top-card__job-title h1',
  company: '[data-test="job-details-company"], .job-details-jobs-unified-top-card__company-name a',
  location: '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
  description: '#job-details, .jobs-description__container',
  postedDate: 'span.job-details-jobs-unified-top-card__posted-date, time[datetime]',
}

export const GREENHOUSE_SELECTORS = {
  jobTitle: 'h1.app-title, h1[class*="title"]',
  company: '.company-name, [class*="company"]',
  location: '.location, [class*="location"]',
  description: '#content, [class*="content"], .job-post-content',
}

export const LEVER_SELECTORS = {
  jobTitle: 'h2.posting-headline--title, .posting-headline h2',
  company: '.main-header-logo img[alt]',
  location: '.posting-category-title:first-of-type',
  description: '.posting-description, [class*="posting-requirements"]',
}

export const WORKDAY_SELECTORS = {
  jobTitle: '[data-automation-id="jobPostingHeader"] h2, h2[class*="css"][class*="title"]',
  description: '[data-automation-id="jobPostingDescription"]',
  location: '[data-automation-id="locations"]',
}
