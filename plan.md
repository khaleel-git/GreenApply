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
| AI | NVIDIA NIM APIs |
| PDF parsing | `pdfjs-dist` |
| DOCX parsing | `mammoth` |

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
│   │   ├── job.ts                      # JobListing, ExtractionResult, DetectedPlatform
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
│   │       ├── ApiKeyForm.tsx          # NVIDIA API key (stored in chrome.storage.local)
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

The resume is parsed once into a rich structured profile. The LLM only touches this on upload — scoring is deterministic after that.

```typescript
interface ResumeProfile {
  raw: string                         // full extracted text
  fileName: string
  fileType: 'pdf' | 'docx'
  uploadedAt: number
  skills: string[]                    // e.g. ['Python', 'Docker', 'React']
  industries: string[]                // e.g. ['SaaS', 'FinTech']
  seniority: 'student' | 'junior' | 'mid' | 'senior' | 'lead'
  totalExperienceYears: number
  domains: string[]                   // e.g. ['Backend', 'Data Engineering']
  education: EducationEntry[]
  experience: ExperienceEntry[]
  languages: LanguageEntry[]          // [{ language: 'German', level: 'B2' }]
  certifications: string[]
}

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

Extraction is a separate step from the raw scrape, cached independently so revisiting a job never re-calls the LLM.

```typescript
interface ExtractionResult {
  jobId: string
  requiredSkills: string[]
  niceToHaveSkills: string[]
  requiredLanguages: LanguageRequirement[]
  visaSponsorship: boolean | 'unknown'
  employmentType: string
  remote: boolean | 'hybrid'
  salary?: SalaryRange
  postedDate?: string                 // ISO date string — shown as "Posted 3 days ago"
  extractedBy: 'jsonld' | 'regex' | 'dict' | 'llm'
  confidence: {
    skills: number                    // 0.0–1.0
    languages: number
    visa: number
    employmentType: number
  }
  extractedAt: number
}
```

Low-confidence fields show a caveat in the overlay (e.g., "Visa policy: unknown — low confidence").

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

### MatchResult (`types/match.ts`)

```typescript
interface HardFilter {
  type: 'language_gap' | 'visa_blocked' | 'employment_type_mismatch' | 'location_blocked'
  message: string                     // "German C1 required — your level is A2"
  severity: 'blocker' | 'warning'    // blocker = immediate red regardless of score
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
  }
  skillGap: {
    matched: string[]
    missing: string[]
    bonus: string[]
    languageGaps: LanguageGap[]
  }
  summary: string                     // LLM-generated explanation of the deterministic score
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
  "optional_host_permissions": ["*://*/*"],
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["src/content/index.ts"], "run_at": "document_idle" }],
  "background": { "service_worker": "src/background/index.ts", "type": "module" }
}
```

`optional_host_permissions` instead of `host_permissions` — Chrome Web Store reviewers flag broad `*://*/*` in required permissions. Declaring it optional and requesting at runtime avoids rejection.

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
  }
]
```

### Step 2 — Deterministic Score (always consistent, no LLM)

```typescript
// scoring/engine.ts
const WEIGHTS = { skills: 0.35, experience: 0.25, language: 0.20, location: 0.10, employmentType: 0.05, visaCompatibility: 0.05 }

export function computeScore(job: JobListing, extraction: ExtractionResult, profile: ResumeProfile, prefs: UserPreferences): ScoreBreakdown {
  const skills      = scoreSkills(extraction.requiredSkills, extraction.niceToHaveSkills, profile.skills)
  const experience  = scoreExperience(extraction, profile)
  const language    = scoreLanguage(extraction.requiredLanguages, profile.languages)
  const location    = scoreLocation(extraction, prefs)
  const employType  = scoreEmploymentType(extraction.employmentType, prefs.jobTypes)
  const visa        = scoreVisa(extraction.visaSponsorship, profile.workAuth)

  const base = Math.round(
    skills * WEIGHTS.skills +
    experience * WEIGHTS.experience +
    language * WEIGHTS.language +
    location * WEIGHTS.location +
    employType * WEIGHTS.employmentType +
    visa * WEIGHTS.visaCompatibility
  )

  const freshnessModifier = computeFreshnessModifier(extraction.postedDate)
  const total = Math.min(100, Math.max(0, base + freshnessModifier))

  return { total, base, freshnessModifier, skills, experience, language, location, employmentType: employType, visaCompatibility: visa }
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
// Identify duplicate postings across different URLs
const jobId = sha256(`${company.toLowerCase()}|${title.toLowerCase()}|${location.toLowerCase()}`)
```

If a fingerprint already exists in IndexedDB, mark `isDuplicate: true` and show a warning badge in the overlay. Companies regularly repost the same job with a new URL.

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
  jobsSaved: number
  applicationsSubmitted: number
  rejections: number
  interviews: number
  offers: number
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

Show in popup Dashboard. Foundation for the "Why You Keep Getting Rejected" post-MVP coaching feature.

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

### Phase 2 — Resume Upload + Profile (Days 4–6)
- Options page: `ResumeUpload.tsx`, `ProfileForm.tsx`, `PreferencesForm.tsx`, `ApiKeyForm.tsx`
- `background/parsers/pdf.parser.ts` + `docx.parser.ts`
- `background/handlers/profile.handler.ts` + `db/profile.store.ts`
- LLM call: parse resume text into full `ResumeProfile` (skills, seniority, experience years, domains, certifications, languages)

**Done when:** user uploads resume PDF/DOCX and sees the structured profile (skills list, experience years, seniority level) in options page.

### Phase 3 — Job Detection + Extraction (Days 7–10)
- `content/observer.ts` (history patch + MutationObserver)
- `generic.extractor.ts` (DOM scraper) — JSON-LD → microdata → heuristic text block
- `generic.detector.ts` — URL + DOM heuristic
- `extraction/pipeline.ts` — JSON-LD fields → regex patterns (languages, visa, employment type) → skill dictionary → LLM fallback
- `extraction/confidence.ts` — per-field confidence scores; low-confidence fields get LLM verification
- `extractions.store.ts` — cache ExtractionResult by jobId; revisiting skips extraction entirely
- Job fingerprinting: `sha256(company + title + location)` for duplicate detection
- Wire `JOB_DETECTED` message: content → background → extraction pipeline → IndexedDB
- LinkedIn DOM extractor as first named-platform override

**Done when:** overlay detects job pages on LinkedIn and any site with JSON-LD `JobPosting`; structured fields (skills, languages, visa, employment type) extracted and cached with confidence scores.

### Phase 4 — Hard Filters + Match Scoring + Overlay (Days 11–15)
- `scoring/hard-filters.ts` — language gap, visa blocked, employment type mismatch
- `scoring/engine.ts` — deterministic 0–100 calculator
- `nim/explainer.ts` — LLM writes the 2–3 sentence summary of the score
- `background/handlers/match.handler.ts`
- `content/shadow-host.ts` (closed shadow DOM + `adoptedStyleSheets`)
- `overlay/Overlay.tsx`, `ScoreRing.tsx`, `RecommendationBadge.tsx`, `HardFilterAlert.tsx`, `SkillGapList.tsx`

**Done when:** floating overlay appears on any job page with consistent deterministic score + hard filter warning cards (e.g., "German C1 required — your level is A2").

### Phase 5 — Application Tracker + Metrics (Days 16–19)
- `db/applications.store.ts` + `tracker.handler.ts`
- `overlay/components/TrackingDropdown.tsx`
- `popup/components/Dashboard.tsx`, `JobsList.tsx`, `ApplicationCard.tsx`
- `db/metrics.store.ts` — jobsViewed, jobsSaved, applicationsSubmitted, rejections, interviews, offers
- Rejection reason input when user marks application as rejected
- Basic rejection pattern summary in Dashboard (after 5+ rejections)

**Done when:** saved jobs appear in popup with status badges; rejection patterns visible in dashboard.

### Phase 6 — Feed Filtering + Rule Engine (Days 20–23)
- `content/feed.ts` — inject score badges (🟢🔴 + score) directly into job list cards on LinkedIn, Indeed, etc.
- `rules/engine.ts` + `rules/defaults.ts` — evaluate UserRules against MatchResult
- `db/rules.store.ts` + `background/handlers/rules.handler.ts`
- `options/components/RulesEditor.tsx` — create/toggle automation rules
- `overlay/components/RulesBadge.tsx` — shows triggered rule name in overlay
- Default rules auto-created based on user profile (e.g., `needs_sponsorship` → auto-skip no-sponsor jobs)

**Done when:** job list on LinkedIn shows 🟢/🔴 badges inline; auto-skip rule silently marks matching jobs red without opening them.

### Phase 7 — Cover Letter + Polish (Days 24–28)
- `nim/generator.ts` with SSE streaming
- `background/handlers/generate.handler.ts` via `chrome.runtime.connect()` port
- `overlay/components/GeneratePanel.tsx` (streaming text output + copy button)
- Tune named-platform extractors (Indeed, Glassdoor, StepStone, Workday, Personio)
- German UI strings (EN/DE toggle)
- Error states: no API key, no resume, extraction failed, NIM timeout
- Retry logic in `nim/client.ts` (exponential backoff, max 2 retries)
- Icons + Chrome Web Store metadata

**Done when:** MVP is submission-ready. Cover letter is a bonus, not a blocker.

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
`optional_host_permissions` instead of `host_permissions` for `*://*/*`. Request permission at runtime when user first visits a job page. Avoids reviewer flags on broad host access.

---

## MVP Scope

The five core features that must be excellent before anything else ships:

1. **Job detection** — any career page, any URL
2. **Heuristic extraction** — languages, visa, skills, employment type, freshness
3. **Hard filters** — language gap, visa blocked, location, company blacklist, work auth
4. **Deterministic match score** — 0–100 with dimension breakdown, freshness modifier
5. **Application tracker** — with rejection tracking and pattern summary

**Also in MVP:**
- Resume upload (PDF + DOCX) with full structured `ResumeProfile` extraction
- Job fingerprinting (duplicate detection across reposts)
- 🟢🟡🟠🔴 recommendation driven by deterministic engine + hard filters
- LLM score explanation (2–3 sentences, cached per job)
- Confidence caveats ("Visa policy: unknown — low confidence")
- Feed filtering — score badges in job list cards on LinkedIn / Indeed
- Rule engine — auto-skip, auto-save, highlight based on user-defined conditions
- Usage metrics (views, analyses, saved, applied, rejected, interviews, offers)
- Rejection pattern summary (foundation for coaching feature)
- English + German UI language support

**Out (post-MVP):**
- Cover letter generator (added in Phase 7 as bonus, not core)
- Resume tailoring
- Q&A answer generation
- Auto apply
- Multi-resume profiles
- Interview coach
- Referral finder
- Salary negotiation assistant
- GreenApply API proxy (moves NVIDIA key off the client, enables subscription)
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

People stop browsing job boards and start browsing through GreenApply scores. Highly retentive. Phase 6 is a foundation for this — expand it post-MVP to more platforms and faster batch scoring.
