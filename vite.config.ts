import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './src/manifest'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    // Disable the modulepreload polyfill — it injects <link> tags with relative
    // paths into job pages (e.g. /assets/xxx.js resolves to linkedin.com/assets/xxx.js)
    // which get blocked by the site's CSP.
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        // Injected as the very first bytes of every output chunk — before any module
        // initialization code runs. Service workers don't have `window`; idb and
        // pdfjs-dist check window.indexedDB at module load time, so the shim must
        // come before any import is evaluated.
        banner: 'if(typeof window==="undefined"){globalThis.window=globalThis;}',
      },
    },
  },
})
