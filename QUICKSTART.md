# Quick Start — GreenApply (developer / QA)

This quick-start guide helps you run the extension locally for manual QA and verifies the main flows (detect → extract → score → overlay). It includes simple commands and verification steps. Screenshots are suggested locations — replace placeholders with images when available.

## Prerequisites

- Node.js (16+ recommended) and `npm` or `pnpm` installed.
- A Chromium-based browser (Chrome, Edge, or Brave) for loading the extension.

## Install and run (dev)

1. Install dependencies:

```bash
npm install
```

2. Run the dev server:

```bash
npm run dev
```

Vite will serve the extension build. Follow the console output for the local dev URL.

3. Load the extension in Chrome (unpacked):

- Open `chrome://extensions/` → Enable Developer mode → "Load unpacked" → choose the project `dist` or the Vite dev output folder shown by the build.

## Verify core flows (manual)

1. Open the Options page: click the extension icon → Options. Or open the page directly: extension popup → Options.
  - Verify you can upload a resume (PDF/DOCX).
  - Verify profile fields and preferences save.
  - File reference: [src/options/Options.tsx](src/options/Options.tsx#L1)

2. Visit a job listing (LinkedIn, Indeed, StepStone) and confirm overlay appears:
  - The overlay should show a score ring and a recommendation pill.
  - If overlay is missing, check browser console for errors in the page and the Service Worker console.
  - File reference: [src/overlay/Overlay.tsx](src/overlay/Overlay.tsx#L1)

3. Check messaging between content and background:
  - In the job page console, find network or console logs indicating `JOB_DETECTED` was sent.
  - In the Service Worker console (chrome://serviceworker-internals or DevTools Application → Service Workers), confirm `MATCH_RESULT` messages are being sent.
  - Code refs: [src/content/index.ts](src/content/index.ts#L1), [src/background/index.ts](src/background/index.ts#L1)

4. Verify saving an application from the overlay or popup updates the DB:
  - Click Save on a job overlay, then open the popup Dashboard → Jobs list; the saved job should appear.
  - Code refs: [src/overlay/components/TrackingDropdown.tsx](src/overlay/components/TrackingDropdown.tsx#L1), [src/popup/Popup.tsx](src/popup/Popup.tsx#L1)

## Troubleshooting checklist

- If no overlay shows: ensure `extensionEnabled` is true in `chrome.storage.local` (Options page toggle).
- If parsing fails for PDF/DOCX uploads: check the Options page console for errors related to `pdfjs-dist` or `mammoth`.
- If background messages fail: open the Service Worker console to inspect exceptions. The SW logs errors to the console prefixed with `[GreenApply SW]`.

## Suggested annotated screenshots

1. Options page with resume upload (placeholder): IMAGE: `screenshots/real/options-upload.png`
2. Job page overlay showing a red/yellow/green badge (placeholder): IMAGE: `screenshots/real/job-overlay.png`
3. Popup dashboard showing saved jobs (placeholder): IMAGE: `screenshots/real/popup-dashboard.png`

To add screenshots: create a `screenshots/` folder at the repo root and place the PNG files named above. Then open a PR that references the images in the README or this file.

---

If you want, I can (choose one):

- Capture live console logs from a sample job page and save them to a file for inspection.
- Create a minimal end-to-end smoke script that opens a local HTML job page and simulates the content messaging (requires a headless browser).
