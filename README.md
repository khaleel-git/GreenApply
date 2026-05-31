<div align="center">
  <img src="public/icons/icon128.png" alt="GreenApply Logo" width="80" />
  <h1>GreenApply</h1>
  <p><strong>Know before you apply.</strong><br/>Instant AI-powered job-fit scoring for international students and professionals in Germany.</p>

  <p>
    <img src="https://img.shields.io/badge/Manifest-V3-4ade80?style=flat-square" alt="MV3" />
    <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/NVIDIA_NIM-AI_Powered-76b900?style=flat-square" alt="NVIDIA NIM" />
  </p>
</div>

---

## What it does

GreenApply is a Chrome extension that sits alongside job listings and instantly tells you how well a role matches your profile — before you spend 45 minutes writing a cover letter for a job that requires German C1.

Open a job on LinkedIn, Stepstone, SAP SuccessFactors, or 20+ other platforms and you get a **match score**, a plain-English verdict, a skill gap breakdown, and a language-requirement check in under 3 seconds.

---

## Features

### 🎯 Instant Match Scoring

Every job page gets a **0–100 score** and a colour-coded verdict the moment you open it. The score weighs skills, language requirements, employment type, location, experience, and salary — all against your profile.

<div align="center">
  <img src="docs/images/overlay-score.png" alt="Match score overlay showing 78/100 Strong Apply with matched skills" width="320" />
</div>

> **Verdicts:** 🟢 Strong Apply · 🟡 Consider · 🟠 Stretch · 🔴 Skip

---

### 🔍 Skill Gap Analysis

See exactly which of your skills match the job requirements, which are missing, and which are nice-to-have bonuses — colour-coded at a glance.

<div align="center">
  <img src="docs/images/overlay-skills.png" alt="Skill gap panel showing matched skills in green and missing skills in red" width="320" />
</div>

---

### 🗣️ Language Requirement Detection

GreenApply detects explicit German and English requirements from job descriptions using a multi-layer approach (JSON-LD → regex → AI), then compares them against your CEFR levels.

<div align="center">
  <img src="docs/images/overlay-language.png" alt="Language status showing German B1 vs required B2" width="320" />
</div>

No more discovering a C1 German requirement on page 3 of the application form.

---

### 📋 Feed Annotation

On job listing pages (LinkedIn, Stepstone, etc.), GreenApply injects quick-read tags directly onto job cards — no need to open every listing.

<div align="center">
  <img src="docs/images/feed-tags.png" alt="Job listing cards annotated with Werkstudent, German B2, and match score badges" width="480" />
</div>

Tags shown:
- Language requirements (`🇩🇪 German C1+`, `🇩🇪 German B2`, `🇬🇧 English req.`)
- Job type (`Werkstudent`, `Internship`, `Thesis`)
- Match score badge (on platforms where results are cached)

---

### ✉️ AI Cover Letter Generation

One click generates a tailored cover letter that references your actual skills, experience, and the specific role — streamed live so you see it being written.

<div align="center">
  <img src="docs/images/cover-letter.png" alt="Cover letter generation panel streaming text for a Werkstudent AI role" width="320" />
</div>

The generator uses a semantic vector index of your résumé to pull in relevant achievements and avoids inflating your experience (no more "seasoned professional with 9 years" when you have 2).

---

### 📝 Application Form Auto-Fill

When you navigate to an application form on SmartRecruiters, Greenhouse, Workday, or 15+ other ATS platforms, GreenApply detects the questions and generates answers:

<div align="center">
  <img src="docs/images/application-qa.png" alt="Application panel showing generated answers for Why are you excited, enrollment status, and work permit fields" width="320" />
</div>

| Question type | Source |
|---|---|
| "Why are you excited about this role?" | AI — personalised from job + your profile |
| Enrollment status | Your academic profile |
| Work permit / residence permit | Your work authorisation setting |
| Availability period | Smart default (next month + 12 months) |
| How did you hear about us | Sensible default |

All answers are editable before you fill the form. Click **Fill** per field or **Fill All** in one go.

---

### 🎓 Academic Profile

Upload your transcript or enrollment letter and GreenApply auto-extracts your courses, certifications, and degree level. This feeds the academic relevance modifier in the match score and helps the cover letter reference specific coursework.

<div align="center">
  <img src="docs/images/academic-profile.png" alt="Academic profile settings with extracted courses from transcript" width="560" />
</div>

---

## Supported Platforms

### ATS Platforms (with dedicated extractors)

| Platform | Coverage |
|---|---|
| SAP SuccessFactors | `*.successfactors.com`, `*.successfactors.eu` |
| Oracle Taleo | `*.taleo.net` |
| Greenhouse | `boards.greenhouse.io` |
| Lever | `jobs.lever.co` |
| Workday | `*.myworkdayjobs.com` |
| SmartRecruiters | `jobs.smartrecruiters.com` |
| BambooHR | `*.bamboohr.com` |
| Personio | `*.personio.de` |
| Ashby | `jobs.ashbyhq.com` |
| iCIMS | `*.icims.com` |
| Recruitee | `*.recruitee.com` |
| softgarden | `*.softgarden.de` |

### Job Boards

| Platform | Region |
|---|---|
| LinkedIn | Global |
| Indeed | Global |
| Glassdoor | Global |
| Monster | DE / Global |
| Stepstone | DE |
| Xing | DE / DACH |
| JobTeaser | EU (students) |
| Absolventa | DE (students) |
| Workwise (Campusjäger) | DE (students) |
| JOIN | DE (startups) |
| Jobware | DE |
| Fetchjobs | DE |
| TU Berlin Jobs | DE |

Any other company career page is handled automatically via generic JSON-LD + DOM extraction.

---

## Getting Started

### Prerequisites

- Chrome / Chromium 120+
- Node.js 20+
- An [NVIDIA NIM API key](https://build.nvidia.com) (free tier available) — required for AI features (cover letter, application Q&A, score explanation)

### Installation (development)

```bash
git clone https://github.com/yourusername/greenapply.git
cd greenapply
npm install
npm run build
```

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `dist/` folder

### Setup

1. Click the GreenApply icon → **Settings**
2. **Resume** tab — upload your PDF or DOCX résumé (parsed locally, never uploaded)
3. **Languages & Skills** tab — verify detected languages and skills, adjust CEFR levels
4. **Academic** tab — upload your transcript to enable academic matching
5. **Preferences** tab — set job types, remote preference, minimum salary
6. **AI Features** tab — paste your NVIDIA NIM API key

---

## How Scoring Works

```
Score = Skills × 35%
      + Language × 25%
      + Experience × 15%
      + Location × 10%
      + Employment Type × 10%
      + Salary × 5%
      + Academic Relevance modifier (±10 pts)
      + Job Freshness modifier (±3 pts)
```

**Hard filters** (visa blocking, wrong employment type, excluded company) cap the score at 34 and flip the recommendation to 🔴 Skip regardless of other factors.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension framework | Chrome MV3, CRXJS + Vite |
| UI | React 19, inline styles (no external CSS deps) |
| AI inference | NVIDIA NIM (Llama 3.1 8B for extraction, Llama 3.3 70B for cover letters) |
| Embeddings | `baai/bge-m3` via NIM |
| Storage | IndexedDB via `idb` |
| PDF parsing | `pdfjs-dist` |
| DOCX parsing | `mammoth` |
| Language | TypeScript 5.7 |

---

## Privacy

- All résumé parsing happens **locally in your browser**
- Job data and your profile stay in local IndexedDB — never sent to any server
- The only external calls are to the NVIDIA NIM API (when you have an API key configured), carrying only the job description text and anonymised profile signals
- No analytics, no tracking, no accounts required

---

## Adding Screenshots

Drop screenshots into `docs/images/` with the filenames referenced above:

| File | Content |
|---|---|
| `overlay-score.png` | Score ring + recommendation badge |
| `overlay-skills.png` | Matched / missing skills panel |
| `overlay-language.png` | Language status rows |
| `feed-tags.png` | Annotated job cards on a listing page |
| `cover-letter.png` | Cover letter generation streaming |
| `application-qa.png` | Application form Q&A panel |
| `academic-profile.png` | Academic settings page |

---

## License

MIT
