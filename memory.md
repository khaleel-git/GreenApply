# GreenApply — Implementation Progress

## Build Status
✅ **Builds cleanly** — `npm run build` succeeds with zero errors.
Load `dist/` as an unpacked extension in Chrome: `chrome://extensions → Load unpacked → select dist/`.

## ⚠️ API Key — IMPORTANT
The NVIDIA key shared in chat was exposed. **Regenerate it immediately** at build.nvidia.com → API Keys.
Paste the new key only into the extension: Options → AI Features tab. It stores in `chrome.storage.local` only — never in any file.

---

## Completed Phases

### Phase 1 — Foundation ✅
All project scaffolding in place.

| File | Purpose |
|---|---|
| `package.json` | All dependencies declared |
| `vite.config.ts` | Vite + CRXJS + Tailwind v4 |
| `tsconfig.json` / `tsconfig.node.json` | TypeScript strict mode |
| `src/manifest.ts` | MV3 manifest — named platform host permissions, optional `*://*/*` |
| `.env.example` | NVIDIA API key placeholder |
| `public/icons/` | Green circle placeholder icons (16/48/128px) |

### Phase 2 — Extraction Pipeline ✅
Heuristic-first extraction — zero API calls in MVP.

| File | Purpose |
|---|---|
| `src/constants/patterns.ts` | All regex: languages, visa, work auth, employment type, experience, salary, remote |
| `src/constants/scoring.ts` | Weights, thresholds, freshness modifiers |
| `src/constants/platforms.ts` | Per-platform URL patterns + CSS selectors |
| `src/constants/models.ts` | NVIDIA NIM model names + token budgets |
| `src/background/extraction/jsonld.extractor.ts` | Parse `JobPosting` schema |
| `src/background/extraction/regex.extractor.ts` | Regex extraction for all key fields |
| `src/background/extraction/dict.extractor.ts` | 80+ skill dictionary matching |
| `src/background/extraction/confidence.ts` | Per-field confidence scoring |
| `src/background/extraction/pipeline.ts` | JSON-LD → regex → dict → LLM fallback orchestration |

### Phase 3 — Resume Parsing ✅
Fully deterministic — no API key required.

| File | Purpose |
|---|---|
| `src/background/parsers/pdf.parser.ts` | pdfjs-dist text extraction |
| `src/background/parsers/docx.parser.ts` | mammoth DOCX text extraction |
| `src/background/parsers/resume.parser.ts` | Deterministic `ResumeProfile` parser with **date range merging** |

**Key implementation:** `computeMergedExperienceYears()` unions overlapping date intervals before summing — prevents inflated experience from concurrent roles.

### Phase 4 — IndexedDB Stores ✅

| Store | Key | Purpose |
|---|---|---|
| `profile` | `'main'` | Single `UserProfile` record |
| `jobs` | `jobId` | Raw `JobListing` scraped data |
| `extractions` | `jobId` | Cached `ExtractionResult` — revisit = instant |
| `matches` | `jobId` | Cached `MatchResult` — revisit = instant |
| `applications` | `id` | Full CRUD with status timeline |
| `companies` | `normalizedName` | `CompanyProfile` schema (seeded post-MVP) |
| `rules` | `id` | User automation rules |
| `metrics` | metric key | Incrementing usage counters |

### Phase 5 — Scoring Engine ✅

| File | Purpose |
|---|---|
| `src/background/scoring/hard-filters.ts` | 6 hard filters: language gap, visa, work auth, employment type, location, experience gap, excluded company |
| `src/background/scoring/engine.ts` | Deterministic 0–100 scorer — 7 weighted dimensions + freshness modifier |
| `src/background/scoring/freshness.ts` | Age-based score modifier (+5 fresh, -5 stale, -15 very stale) |
| `src/background/rules/engine.ts` | Evaluate `UserRule` conditions against match + extraction |
| `src/background/rules/defaults.ts` | Auto-generate default rules from `workAuth` status |

**Score weights:** skills(30%), experience(22%), language(20%), location(10%), visa(8%), salary(5%), employment type(5%).

**Hard filter types:** `language_gap`, `visa_blocked`, `location_blocked`, `employment_type_mismatch`, `experience_gap`, `excluded_company`. Any `blocker` severity forces score ≤ 34 and recommendation = `red`.

### Phase 6 — Background Handlers ✅

| File | Purpose |
|---|---|
| `src/background/handlers/job.handler.ts` | Fingerprint job, deduplicate, run extraction pipeline, cache |
| `src/background/handlers/match.handler.ts` | Cache-check, compute match, push result to tab, update metrics |
| `src/background/handlers/profile.handler.ts` | Save profile, upload + parse resume, seed default rules |
| `src/background/handlers/tracker.handler.ts` | Save application, update status, increment metrics |
| `src/background/index.ts` | Service worker message router — handles all `BackgroundMessage` types |
| `src/shared/utils/fingerprint.ts` | `fingerprintJob()` — sha256 of normalized company+title+location |

**Job fingerprinting:** `normalizeTitle()` strips `(m/f/d)`, `(w/m/d)`, `senior`, `junior` etc. before hashing — prevents duplicate jobs from different URLs counting separately.

### Phase 7 — Content Scripts ✅

| File | Purpose |
|---|---|
| `src/content/observer.ts` | History patch (`pushState`/`replaceState`) + MutationObserver — detects SPA navigation |
| `src/content/detectors/generic.detector.ts` | PRIMARY — JSON-LD + URL heuristic + DOM keyword scan |
| `src/content/detectors/linkedin.detector.ts` | LinkedIn-specific URL pattern |
| `src/content/extractors/generic.extractor.ts` | JSON-LD → microdata → largest text block |
| `src/content/extractors/linkedin.extractor.ts` | LinkedIn-specific CSS selectors (aria-stable attrs) |
| `src/content/shadow-host.ts` | Closed shadow DOM mount — CSP-safe, style isolation |
| `src/content/index.ts` | Entry — detect → extract → mount overlay → send JOB_DETECTED |
| `src/content/overlay-mount.tsx` | React root inside shadow DOM |

### Phase 8 — Overlay UI ✅

| Component | Purpose |
|---|---|
| `Overlay.tsx` | Main container — listens for `greenapply:message` events, state machine |
| `ScoreRing.tsx` | Animated SVG progress ring (0–100) |
| `RecommendationBadge.tsx` | 🟢🟡🟠🔴 pill with label |
| `HardFilterAlert.tsx` | Red/orange alert cards for blockers and warnings |
| `SkillGapList.tsx` | Matched (green) / bonus (blue) / missing (red) skill chips |
| `JobFreshness.tsx` | "Posted 87 days ago" with warning for stale listings |
| `ConfidenceCaveat.tsx` | Low-confidence visa notice |
| `ActionButtons.tsx` | "Save Job" button → sends SAVE_APPLICATION to background |

**Core UI moments implemented:**
- 🔴 Skip with "Estimated time saved: ~15 minutes" badge
- 🟢 Strong Apply with score ring + skill breakdown + save button

### Phase 9 — Popup + Options ✅

| File | Purpose |
|---|---|
| `src/popup/Popup.tsx` | Dashboard (time saved, stats) + Jobs list with status badges |
| `src/options/Options.tsx` | 4 sections: Resume upload, Profile, Preferences, API key (optional) |

---

---

## Phase 10 — AI Layer + Remaining Features ✅ (added 2026-05-30)

| File | Purpose |
|---|---|
| `src/background/nim/client.ts` | `nimComplete()` (batch) + `nimStream()` (SSE) with 3-attempt exponential backoff |
| `src/background/nim/explainer.ts` | 2–3 sentence score explanation — called async after match computed, result pushed to tab |
| `src/background/nim/generator.ts` | Cover letter streaming prompt — candidate profile + job desc |
| `src/background/handlers/generate.handler.ts` | Streaming via `chrome.runtime.connect()` port — keeps SW alive |
| `src/overlay/components/GeneratePanel.tsx` | Streaming cover letter panel with copy button |
| `src/overlay/components/TrackingDropdown.tsx` | Status picker (saved → applied → interview → offer → rejected) |
| `src/content/feed.ts` | Injects 🟢🔴 score badges into job list cards (LinkedIn, Indeed, StepStone) |

**New platform extractors + detectors:**
Indeed, Greenhouse, Lever, Workday, Personio, StepStone — all wired into content/index.ts.

**How AI works:**
- Match score is computed deterministically first and returned immediately
- LLM explanation fires async in background; when done, pushes updated MatchResult to the tab (overlay re-renders with summary text)
- Cover letter streams token-by-token through a long-lived `chrome.runtime.connect()` port
- If no API key: score + hard filters still work; explanation and cover letter are hidden

---

## Next Steps (not yet built)

### Extraction quality gate (before shipping)
Test on 100 real job pages. Targets:
- Language detection >90%
- Visa/sponsorship >85% accuracy, <5% false positives
- Employment type >90%
- Experience years >80%

### Phase 10 — Feed Filtering
`src/content/feed.ts` — inject 🟢🔴 score badges directly into job list cards on LinkedIn / Indeed before user clicks through.

### Phase 11 — NIM AI features (optional, API key required)
- `src/background/nim/client.ts` — fetch wrapper
- `src/background/nim/explainer.ts` — 2–3 sentence score summary
- `src/background/nim/generator.ts` — streaming cover letter via `chrome.runtime.connect()` port
- `src/overlay/components/GeneratePanel.tsx` — streaming text output

### Phase 12 — Additional platform extractors
Indeed, Glassdoor, StepStone, Workday, Personio, Greenhouse, Lever, Ashby.

---

## Architecture Notes

- **No API key required for MVP.** All scoring and extraction is deterministic.
- **Extraction cache:** `extractions` store keyed by jobId — revisiting same job skips all processing.
- **Match cache:** `matches` store keyed by jobId — re-opening same job tab = instant result.
- **Shadow DOM overlay:** Closed shadow root prevents page CSS from leaking in. Tailwind styles injected via `adoptedStyleSheets` — CSP-safe.
- **Chrome Store strategy:** Named platform domains in `content_scripts.matches`, `*://*/*` only in `optional_host_permissions`. Generic career sites request origin permission at runtime.
- **Date range merging:** `computeMergedExperienceYears()` unions overlapping intervals — critical for accurate seniority inference on student profiles.

---

## How to Load in Chrome

```bash
npm install
npm run build
# Chrome → chrome://extensions → Enable Developer mode
# Load unpacked → select /Users/khaleel/Documents/greenapply/dist/
```

Visit any LinkedIn job page — the overlay should appear bottom-right.
Upload resume in the extension options page first for match scoring to work.
