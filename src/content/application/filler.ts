// React/Angular-compatible form field filling.
// Setting .value directly bypasses the framework's synthetic event system;
// we use the native property descriptor setter to trigger it properly.

const INPUT_SETTER = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
const TEXTAREA_SETTER = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set

function dispatch(el: Element) {
  el.dispatchEvent(new Event('input',  { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
}

export function fillField(selector: string, value: string): boolean {
  const el = document.querySelector(selector)
  if (!el) return false

  if (el instanceof HTMLTextAreaElement) {
    ;(TEXTAREA_SETTER ?? Object.getOwnPropertyDescriptor(el, 'value')?.set)?.call(el, value)
    if (!TEXTAREA_SETTER) el.value = value
    dispatch(el)
    return true
  }

  if (el instanceof HTMLInputElement) {
    ;(INPUT_SETTER ?? Object.getOwnPropertyDescriptor(el, 'value')?.set)?.call(el, value)
    if (!INPUT_SETTER) el.value = value
    dispatch(el)
    return true
  }

  if (el instanceof HTMLSelectElement) {
    const valueLower = value.toLowerCase()
    const match = Array.from(el.options).find(o =>
      o.text.toLowerCase().includes(valueLower) || o.value.toLowerCase().includes(valueLower),
    )
    if (match) {
      el.value = match.value
      dispatch(el)
      return true
    }
    return false
  }

  return false
}

// For combobox/autocomplete inputs: type the value and dispatch the events
// the ATS expects to show its suggestion list, then pick the best match.
export function fillCombobox(selector: string, value: string): boolean {
  const el = document.querySelector(selector)
  if (!(el instanceof HTMLInputElement)) return false

  ;(INPUT_SETTER)?.call(el, value)
  if (!INPUT_SETTER) el.value = value
  el.dispatchEvent(new Event('input',  { bubbles: true }))
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))

  // Wait a tick for the listbox to render, then pick the first option
  setTimeout(() => {
    const listId = el.getAttribute('aria-controls') || el.getAttribute('aria-owns')
    const listEl = listId ? document.getElementById(listId) : null
    const first = listEl?.querySelector('[role="option"]') as HTMLElement | null
    first?.click()
  }, 120)

  return true
}
