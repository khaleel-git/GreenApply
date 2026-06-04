# Quick Start — GreenApply (developer / QA)

This quick-start guide helps you run the extension locally for manual QA and verifies the main flows (detect → extract → score → overlay).

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

3. Load the extension in Chrome (unpacked):

- Open `chrome://extensions/` → Enable Developer mode → "Load unpacked" → choose the project `dist` or the Vite dev output folder shown by the build.

## Verify core flows (manual)

1. Options page
  - Open the Options page from the extension action menu or via `chrome://extensions` → the extension's Options link.
  - Verify you can upload a resume (PDF/DOCX) and that profile fields save.
  - File reference: `src/options/Options.tsx`

2. Job listing overlay
  - Visit a job listing (LinkedIn, Indeed, StepStone) and confirm the overlay appears.
  - The overlay shows a score ring, recommendation badge, and any hard filter warnings.
  - File reference: `src/overlay/Overlay.tsx`

3. Messaging and SW
  - Inspect the page console for evidence that the content script sent `JOB_DETECTED`.
  - Open DevTools Application → Service Workers to inspect the background service worker; look for logs prefixed with `[GreenApply SW]`.

4. Saving & tracking
  - Save a job from the overlay and verify it appears in the popup Dashboard → Jobs list.
  - File refs: `src/overlay/components/TrackingDropdown.tsx`, `src/popup/Popup.tsx`

## Troubleshooting

- If the overlay does not appear: ensure `extensionEnabled` is true in the Options page and that the content script has permission for the current domain.
- If resume parsing fails: check the Options page console for errors related to `pdfjs-dist` or `mammoth`.
- If messages fail: check Service Worker console; unhandled exceptions are logged with the `[GreenApply SW]` prefix.

---

If you want, I can create a minimal smoke test that simulates content→background messaging or help run a manual verification session and collect logs.
