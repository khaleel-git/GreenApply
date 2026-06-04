# GreenApply — Understanding Guide (non-technical)

This document explains, in plain language, how the GreenApply project is organized and how the pieces fit together. It is written for a reader who is not a programmer and describes the role of each major file or folder, how features are built from those files, and the overall workflow a user experiences.

---

## At-a-glance: what GreenApply does

- GreenApply is a browser extension (Chrome / Chromium) that inspects job postings and tells a job seeker whether the job is worth applying for.
- It analyzes the job text (requirements, languages, visa notes, salary) and compares it to the user's profile (resume, languages, preferences) to produce a deterministic score and recommendation (green/yellow/orange/red).

## Technologies used (short)

- Primary language: TypeScript (a typed version of JavaScript).
- UI: React (web UI components written in `.tsx` files) and Tailwind CSS for styles.
- Browser extension system: Manifest V3 (Chrome extension format).
- Storage: IndexedDB (local database in the browser) and `chrome.storage.local` for small settings.
- File parsers: `pdfjs-dist` for PDF and `mammoth` for DOCX extraction.
- Optional AI: NVIDIA NIM integration is prepared for post‑MVP features.

---

## High level architecture (simple)

- Content code (runs inside web pages): detects job postings, extracts the visible job text, and injects the overlay UI (the small badge or panel you see on job pages).
- Background code (a persistent service worker): receives messages from the content code, runs extraction logic (tries structured data first, then heuristics), runs scoring, stores results, and generates optional AI summaries.
- Overlay / Popup / Options (UI): React screens that show the score, allow uploading resumes, editing preferences, and viewing tracked jobs.
- Database: simple local stores that cache job extractions, matches, profiles and user preferences so the extension is fast and works offline.

---

## Step-by-step user flow (what happens when you use the extension)

1. The user installs the extension and opens a job listing page (LinkedIn, StepStone, Greenhouse, etc.).
2. The content script (page code) detects the job listing and extracts the raw job text and metadata.
3. The content script sends the raw job data to the background service worker.
4. The background worker runs the extraction pipeline to identify required skills, languages, visa text, salary, and date posted.
5. The scoring engine compares the extraction result to the user's saved profile (resume and preferences) and computes a numerical score and recommendation.
6. The overlay UI is rendered on the page showing the score and any hard filters (blockers) or caveats.
7. If the user opens the popup or options page, they see saved results, can upload a resume, and change preferences.

---

## Where to find the main pieces in the code (file guide)

Below are the most important folders and example files with short, non-technical descriptions.

- `src/manifest.ts` — Entry manifest for the browser extension. It lists which scripts run where (content, background, popup).

- `src/content/` — Code that runs inside web pages:
  - `src/content/index.ts` — Main entry: decides whether the page looks like a job posting.
  - `src/content/detectors/` — Rules that recognize different job platforms (LinkedIn, Indeed, etc.).
  - `src/content/extractors/` — Code that pulls the job text from the page DOM.
  - `src/content/overlay-mount.tsx` and `src/overlay/` — Mount the visual overlay (badges, small panels) inside the page.

- `src/background/` — Service worker and background logic (the brains):
  - `src/background/index.ts` — Background entry: receives messages and routes them to handlers.
  - `src/background/handlers/` — Each handler handles a type of request (profile, job, match, generate, tracker).
  - `src/background/extraction/` — The extraction pipeline and extractors (JSON-LD, regex, dictionaries).
  - `src/background/parsers/` — Parsers for uploaded files (PDF, DOCX, transcripts, resume parsing helpers).
  - `src/background/scoring/` — Deterministic scoring: hard filters, scoring engine, freshness adjustments.
  - `src/background/nim/` — Optional AI integrations (LLM-based summarizers / generators) prepared for later phases.

- `src/background/db/` — Local stores (IndexedDB wrappers) that keep profiles, jobs, matches, and application history.

- `src/popup/` and `src/options/` — Full UI pages a user opens from the extension (dashboard, job list, profile editor, API key form).

- `src/overlay/` — React components that are shown on top of job pages (ScoreRing, RecommendationBadge, HardFilterAlert).

- `src/types/` — Type definitions that describe the shape of data used across the app (profile, job, match, application). These are helpful to developers but not required to use the extension.

---

## How the main features are composed (plain explanation)

- Detecting a job page: the content code runs small detectors tailored to known platforms. A detector checks the page URL and looks for characteristic HTML structures. If a detector matches, the extractor pulls the job title, company, location, and the job description text.

- Extraction (structured → heuristic): the background tries to use structured data such as JSON-LD (a machine-readable format on many job pages). If JSON-LD is missing or incomplete, it falls back to pattern matching (regular expressions) and a small dictionary of skills to pull out named skills and experience requirements. Each field receives a confidence score (how sure the code is about the extraction).

- Scoring: the scoring engine is a deterministic formula (no AI needed for MVP). It applies hard filters first (immediate blockers such as "German C1 required" when the profile says A2), then computes weighted sub-scores (skills match, experience, languages, visa compatibility, salary match). The final score is a number between 0–100 and is mapped to a recommendation color.

- Overlay display: the overlay receives the final match and displays the score ring, a recommendation pill, and any hard filter warnings. The UI includes an explanation section with missing skill highlights and confidence caveats.

- Resume upload & parsing: the options page allows uploading a PDF or DOCX resume. The file parsers extract text (using PDF and DOCX libraries), and the deterministic resume parser finds skills, languages, job titles, and experience years. The parsed profile is stored locally for future matches.

- Optional AI features (post-MVP): when a user provides an API key, the extension can ask a language model to explain the numeric score in plain language or to generate a tailored cover letter. The code base contains placeholders for NVIDIA NIM integration.

---

## Simple data flow (visual)

```mermaid
flowchart LR
  A[User / Browser] --> B[Content script: detect & extract]
  B -->|send job| C[Background service worker]
  C --> D[Extraction pipeline: jsonld / regex / dict]
  D --> E[Scoring engine]
  E --> F[DB stores (cache results)]
  E --> G[Overlay: score shown on page]
  G -->|user clicks| H[Popup / Options: profile / resume upload]
  H -->|save profile| F
  D -->|low confidence| I[Optional LLM fallback: post-MVP]
```
```

---

## How files talk to each other (messaging, simply)

- The content script (page) and background service worker communicate using the browser's messaging system. The page says "here is a raw job" and the background replies with a match and score. Those messages are handled by `src/background/handlers/*` files.
- The background stores results in `src/background/db/*` so the overlay and popup can read them later without re-computing.

---

## Where to start if you want to explore or verify behavior (non-technical path)

1. Open `src/content/index.ts` to see how the extension recognizes pages.
2. Open `src/content/extractors/generic.extractor.ts` to see how raw text is pulled from most sites.
3. Open `src/background/extraction/pipeline.ts` to see the extraction steps (structured → regex → dictionary).
4. Open `src/background/scoring/engine.ts` to see how the final number is computed.
5. Open `src/overlay/Overlay.tsx` to see what the user sees on the page.

These files are written in readable TypeScript. If you want help opening or stepping through a specific file, tell me which file and I can summarize it line-by-line.

---

## Glossary (plain)

- Content script: code that runs inside the web page you visit.
- Background worker: a small program that runs separately from page code, does heavier work, and keeps data.
- Extractor: code that pulls information out of a job posting.
- Scoring engine: the code that turns extracted data into a 0–100 score and color recommendation.
- Overlay: the small UI you see on job pages with the score and badge.

---

## Next steps (for product / QA)

- Verify resume upload with a sample PDF and check that parsed skills appear in the options page.
- Visit a few job listings (LinkedIn, Indeed) and confirm the overlay shows a score.
- Run the optional deep audit to confirm all runtime messaging and caching are working.

---

If you want, I can convert this guide into a shorter quick-start checklist or run the deeper audit next.
---

