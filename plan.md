# Green Apply — Implementation Plan

## Product

**GreenApply — Know before you apply.**

A Chrome extension that tells job seekers — especially international students in Germany — whether a job is worth applying for, instantly.

Core promise: **"Skip this job. German C1 required. Sponsorship unavailable. Save your time."**

Works on **any** career page or job listing — LinkedIn, Indeed, Glassdoor, StepStone, Greenhouse, Lever, Workday, Ashby, Personio, and any company career site.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Build | Vite + `@crxjs/vite-plugin` v2 |
| UI | React 19 + TypeScript + Tailwind v4 |
| Extension | Manifest V3 |
| Storage | IndexedDB (`idb`) + `chrome.storage.local` |
| AI | NVIDIA NIM APIs (post-MVP only — no API key required for MVP) |
| PDF parsing | `pdfjs-dist` |
| DOCX parsing | `mammoth` |

**MVP requires zero API key.** Resume parsing, job extraction, and scoring are all deterministic. LLM features (score explanation, cover letter) are unlocked post-MVP when users optionally provide an API key.

---

## File Structure

```
greenapply/
├── manifest.json
├── vite.config.ts
├── tsconfig.json
├── package.json
├── tailwind.config.ts
├── .env.example                        # VITE_NVIDIA_API_KEY placeholder
├── .gitignore
│
├── src/
│   ├── manifest.ts                     # Type-safe manifest source (CRXJS)
│   │
│   ├── types/
│   │   ├── profile.ts                  # UserProfile, ResumeProfile, Preferences
│   │   ├── job.ts                      # JobListing, ExtractionResult, VisaAssessment
│   │   ├── company.ts                  # CompanyProfile (visa likelihood, language, response rate)
│   │   ├── match.ts                    # MatchResult, HardFilter, ScoreBreakdown
│   │   ├── application.ts              # Application, ApplicationStatus, Timeline
│   │   ├── rules.ts                    # UserRule, RuleCondition, RuleAction
│   │   ├── messages.ts                 # Chrome runtime message union types
│   │   └── index.ts
│   │
│   ├── constants/
│   │   ├── platforms.ts                # URL patterns, DOM selectors per platform
│   │   ├── models.ts                   # NVIDIA NIM model names + token budgets
│   │   ├── scoring.ts                  # Weights, thresholds, freshness modifiers
│   │   └── patterns.ts                 # Regex patterns: languages, visa, work auth, employment type
│   │
│   ├── background/
│   │   ├── index.ts                    # Service worker entry
│   │   ├── handlers/
│   │   │   ├── profile.handler.ts      # Save/load/parse resume + UserProfile
│   │   │   ├── job.handler.ts          # Receive raw job, run extraction pipeline, cache
│   │   │   ├── match.handler.ts        # Run hard filters, deterministic score, LLM summary
│   │   │   ├── generate.handler.ts     # Cover letter streaming
│   │   │   └── tracker.handler.ts      # Application CRUD
│   │   ├── scoring/
│   │   │   ├── hard-filters.ts         # Deterministic pre-screen (immediate red/warn)
│   │   │   ├── engine.ts               # Deterministic 0–100 scorer (no LLM)
│   │   │   ├── freshness.ts            # Age-based score modifier
│   │   │   └── weights.ts              # Configurable dimension weights + freshness thresholds
│   │   ├── rules/
│   │   │   ├── engine.ts               # Evaluate UserRules against a MatchResult
│   │   │   └── defaults.ts             # Sensible default rules (auto-skip no-sponsor if needs_sponsorship)
│   │   ├── extraction/
│   │   │   ├── pipeline.ts             # Orchestrates: JSON-LD → regex → dict → LLM fallback
│   │   │   ├── jsonld.extractor.ts     # Parse JobPosting schema fields
│   │   │   ├── regex.extractor.ts      # Pattern match languages, visa, employment type
│   │   │   ├── dict.extractor.ts       # Skill dictionary matching
│   │   │   └── confidence.ts           # Compute per-field confidence scores
│   │   ├── nim/
│   │   │   ├── client.ts               # Fetch wrapper for NVIDIA NIM (stream + batch)
│   │   │   ├── explainer.ts            # LLM generates summary of a pre-computed score
│   │   │   ├── extractor.ts            # LLM fallback when heuristics fail (low confidence)
│   │   │   ├── generator.ts            # Cover letter prompt + streaming
│   │   │   └── resume-parser.ts        # LLM builds ResumeProfile from raw text
│   │   ├── parsers/
│   │   │   ├── pdf.parser.ts           # pdfjs-dist: extract text from PDF
│   │   │   └── docx.parser.ts          # mammoth: extract text from DOCX
│   │   └── db/
│   │       ├── idb.ts                  # Opens DB, defines stores
│   │       ├── profile.store.ts
│   │       ├── jobs.store.ts
│   │       ├── companies.store.ts      # CompanyProfile keyed by normalized company name
│   │       ├── extractions.store.ts    # Cached ExtractionResult keyed by jobId
│   │       ├── matches.store.ts        # Keyed by jobId
│   │       ├── applications.store.ts
│   │       ├── rules.store.ts          # User-defined automation rules
│   │       └── metrics.store.ts        # jobsViewed, applied, rejected, interviews, offers
│   │
│   ├── content/
│   │   ├── index.ts                    # Entry — detects job page, mounts overlay
│   │   ├── feed.ts                     # Injects score badges into job list cards (LinkedIn feed, etc.)
│   │   ├── detectors/
│   │   │   ├── detector.interface.ts
│   │   │   ├── generic.detector.ts     # PRIMARY: JSON-LD + URL heuristic
│   │   │   ├── linkedin.detector.ts
│   │   │   ├── indeed.detector.ts
│   │   │   ├── glassdoor.detector.ts
│   │   │   ├── stepstone.detector.ts
│   │   │   ├── greenhouse.detector.ts
│   │   │   ├── lever.detector.ts
│   │   │   ├── workday.detector.ts
│   │   │   ├── ashby.detector.ts
│   │   │   └── personio.detector.ts
│   │   ├── extractors/
│   │   │   ├── extractor.interface.ts
│   │   │   ├── generic.extractor.ts    # PRIMARY: JSON-LD → microdata → heuristic
│   │   │   ├── linkedin.extractor.ts
│   │   │   ├── indeed.extractor.ts
│   │   │   ├── glassdoor.extractor.ts
│   │   │   ├── stepstone.extractor.ts
│   │   │   ├── greenhouse.extractor.ts
│   │   │   ├── lever.extractor.ts
│   │   │   ├── workday.extractor.ts
│   │   │   ├── ashby.extractor.ts
│   │   │   └── personio.extractor.ts
│   │   ├── observer.ts                 # History patch + MutationObserver for SPAs
│   │   └── shadow-host.ts              # Creates shadow DOM, injects Tailwind CSS
│   │
│   ├── overlay/
│   │   ├── index.tsx                   # React root inside shadow DOM
│   │   ├── Overlay.tsx                 # Main container, receives messages from SW
│   │   └── components/
│   │       ├── ScoreRing.tsx           # Animated SVG score ring (0–100)
│   │       ├── RecommendationBadge.tsx # 🟢🟡🟠🔴 pill
│   │       ├── HardFilterAlert.tsx     # Immediate red warning cards (blocker + warnings)
│   │       ├── JobFreshness.tsx        # "Posted 3 days ago" + freshness penalty warning
│   │       ├── ConfidenceCaveat.tsx    # "Visa policy: unknown — low confidence" notice
│   │       ├── SkillGapList.tsx        # Matched / missing / bonus skills
│   │       ├── RulesBadge.tsx          # Shows which user rule was triggered (Auto-Skip, etc.)
│   │       ├── ActionButtons.tsx       # Save, Track (cover letter is post-core)
│   │       ├── GeneratePanel.tsx       # Streaming cover letter output (Phase 7)
│   │       └── TrackingDropdown.tsx    # Status update dropdown
│   │
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── Popup.tsx                   # Tabs: Dashboard | Jobs | Profile
│   │   └── components/
│   │       ├── Dashboard.tsx           # Stats: applications by status, score histogram
│   │       ├── JobsList.tsx
│   │       ├── ApplicationCard.tsx
│   │       └── StatsBar.tsx            # Applied / Interview / Offer counts
│   │
│   ├── options/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── Options.tsx
│   │   └── components/
│   │       ├── ResumeUpload.tsx        # Drag-and-drop PDF/DOCX
│   │       ├── ProfileForm.tsx         # Name, location, languages, work auth
│   │       ├── PreferencesForm.tsx     # Job types, remote pref, salary
│   │       ├── CompanyBlacklist.tsx    # Excluded companies list (add/remove, shown as hard filter)
│   │       ├── RulesEditor.tsx         # Create/edit/toggle automation rules
│   │       ├── ApiKeyForm.tsx          # NVIDIA API key — optional, unlocks AI features post-MVP
│   │       └── LanguageSettings.tsx    # UI language: EN / DE
│   │
│   └── shared/
│       ├── hooks/
│       │   ├── useStorage.ts           # Reactive chrome.storage.local hook
│       │   ├── useMessages.ts          # Typed chrome.runtime.sendMessage wrapper
│       │   └── useStream.ts            # Consume streaming tokens from background
│       ├── utils/
│       │   ├── score.utils.ts          # scoreToColor(), scoreToLabel()
│       │   ├── text.utils.ts           # truncate(), normalizeText()
│       │   └── date.utils.ts           # timeAgo(), formatDate()
│       └── ui/
│           ├── Button.tsx
│           ├── Badge.tsx
│           ├── Spinner.tsx
│           ├── Tooltip.tsx
│           └── ProgressBar.tsx
│
└── public/
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

---

## Data Models

### ResumeProfile (`types/profile.ts`)

**MVP: parsed entirely with regex + skill dictionary — zero API key needed.**

The LLM resume parser is an optional enhancement (Phase 8, post-MVP) that improves seniority and domain detection. The core fields needed for scoring (skills, languages, experience years) are extracted deterministically.

```typescript
interface ExperienceEntry {
  title: string
  company: string
  startDate: string                   // ISO "YYYY-MM" — required for interval merging
  endDate: string | 'present'
  bullets: string[]
}

interface ResumeProfile {
  raw: string                         // full extracted text
  fileName: string
  fileType: 'pdf' | 'docx'
  uploadedAt: number
  parsedBy: 'deterministic' | 'llm'  // track which parser was used
  skills: string[]                    // regex + dictionary match against SKILLS_DICT
  industries: string[]                // dictionary match against INDUSTRIES_DICT
  seniority: 'student' | 'junior' | 'mid' | 'senior' | 'lead'  // inferred from merged years + keywords
  totalExperienceYears: number        // merged intervals — NOT naive sum (see note below)
  domains: string[]
  education: EducationEntry[]
  experience: ExperienceEntry[]       // raw entries — used for merging, stored separately from derived years
  languages: LanguageEntry[]          // regex: "German B2", "Deutsch C1", "native English"
  certifications: string[]
}
```

**Date range merging is required.** Naive summation of experience entries produces wildly wrong values when entries overlap (freelance + internship + working student all running concurrently). Always merge intervals before summing:

```typescript
// background/parsers/resume.parser.ts
function computeMergedExperienceYears(entries: ExperienceEntry[]): number {
  const intervals = entries
    .map(e => ({ start: parseYearMonth(e.startDate), end: e.endDate === 'present' ? Date.now() : parseYearMonth(e.endDate) }))
    .filter(i => i.start && i.end)
    .sort((a, b) => a.start - b.start)

  let merged = 0
  let cursor = 0
  for (const { start, end } of intervals) {
    if (start > cursor) { merged += end - start; cursor = end }
    else if (end > cursor) { merged += end - cursor; cursor = end }
  }
  return merged / (365.25 * 24 * 60 * 60 * 1000)
}
```

Without merging, a student with a 1-year freelance + 3-month internship + 6-month working student (all overlapping) incorrectly shows 1.75 years instead of 1.0 year.

interface UserProfile {
  id: string
  name: string
  email: string
  location: string
  targetLocations: string[]
  workAuth: 'citizen' | 'permanent_resident' | 'eu_blue_card' | 'work_permit' | 'needs_sponsorship' | 'student_visa'
  resume?: ResumeProfile
  preferences: UserPreferences
  languages: LanguageEntry[]
  createdAt: number
  updatedAt: number
}

interface UserPreferences {
  jobTypes: ('full-time' | 'part-time' | 'internship' | 'werkstudent' | 'freelance')[]
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any'
  minSalaryEur?: number
  excludedCompanies: string[]
  targetRoles: string[]
  targetIndustries: string[]
  uiLanguage: 'en' | 'de'
}
```

### ExtractionResult (`types/job.ts`)

Extraction is a separate step from the raw scrape, cached independently so revisiting a job never re-calls anything.

```typescript
interface VisaAssessment {
  value: true | false | 'unknown'
  confidence: number                  // 0.0–1.0
  evidence: string[]                  // ["We do not sponsor visas", "EU citizen required"]
}

interface ExtractionResult {
  jobId: string
  requiredSkills: string[]
  niceToHaveSkills: string[]
  requiredLanguages: LanguageRequirement[]
  requiredExperienceYears?: number    // extracted from "5+ years", "minimum 3 years experience"
  visa: VisaAssessment                // richer than boolean — carries evidence text
  employmentType: string
  remote: boolean | 'hybrid'
  salary?: SalaryRange                // extracted salary — used in scoring + display
  postedDate?: string                 // ISO date string — shown as "Posted 3 days ago"
  extractedBy: 'jsonld' | 'regex' | 'dict' | 'llm'
  confidence: {
    skills: number                    // 0.0–1.0
    languages: number
    visa: number
    salary: number
    employmentType: number
    experienceYears: number
  }
  extractedAt: number
}
```

Low-confidence fields show a caveat in the overlay:
```
Visa sponsorship: Unknown
Evidence: none found
⚠ Could not determine — verify on job page
```

### JobListing (`types/job.ts`)

```typescript
interface JobListing {
  id: string                          // sha256(company + title + location) — fingerprint, not URL
  url: string                         // stored separately, may differ across reposts
  platform: DetectedPlatform
  title: string
  company: string
  location: string
  description: string                 // full text — used for extraction + cover letter
  isDuplicate?: boolean               // true if fingerprint already seen
  scrapedAt: number
}
```

### CompanyProfile (`types/company.ts`)

Seeded from public data (GitHub, LinkedIn, Crunchbase) and enriched over time by community signals from GreenApply users.

```typescript
interface CompanyProfile {
  normalizedName: string              // lowercase, stripped punctuation — used as key
  displayName: string
  size?: 'startup' | 'smb' | 'mid' | 'enterprise'
  industry?: string
  techStack?: string[]
  sponsorshipLikelihood: number       // 0.0–1.0 — seeded from public data, refined by community reports
  englishFriendlyScore: number        // 0.0–1.0 — does team primarily communicate in English?
  averageResponseDays?: number        // community-reported time to first response
  communityReports: number            // how many GreenApply users have data on this company
  lastUpdated: number
}
```

Community signals are opt-in: when a user marks an application as "rejected" or "offer", GreenApply anonymously aggregates the data per company. No PII. This becomes the basis for "Company Intelligence" in Pro.

### MatchResult (`types/match.ts`)

```typescript
interface HardFilter {
  type: 'language_gap' | 'visa_blocked' | 'employment_type_mismatch' | 'location_blocked' | 'excluded_company' | 'experience_gap'
  message: string                     // "German C1 required — your level is A2"
  severity: 'blocker' | 'warning'
}

interface MatchResult {
  jobId: string
  profileId: string
  hardFilters: HardFilter[]           // checked first — blockers force red immediately
  score: number                       // 0–100, deterministic (not LLM)
  recommendation: 'green' | 'yellow' | 'orange' | 'red'
  breakdown: {
    skills: number
    experience: number
    language: number
    location: number
    employmentType: number
    visaCompatibility: number
    salaryMatch: number               // 0 if salary unknown, positive if above min pref, negative if below
  }
  freshnessModifier: number           // applied on top of base score
  skillGap: {
    matched: string[]
    missing: string[]
    bonus: string[]
    languageGaps: LanguageGap[]
  }
  summary?: string                    // LLM-generated — only if API key is configured
  computedAt: number
}
```

### Application (`types/application.ts`)

```typescript
type ApplicationStatus =
  | 'saved' | 'applied' | 'screening' | 'interview'
  | 'offer' | 'accepted' | 'rejected' | 'withdrawn'

interface Application {
  id: string
  jobId: string
  job: JobListing
  matchScore: number
  status: ApplicationStatus
  timeline: { status: ApplicationStatus; timestamp: number; note?: string }[]
  notes: string
  rejectionReason?: string           // user-entered or detected — feeds "Why You Were Rejected" analytics
  coverLetter?: string
  appliedAt?: number
  createdAt: number
  updatedAt: number
}
```

### UserRule (`types/rules.ts`)

Lightweight rule engine — users define automation on top of the scoring engine.

```typescript
interface UserRule {
  id: string
  label: string                      // "Auto-skip no-sponsorship jobs"
  enabled: boolean
  condition: RuleCondition
  action: RuleAction
}

type RuleCondition =
  | { type: 'score_below'; threshold: number }
  | { type: 'score_above'; threshold: number }
  | { type: 'hard_filter_triggered'; filterType: HardFilter['type'] }
  | { type: 'skill_missing'; skill: string }
  | { type: 'company_matches'; pattern: string }
  | { type: 'job_age_days_above'; days: number }

type RuleAction =
  | { type: 'auto_skip' }            // mark 🔴 without further analysis
  | { type: 'auto_save' }            // save to tracker automatically
  | { type: 'highlight'; color: string }
  | { type: 'notify'; message: string }
```

Example built-in rules (on by default based on user profile):
```
If needs_sponsorship AND visa_sponsorship === false → auto_skip
If score > 85 → auto_save
If job age > 60 days → highlight orange
```

---

## Extension Architecture

```
Any Job Page (any URL)
  │
  ├── content/index.ts
  │   ├── observer.ts          watches URL + DOM changes (SPA navigation)
  │   ├── detector             identifies if page is a job listing
  │   ├── extractor            pulls raw job data from DOM
  │   └── shadow-host.ts       mounts React overlay in closed shadow DOM
  │       └── Overlay.tsx      renders score + hard filter alerts + actions
  │
  │   sendMessage({ type: 'JOB_DETECTED', payload: RawJobData })
  │                                     │
  └── background/index.ts  ◄────────────┘
      ├── job.handler
      │   ├── check extractions cache (skip if already extracted)
      │   └── extraction/pipeline.ts
      │       ├── jsonld.extractor    (free, instant)
      │       ├── regex.extractor     (free, instant)
      │       ├── dict.extractor      (free, skill list lookup)
      │       ├── confidence.ts       (score each field)
      │       └── nim/extractor.ts    (LLM fallback — only if confidence < 0.7)
      ├── match.handler
      │   ├── check matches cache (skip if already scored)
      │   ├── hard-filters.ts    deterministic pre-screen (blocker → immediate red)
      │   ├── engine.ts          deterministic score 0–100 (no LLM, always consistent)
      │   └── nim/explainer.ts   LLM writes 2–3 sentence summary of the score
      ├── generate.handler ──►  nim/generator.ts ──► NVIDIA NIM (streaming cover letter)
      └── tracker.handler       CRUD on applications
  │
  └── tabs.sendMessage(tabId, { type: 'MATCH_RESULT', payload: MatchResult })
          └──► Overlay.tsx renders score ring + hard filter cards + skill gaps

Popup ──► sendMessage ──► background (dashboard stats, job list)
Options ──► sendMessage ──► background (save profile, upload resume)
```

### Manifest key entries

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "scripting", "tabs"],
  "host_permissions": [
    "https://*.linkedin.com/*",
    "https://*.indeed.com/*",
    "https://*.glassdoor.com/*",
    "https://*.glassdoor.de/*",
    "https://*.stepstone.de/*",
    "https://boards.greenhouse.io/*",
    "https://jobs.lever.co/*",
    "https://*.myworkdayjobs.com/*",
    "https://jobs.ashbyhq.com/*",
    "https://*.personio.de/*"
  ],
  "optional_host_permissions": ["*://*/*"],
  "content_scripts": [
    {
      "matches": [
        "https://*.linkedin.com/*",
        "https://*.indeed.com/*",
        "https://*.glassdoor.com/*",
        "https://*.glassdoor.de/*",
        "https://*.stepstone.de/*",
        "https://boards.greenhouse.io/*",
        "https://jobs.lever.co/*",
        "https://*.myworkdayjobs.com/*",
        "https://jobs.ashbyhq.com/*",
        "https://*.personio.de/*"
      ],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ],
  "background": { "service_worker": "src/background/index.ts", "type": "module" }
}
```

**Chrome Store strategy:** Declare named platform domains in both `host_permissions` and `content_scripts.matches` — reviewers accept specific domains with no friction. Do not use `<all_urls>` in content_scripts; this is a known rejection trigger. For unrecognized career sites, use the declarativeNetRequest API or inject via `chrome.scripting.executeScript()` after requesting the origin permission at runtime:

```typescript
// User clicks the extension popup on an unrecognized career page
chrome.permissions.request({ origins: [`${location.origin}/*`] }, (granted) => {
  if (!granted) return
  chrome.scripting.executeScript({ target: { tabId }, files: ['content/index.js'] })
})
```

This covers 100% of sites while keeping the initial submission reviewer-friendly.

---

## Scoring Engine

### Step 1 — Hard Filters (pre-screen, deterministic)

Run before scoring. A blocker immediately forces `recommendation: 'red'` regardless of score.

```typescript
// scoring/hard-filters.ts
const HARD_FILTERS: HardFilterRule[] = [
  {
    type: 'language_gap',
    check: (extraction, profile) => {
      for (const req of extraction.requiredLanguages) {
        if (!req.required) continue
        const userLevel = profile.languages.find(l => l.language === req.language)?.level
        if (!userLevel || levelIndex(userLevel) < levelIndex(req.minLevel) - 1) {
          return { severity: 'blocker', message: `${req.language} ${req.minLevel} required — your level is ${userLevel ?? 'unknown'}` }
        }
      }
    }
  },
  {
    type: 'visa_blocked',
    check: (extraction, profile) => {
      if (extraction.visaSponsorship === false && profile.workAuth === 'needs_sponsorship') {
        return { severity: 'blocker', message: 'No visa sponsorship — you require sponsorship' }
      }
    }
  },
  {
    type: 'employment_type_mismatch',
    check: (extraction, profile) => {
      if (!profile.preferences.jobTypes.includes(extraction.employmentType)) {
        return { severity: 'warning', message: `Job is ${extraction.employmentType} — you prefer ${profile.preferences.jobTypes.join(', ')}` }
      }
    }
  },
  {
    type: 'location_blocked',
    check: (job, extraction, profile) => {
      const isOnsite = extraction.remote === false
      const jobCity = job.location
      const wantsRemote = profile.preferences.remotePreference === 'remote'
      const preferredCities = profile.targetLocations
      if (isOnsite && wantsRemote) {
        return { severity: 'blocker', message: `On-site in ${jobCity} — you only want remote` }
      }
      if (isOnsite && preferredCities.length > 0 && !preferredCities.some(c => jobCity.toLowerCase().includes(c.toLowerCase()))) {
        return { severity: 'warning', message: `On-site in ${jobCity} — outside your preferred locations` }
      }
    }
  },
  {
    type: 'excluded_company',
    check: (job, _, profile) => {
      if (profile.preferences.excludedCompanies.some(c => job.company.toLowerCase().includes(c.toLowerCase()))) {
        return { severity: 'blocker', message: `${job.company} is on your excluded companies list` }
      }
    }
  },
  {
    type: 'experience_gap',
    check: (extraction, profile) => {
      const required = extraction.requiredExperienceYears  // extracted from "5+ years", "minimum 3 years"
      if (!required) return
      const candidate = profile.totalExperienceYears
      if (candidate < required * 0.5) {
        return { severity: 'blocker', message: `${required}+ years required — you have ${candidate.toFixed(1)} years` }
      }
      if (candidate < required * 0.75) {
        return { severity: 'warning', message: `${required}+ years preferred — you have ${candidate.toFixed(1)} years` }
      }
    }
  }
]
```

### Step 2 — Deterministic Score (always consistent, no LLM)

```typescript
// scoring/engine.ts
const WEIGHTS = {
  skills: 0.30,
  experience: 0.22,
  language: 0.20,
  location: 0.10,
  visaCompatibility: 0.08,
  salaryMatch: 0.05,
  employmentType: 0.05,
}

export function computeScore(job: JobListing, extraction: ExtractionResult, profile: ResumeProfile, prefs: UserPreferences): ScoreBreakdown {
  const skills      = scoreSkills(extraction.requiredSkills, extraction.niceToHaveSkills, profile.skills)
  const experience  = scoreExperience(extraction, profile)
  const language    = scoreLanguage(extraction.requiredLanguages, profile.languages)
  const location    = scoreLocation(extraction, prefs)
  const employType  = scoreEmploymentType(extraction.employmentType, prefs.jobTypes)
  const visa        = scoreVisa(extraction.visa, profile.workAuth)
  const salary      = scoreSalary(extraction.salary, prefs.minSalaryEur)  // 0 if unknown, boost if above min

  const base = Math.round(
    skills      * WEIGHTS.skills +
    experience  * WEIGHTS.experience +
    language    * WEIGHTS.language +
    location    * WEIGHTS.location +
    visa        * WEIGHTS.visaCompatibility +
    salary      * WEIGHTS.salaryMatch +
    employType  * WEIGHTS.employmentType
  )

  const freshnessModifier = computeFreshnessModifier(extraction.postedDate)
  const total = Math.min(100, Math.max(0, base + freshnessModifier))

  return { total, base, freshnessModifier, skills, experience, language, location, employmentType: employType, visaCompatibility: visa, salaryMatch: salary }
}

// Salary scoring — neutral if unknown, boost if above user minimum, penalty if below
function scoreSalary(salary?: SalaryRange, minEur?: number): number {
  if (!salary || !minEur) return 50   // neutral when either is unknown
  const annualSalary = salary.period === 'month' ? salary.min! * 12 : salary.min!
  if (annualSalary >= minEur * 1.2)   return 100  // 20%+ above minimum
  if (annualSalary >= minEur)          return 75   // meets minimum
  if (annualSalary >= minEur * 0.85)  return 40   // slightly below
  return 0                                         // significantly below minimum
}
```

### Freshness modifier (`scoring/freshness.ts`)

Many jobs stay online long after being filled. Penalize stale listings.

```typescript
// scoring/freshness.ts
export function computeFreshnessModifier(postedDate?: string): number {
  if (!postedDate) return 0             // unknown date: no modifier
  const ageDays = Math.floor((Date.now() - new Date(postedDate).getTime()) / 86_400_000)
  if (ageDays <= 7)  return +5          // fresh: slight boost
  if (ageDays <= 30) return 0           // normal
  if (ageDays <= 60) return -5          // stale: warn user
  return -15                            // very stale: strong penalty
}
```

Overlay shows:
```
⚠ Posted 87 days ago — may already be filled
```

### Step 3 — LLM Explanation (only for the summary text)

The score is already computed. The LLM only writes the human-readable summary.

```
System: You are a job-fit analyst. The score has already been calculated deterministically.
        Write a 2–3 sentence plain-English explanation of why the candidate scored {score}/100.
        Be specific. Mention concrete skills and gaps. Do not recalculate.

User:
Score: {score}
Candidate skills: [list]
Missing skills: [list]
Language gaps: [list]
Visa status: {status}
Job type match: {match}
```

This ensures the score is always consistent — LLM randomness only affects the explanation text, not the number.

---

## Job Detection Strategy

### Generic detection (primary — works on any site)

1. **JSON-LD first:** `<script type="application/ld+json">` with `@type: "JobPosting"` — covers ~60% of career sites (Greenhouse, Lever, Ashby, most company sites)
2. **URL heuristic:** URL contains `/jobs/`, `/job/`, `/careers/`, `/karriere/`, `/stellenangebote/`, `/vacancies/`, `/position/`, `/offres/`
3. **DOM heuristic:** page has `<h1>` + large text block (>500 chars)

### Job fingerprinting

```typescript
// Normalize title before hashing — strip gender suffixes and seniority modifiers
// that companies add inconsistently across reposts
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(m\/?f\/?d\)|\(w\/?m\/?d\)|\(d\/?f\/?m\)|\(all genders\)/gi, '')
    .replace(/\b(senior|junior|lead|principal|staff|associate|intern)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const jobId = sha256(
  `${company.toLowerCase().trim()}|${normalizeTitle(title)}|${location.toLowerCase().trim()}`
)
```

If a fingerprint already exists in IndexedDB, mark `isDuplicate: true` and show a warning badge in the overlay. Without normalization, "Backend Engineer" and "Backend Engineer (m/f/d)" hash to different IDs — missing the duplicate entirely.

### Named-platform extractors (accuracy improvements)

Named platforms get custom selectors layered on top of the generic extractor. They are not the only supported path — just more accurate where they match.

### SPA navigation (`observer.ts`)

```typescript
const original = history.pushState.bind(history)
history.pushState = (...args) => { original(...args); window.dispatchEvent(new Event('locationchange')) }

window.addEventListener('locationchange', debounce(handleNavigation, 800))
window.addEventListener('popstate', debounce(handleNavigation, 800))

const mo = new MutationObserver(debounce(handleNavigation, 800))
mo.observe(document.body, { childList: true, subtree: true })
```

---

## Job Extraction Pipeline

Extraction runs once per job fingerprint and is cached in `extractions.store.ts`. Revisiting the same job (same company + title + location) skips extraction entirely.

### Priority order

```
1. JSON-LD             (free, instant, covers ~60% of sites)
      ↓ missing fields?
2. Regex patterns      (free, instant, covers most of the rest)
      ↓ still missing or low confidence?
3. Dictionary matching (free, skill list lookup)
      ↓ confidence still below threshold?
4. LLM fallback        (costs tokens — only when heuristics fail)
```

### Regex patterns (`extraction/regex.extractor.ts` + `constants/patterns.ts`)

```typescript
// Languages
const LANGUAGE_PATTERNS = [
  /\b(German|Deutsch|Deutschkenntnisse)\s*(C2|C1|B2|B1|A2|A1|native|Muttersprachler|fließend|fluent|verhandlungssicher)\b/i,
  /\b(English|Englisch)\s*(C2|C1|B2|native|fluent|proficient|business)\b/i,
]

// Visa & work authorization — critical for international students
const VISA_PATTERNS = [
  // Explicit no-sponsorship
  /visa\s*sponsorship\s*(is\s*)?(not\s*)?(available|provided|offered|possible)/i,
  /we\s*(do not|don.t|cannot|are unable to)\s*sponsor/i,
  /no\s*(visa\s*)?sponsorship/i,
  // Explicit sponsorship available
  /we\s*(offer|provide|support)\s*visa\s*sponsorship/i,
  /sponsorship\s*(is\s*)?(available|possible)/i,
  // Work authorization requirements
  /authorized?\s*to\s*work\s*in\s*(germany|deutschland|the\s*eu)/i,
  /current(ly)?\s*(valid\s*)?(work\s*permit|work\s*authorization|Arbeitserlaubnis)/i,
  /EU\s*(citizen|citizenship|national|work\s*permit)\s*required/i,
  /must\s*(already\s*)?have\s*(a\s*)?(valid\s*)?(work\s*permit|right\s*to\s*work)/i,
  /no\s*relocation\s*support/i,
  /Arbeitserlaubnis|Aufenthaltstitel|Niederlassungserlaubnis/i,
]

// Employment type
const EMPLOYMENT_PATTERNS = [
  /\b(Werkstudent(in)?|Working\s*Student|Studentische\s*Hilfskraft|Student\s*Assistant)\b/i,
  /\b(Internship|Praktikum|Pflichtpraktikum|Intern)\b/i,
  /\b(Full[- ]?Time|Vollzeit)\b/i,
  /\b(Part[- ]?Time|Teilzeit)\b/i,
  /\b(Freelance|Freiberuflich|Contract)\b/i,
  /\b(Thesis|Bachelor.?arbeit|Master.?arbeit|Abschlussarbeit)\b/i,
]

// Experience requirements
const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*years?\s*(of\s*)?(professional\s*)?(experience|Erfahrung)/i,
  /minimum\s*(\d+)\s*years?/i,
  /at\s*least\s*(\d+)\s*years?/i,
  /(\d+)[–-](\d+)\s*years?\s*(of\s*)?(experience|Erfahrung)/i,  // captures "3-5 years" → min=3
  /mindestens\s*(\d+)\s*Jahr/i,
]
// Extract: match[1] → requiredExperienceYears (use min of range for "3-5 years")
```

### Confidence scoring (`extraction/confidence.ts`)

Each field gets a confidence score (0.0–1.0). If below threshold (0.7), the field is sent to LLM for verification.

```typescript
interface ExtractionConfidence {
  skills: number          // 0.95 if from JSON-LD, 0.80 from dict, 0.60 from LLM
  languages: number       // 0.98 if regex matched, 0.50 if inferred
  visa: number            // 0.90 if explicit text found, 0.30 if absent (→ 'unknown')
  employmentType: number
}
```

Low-confidence fields show a caveat in the overlay:
```
Visa sponsorship: Unknown
⚠ Low confidence — verify on job page
```

---

## AI Integration

### Model assignments

| Task | Model | When called | Max tokens (in/out) |
|---|---|---|---|
| Resume structure extraction | `nvidia/llama-3.3-nemotron-super-49b-v1` | Once on upload | 6k / 512 |
| Job field extraction (fallback) | `meta/llama-3.1-8b-instruct` | Only when heuristics fail | 4k / 512 |
| Score explanation | `meta/llama-3.1-8b-instruct` | Once per job (cached) | 2k / 256 |
| Cover letter | `meta/llama-3.3-70b-instruct` | On demand | 6k / 1500 |

API endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`

**LLM is not used for scoring.** It is used for:
1. Parsing the resume into a `ResumeProfile` (once on upload, never again)
2. Extracting job fields only when JSON-LD + regex + dictionary all fail or return low confidence
3. Writing the human-readable score explanation (once per job, cached in `matches` store)
4. Generating cover letters on demand

### Token budget

- LLM job extraction fallback: job description truncated to 3000 chars
- Resume parsing: raw text truncated to 4000 chars
- Score explanation: only pre-computed score + lists, not full text (~500 chars input)

### Streaming

Cover letter streams via `chrome.runtime.connect()` (long-lived port) — keeps the service worker alive past the 30s idle timeout.

---

## Storage Layout

| Data | Where | Why |
|---|---|---|
| NVIDIA API key | `chrome.storage.local` | Never synced, never in code |
| UserProfile (no resume) | `chrome.storage.local` | Small, survives SW restart |
| ResumeProfile | IndexedDB `resumes` | 50–100KB structured data |
| JobListings | IndexedDB `jobs` | Raw scrape, can accumulate hundreds |
| ExtractionResults | IndexedDB `extractions` | Keyed by jobId — skip re-extraction on revisit |
| MatchResults | IndexedDB `matches` | Keyed by jobId — skip re-scoring on revisit |
| Applications | IndexedDB `applications` | Full CRUD + timeline |
| Last job per tab | `chrome.storage.session` | Tab-scoped, cleared on close |

`chrome.storage.sync` is not used — 8KB per item quota breaks on resume storage.

**Future (post-MVP):** Route AI calls through a GreenApply API proxy. Users pay a subscription instead of managing their own NVIDIA key. The API key moves from the extension to the server, eliminating user friction and key exposure risk.

---

## Metrics Tracking

Track in IndexedDB `metrics` store:

```typescript
interface UsageMetrics {
  jobsViewed: number
  jobsAnalyzed: number
  jobsSkipped: number                // jobs that received 🔴 recommendation
  jobsSaved: number
  applicationsSubmitted: number
  rejections: number
  interviews: number
  offers: number
  timeSavedMinutes: number           // jobsSkipped × 15 — shown as "Estimated time saved: 49.5 hrs"
  // Derived
  interviewRate: number              // interviews / applicationsSubmitted
  offerRate: number                  // offers / interviews
  rejectionRate: number              // rejections / applicationsSubmitted
}

interface RejectionPattern {
  reason: 'language_gap' | 'visa_blocked' | 'missing_skill' | 'overqualified' | 'unknown'
  count: number
  examples: string[]                 // skill names or language requirements that were blockers
}
```

Rejection reasons are recorded when users mark an application as "rejected" — they can optionally enter why. After 20+ rejections, GreenApply surfaces patterns:

```
Most common rejection factors:
German language gap: 32% of applications
Visa sponsorship unavailable: 25%
Missing: Kubernetes (18 jobs)
```

Show in popup Dashboard. `timeSavedMinutes` is incremented by 15 each time a job receives 🔴 — continuously reinforcing the product's core value. Dashboard headline:

```
Jobs analyzed: 432    Jobs skipped: 198
Estimated time saved: 49.5 hours
```

Foundation for the "Why You Keep Getting Rejected" post-MVP coaching feature.

---

## Score Thresholds

| Score | Label | Color |
|---|---|---|
| 75–100 | Strong Apply | 🟢 Green |
| 50–74 | Apply | 🟡 Yellow |
| 35–49 | Apply If Interested | 🟠 Orange |
| 0–34 | Skip | 🔴 Red |

Hard filter blockers force 🔴 Red regardless of score.

---

## Build Phases

### Phase 1 — Foundation (Days 1–3)
- Init repo with Vite + CRXJS + React + TypeScript + Tailwind v4
- Write all `src/types/` files (interfaces only, no logic)
- Stub entry points: `background/index.ts`, `content/index.ts`, `popup/index.html`, `options/index.html`
- Load unpacked in Chrome, verify no console errors

**Done when:** extension loads, popup opens, options page opens.

### Phase 2 — Extraction Quality (Days 4–8)

**Extraction must be reliable before scoring can exist.** Bad extraction = bad score. Build and test first.

- `content/observer.ts` (history patch + MutationObserver)
- `generic.extractor.ts` (DOM scraper) — JSON-LD → microdata → heuristic text block
- `generic.detector.ts` — URL + DOM heuristic
- `extraction/pipeline.ts` — JSON-LD → regex → skill dictionary (no LLM in MVP)
- `extraction/jsonld.extractor.ts`, `regex.extractor.ts`, `dict.extractor.ts`, `confidence.ts`
- `constants/patterns.ts` — all language, visa, work auth, employment type, experience years patterns
- Job fingerprinting with title normalization (`normalizeTitle()`)
- `extractions.store.ts` — cache ExtractionResult by jobId
- LinkedIn + Greenhouse + Lever DOM extractors (named-platform overrides)

**Extraction quality gate (do not move to Phase 3 until passing):**
- Test on 100 real job pages across 5+ platforms
- Language detection accuracy: >90%
- Visa/sponsorship detection accuracy: >85% — and **false positive rate <5%** (incorrectly saying "no sponsorship" is worse than saying "unknown" — destroys trust)
- Employment type detection accuracy: >90%
- Experience years extraction accuracy: >80%
- Duplicate detection: correctly collapses "Backend Engineer" and "Backend Engineer (m/f/d)"

**Done when:** extraction passes the quality gate.

### Phase 3 — Resume Upload + Profile (Days 9–11)

**MVP: fully deterministic, zero API key.**

- Options page: `ResumeUpload.tsx`, `ProfileForm.tsx`, `PreferencesForm.tsx`, `LanguageSettings.tsx`
- `background/parsers/pdf.parser.ts` + `docx.parser.ts`
- Deterministic `ResumeProfile` parser: regex date ranges → `totalExperienceYears`, regex language levels, skill dictionary match → `skills[]`, keyword-based `seniority` inference
- `background/handlers/profile.handler.ts` + `db/profile.store.ts`

**Done when:** user uploads resume PDF/DOCX and sees skills list, experience years, and detected language levels — with no API key required.

### Phase 4 — Hard Filters + Match Scoring + Overlay (Days 12–16)
- `scoring/hard-filters.ts` — language gap, visa blocked, location, employment type, excluded company
- `scoring/engine.ts` — deterministic 0–100 with salary match + freshness modifier
- `scoring/freshness.ts` — age-based score modifier
- `background/handlers/match.handler.ts`
- `content/shadow-host.ts` (closed shadow DOM + `adoptedStyleSheets`)
- `overlay/Overlay.tsx`, `ScoreRing.tsx`, `RecommendationBadge.tsx`, `HardFilterAlert.tsx`, `SkillGapList.tsx`, `JobFreshness.tsx`, `ConfidenceCaveat.tsx`
- `summary` field is `undefined` until user configures API key (overlay shows deterministic breakdown only)

**Done when:** floating overlay appears on any job page with consistent score, hard filter cards, salary match, and freshness warning — no API key required.

### Phase 5 — Application Tracker + Metrics (Days 17–20)
- `db/applications.store.ts` + `tracker.handler.ts`
- `overlay/components/TrackingDropdown.tsx`
- `popup/components/Dashboard.tsx`, `JobsList.tsx`, `ApplicationCard.tsx`
- `db/metrics.store.ts` — jobsViewed, jobsSaved, applicationsSubmitted, rejections, interviews, offers
- Rejection reason input when user marks application as rejected
- Basic rejection pattern summary in Dashboard (after 5+ rejections)

**Done when:** saved jobs appear in popup with status badges; rejection patterns visible in dashboard.

### Phase 6 — Feed Filtering + Rule Engine (Days 21–24)
- `content/feed.ts` — inject score badges (🟢🔴 + score) directly into job list cards on LinkedIn, Indeed, etc.
- `rules/engine.ts` + `rules/defaults.ts` — evaluate UserRules against MatchResult
- `db/rules.store.ts` + `background/handlers/rules.handler.ts`
- `options/components/RulesEditor.tsx` — create/toggle automation rules
- `overlay/components/RulesBadge.tsx` — shows triggered rule name in overlay
- Default rules auto-created from user profile (e.g., `needs_sponsorship` → auto-skip no-sponsor jobs)

**Done when:** job list on LinkedIn shows 🟢/🔴 badges inline; auto-skip rule silently marks matching jobs red without opening them.

### Phase 7 — Polish + AI Features (Days 25–30)
- German UI strings (EN/DE toggle)
- Error states: no resume, extraction failed, API key invalid, NIM timeout
- Retry logic in `nim/client.ts` (exponential backoff, max 2 retries)
- Tune named-platform extractors (Indeed, Glassdoor, StepStone, Workday, Personio)
- Icons + Chrome Web Store metadata
- **Optional AI features (unlocked when API key configured):**
  - `nim/explainer.ts` — LLM score explanation
  - `nim/generator.ts` — streaming cover letter via `chrome.runtime.connect()` port
  - `overlay/components/GeneratePanel.tsx` — streaming text output + copy button

**Done when:** MVP is submission-ready. AI features work when key is provided; core value works without it.

---

## Key Risks

### LinkedIn anti-scraping
Use `aria-label` and `data-*` attrs — not class names (they change). If login wall is hit, show "Sign in to see match" in overlay. Never simulate clicks or scroll.

### Service worker termination (30s idle)
- Streaming: use `chrome.runtime.connect()` port (keeps SW alive for port duration)
- Popup: ping `chrome.runtime.getPlatformInfo()` every 25s while open

### API key exposure
Key stored only in `chrome.storage.local`, read only in service worker. Content scripts never receive it. Long-term: move to GreenApply server proxy.

### CSP on strict sites
Overlay in closed shadow DOM. CSS injected via `adoptedStyleSheets` — not inline styles. Page CSP does not apply inside shadow root.

### Workday SPA
Wait for `[data-automation-id="jobPostingDescription"]` via MutationObserver. Timeout after 5s and show "Could not extract job details."

### Personio unstable class names
JSON-LD fallback first (Personio pages include `JobPosting` schema). If absent, fall back to largest `<section>` heuristic.

### Chrome Web Store approval
Declare named platform domains in `host_permissions` (reviewers accept specific domains readily). Add `*://*/*` only in `optional_host_permissions`. On unrecognized career sites, request `${location.origin}/*` at runtime via `chrome.permissions.request()`. Users approve once; no reviewer friction.

---

## MVP Scope

**MVP requires zero API key. Install → upload resume → start analyzing jobs.**

The five core features that must be excellent before anything else ships:

1. **Job extraction** — heuristic-first pipeline, tested on 100+ real jobs before Phase 3 begins
2. **Hard filters** — language gap, visa/work auth, location, company blacklist — the reason people install the extension
3. **Deterministic match score** — 0–100 with salary match + freshness modifier, always consistent
4. **Resume profile** — parsed deterministically from PDF/DOCX, no AI required
5. **Application tracker** — with rejection tracking and pattern summary

**Also in MVP:**
- Job detection on any career page, any URL
- Job fingerprinting with title normalization (deduplication across reposts)
- 🟢🟡🟠🔴 recommendation driven by hard filters + deterministic engine
- Confidence caveats with evidence text ("No sponsorship — evidence: 'We do not sponsor visas'")
- Feed filtering — score badges in LinkedIn / Indeed job list cards
- Rule engine — auto-skip, auto-save, highlight based on user-defined conditions
- `CompanyProfile` schema (seeded, community-enriched post-MVP)
- Usage metrics + rejection pattern summary
- English + German UI language support

**Unlocked when API key is optionally configured:**
- LLM score explanation (2–3 sentences)
- Cover letter generator (streaming)

**Out (post-MVP):**
- Resume tailoring
- Q&A answer generation
- Auto apply
- Multi-resume profiles
- Interview coach / outcome prediction (Pro)
- Referral finder
- Salary negotiation assistant
- GreenApply API proxy (moves NVIDIA key off client, enables subscription)
- University / team licensing
- Multi-platform cloud sync

---

## Monetization

### Free
- Match score + hard filters
- Job tracker (up to 20 saved)
- Basic rejection summary

### Pro (€7–10/month)
- Unlimited analyses
- Career insights + rejection pattern analysis
- Feed filtering on all platforms
- Advanced rule engine (unlimited rules)
- Skill gap tracking ("You've missed 18 jobs due to Kubernetes")
- Weekly skill recommendations
- Priority LLM calls (no rate limiting)

### University / Career Center Plan
Sell one license to a German university international student office. One institutional sale = hundreds of student subscriptions. GreenApply's niche (visa, German language gap, Werkstudent) maps exactly to what career advisors tell students manually today.

Do not sell:
- Cover letters — commoditized, every AI tool has them
- Interview prep — too generic
- Referral finder — too complex for MVP

Sell what no generic AI tool offers:
> "We tell international students in Germany which jobs they can realistically get."

---

## Future Features

### "Why You Keep Getting Rejected" (killer retention feature)

After 20+ tracked applications:

```
30 applications submitted

25 required German B2+ — your level is A2
18 required Kubernetes — not in your resume
12 had visa sponsorship unavailable

Recommendation:
→ Improve German to B2 before applying to more jobs
→ Add a Kubernetes project to your resume
→ Your auto-skip rule is already filtering no-sponsorship jobs ✓
```

This turns GreenApply into a personal career coach. Deeply personal, not replicable by generic tools, and a strong reason to keep the extension installed long after the job search ends.

### Auto Job Filtering Feed

Users open LinkedIn or Indeed. GreenApply marks every job card in the list view before they click through:

```
🟢 86 — Senior Python Engineer, Zalando
🟡 62 — Backend Developer, KPMG
🔴 German C1 Required — Data Scientist, BMW
🔴 No Sponsorship — ML Engineer, SAP
```

People stop browsing job boards and start browsing through GreenApply scores. Highly retentive. Phase 6 is the foundation — expand post-MVP to more platforms and batch scoring.

### Job Outcome Prediction (Pro)

Rule-based, not AI-generated. Derived from community data in `CompanyProfile`.

```
Match: 82%
Sponsorship: Available ✓
German: English-first team ✓
Skills: 90% match ✓

Estimated interview probability: 68%
Based on: 23 GreenApply users at this company
```

People care more about "Will I hear back?" than "Match score = 82." This becomes the hook that drives Pro conversion.

### The Core UI Moment

These two screens are the product. Everything else serves them.

```
🔴 Skip

German C1 required — your level is A2
No sponsorship available

Time saved: ~20 minutes
```

```
🟢 Strong Apply

English-speaking team
Sponsorship available
Skills: 9/11 matched
Score: 87/100

[Save Job]  [Track Application]
```

If these two screens are fast, accurate, and trustworthy — the extension has a reason to exist.
Engineering effort should be weighted toward extraction quality and hard filter accuracy above all else.
