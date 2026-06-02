let shadowRoot: ShadowRoot | null = null
let hostEl: HTMLElement | null = null

export function getShadowRoot(): ShadowRoot | null {
  return shadowRoot
}

export function mountShadowHost(): ShadowRoot {
  if (shadowRoot) return shadowRoot

  hostEl = document.createElement('div')
  hostEl.id = 'greenapply-host'

  // Default: bottom-right corner, grows upward — same as original.
  // Only switch to top/left when a user-saved position exists.
  hostEl.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;pointer-events:none;'
  document.body.appendChild(hostEl)

  shadowRoot = hostEl.attachShadow({ mode: 'closed' })

  // Restore persisted position from a previous drag session
  try {
    chrome.storage.local.get('overlayPosition').then(({ overlayPosition }) => {
      if (!hostEl || overlayPosition?.top == null) return
      const t = Math.max(12, Math.min(window.innerHeight - 60,  overlayPosition.top))
      const l = Math.max(12, Math.min(window.innerWidth  - 100, overlayPosition.left))
      // Switch from bottom/right to top/left
      hostEl.style.cssText = `position:fixed;top:${t}px;left:${l}px;z-index:2147483647;pointer-events:none;`
    }).catch(() => {})
  } catch { /* no chrome context */ }

  // Receive position updates dispatched by the React overlay after a drag
  window.addEventListener('greenapply:setPosition', (e) => {
    if (!hostEl) return
    const { top, left } = (e as CustomEvent<{ top: number; left: number }>).detail
    hostEl.style.cssText = `position:fixed;top:${top}px;left:${left}px;z-index:2147483647;pointer-events:none;`
  })

  return shadowRoot
}

export function unmountShadowHost(): void {
  hostEl?.remove()
  hostEl = null
  shadowRoot = null
}
