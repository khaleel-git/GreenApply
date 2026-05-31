let shadowRoot: ShadowRoot | null = null
let hostEl: HTMLElement | null = null

export function getShadowRoot(): ShadowRoot | null {
  return shadowRoot
}

export function mountShadowHost(): ShadowRoot {
  if (shadowRoot) return shadowRoot

  hostEl = document.createElement('div')
  hostEl.id = 'greenapply-host'
  hostEl.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;pointer-events:none;'
  document.body.appendChild(hostEl)

  shadowRoot = hostEl.attachShadow({ mode: 'closed' })

  // Inject Tailwind via adoptedStyleSheets (CSP-safe, not inline)
  // The compiled CSS will be imported and injected by the overlay entry
  return shadowRoot
}

export function unmountShadowHost(): void {
  hostEl?.remove()
  hostEl = null
  shadowRoot = null
}
