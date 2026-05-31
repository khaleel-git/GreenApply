let lastUrl = ''
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debounce(fn: () => void, ms: number) {
  return () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fn, ms)
  }
}

export function startObserver(onNavigate: () => void): void {
  // Patch history methods to emit locationchange on SPA navigation
  const patchHistory = (method: 'pushState' | 'replaceState') => {
    const original = history[method].bind(history)
    history[method] = function (...args: Parameters<typeof history.pushState>) {
      original(...args)
      window.dispatchEvent(new Event('locationchange'))
    }
  }
  patchHistory('pushState')
  patchHistory('replaceState')

  const debouncedNavigate = debounce(onNavigate, 800)

  window.addEventListener('locationchange', debouncedNavigate)
  window.addEventListener('popstate', debouncedNavigate)

  // MutationObserver for DOM changes after navigation
  const mo = new MutationObserver(debounce(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      onNavigate()
    }
  }, 800))
  mo.observe(document.body, { childList: true, subtree: true })

  // Run once on initial load
  lastUrl = location.href
  onNavigate()
}
