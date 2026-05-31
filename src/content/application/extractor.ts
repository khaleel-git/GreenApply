import type { FormQuestion } from '../../types'

// Application-form URL signals — checked before doing any DOM work.
export const APPLICATION_URL_SIGNALS = [
  '/apply', '/application', '/bewerben', '/bewerbung', '/apply/',
  'smartrecruiters.com', 'jobs.ashbyhq.com/apply', 'greenhouse.io/application',
  'lever.co/apply',
]

export function isApplicationFormPage(url: string, doc: Document): boolean {
  const urlLower = url.toLowerCase()
  const hasUrlSignal = APPLICATION_URL_SIGNALS.some(s => urlLower.includes(s))
  if (!hasUrlSignal) return false
  // Must have at least one interactive text input inside a form
  return Boolean(
    doc.querySelector('form textarea, form input[type="text"], form input:not([type]), form select'),
  )
}

// ─── Label resolution ────────────────────────────────────────────────────────

function resolveLabel(el: Element): string {
  // 1. aria-label attribute
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel?.trim()) return ariaLabel.trim()

  // 2. <label for="id">
  const id = el.getAttribute('id')
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)
    const txt = label?.textContent?.trim()
    if (txt) return txt
  }

  // 3. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map(lid => {
      const el = document.getElementById(lid)
      return el?.textContent?.trim() ?? ''
    })
    const joined = parts.filter(Boolean).join(' ')
    if (joined) return joined
  }

  // 4. Walk up to find a containing label or nearest meaningful text sibling
  let parent = el.parentElement
  for (let depth = 0; depth < 6 && parent; depth++) {
    // Direct <label> ancestor (wrapping pattern)
    if (parent.tagName === 'LABEL') {
      const clone = parent.cloneNode(true) as Element
      // Remove nested input/select/textarea so we only get label text
      clone.querySelectorAll('input, select, textarea').forEach(n => n.remove())
      const txt = clone.textContent?.trim()
      if (txt) return txt
    }

    // Sibling <label> or <p>/<span>/<div> before the element that carries question text
    const siblings = Array.from(parent.children)
    const myIdx = siblings.indexOf(el as HTMLElement)
    for (let i = myIdx - 1; i >= 0; i--) {
      const sib = siblings[i]
      if (['LABEL', 'P', 'SPAN', 'DIV', 'H3', 'H4', 'LEGEND'].includes(sib.tagName)) {
        const txt = sib.textContent?.trim()
        if (txt && txt.length > 4) return txt
      }
    }

    parent = parent.parentElement
  }

  return ''
}

// ─── Unique selector builder ─────────────────────────────────────────────────

function buildSelector(el: Element, tag: string, idx: number): string {
  const id = el.getAttribute('id')
  if (id) return `#${CSS.escape(id)}`
  const name = el.getAttribute('name')
  if (name) return `${tag}[name="${name}"]`
  return `${tag}:nth-of-type(${idx + 1})`
}

// ─── Main extractor ──────────────────────────────────────────────────────────

export function extractFormQuestions(): FormQuestion[] {
  const questions: FormQuestion[] = []
  const seenTexts = new Set<string>()

  function add(q: FormQuestion) {
    if (!q.text || q.text.length < 5) return
    // Deduplicate by question text
    const key = q.text.slice(0, 80).toLowerCase()
    if (seenTexts.has(key)) return
    seenTexts.add(key)
    questions.push(q)
  }

  // ── Textareas ──
  document.querySelectorAll('textarea').forEach((el, i) => {
    const text = resolveLabel(el)
    const maxLength = el.maxLength > 0 ? el.maxLength : undefined
    add({
      id: `q-ta-${i}`,
      text,
      type: 'textarea',
      selector: buildSelector(el, 'textarea', i),
      maxLength,
      required: el.required,
    })
  })

  // ── Text inputs ──
  document.querySelectorAll<HTMLInputElement>(
    'input[type="text"], input:not([type])',
  ).forEach((el, i) => {
    // Skip hidden-ish inputs and search boxes
    if (el.getAttribute('role') === 'combobox' || el.type === 'search') return
    const text = resolveLabel(el)
    add({
      id: `q-in-${i}`,
      text,
      type: 'text',
      selector: buildSelector(el, 'input', i),
      maxLength: el.maxLength > 0 ? el.maxLength : undefined,
      required: el.required,
    })
  })

  // ── Selects ──
  document.querySelectorAll<HTMLSelectElement>('select').forEach((el, i) => {
    const text = resolveLabel(el)
    const options = Array.from(el.options)
      .filter(o => o.value && o.text.trim())
      .map(o => o.text.trim())
    add({
      id: `q-sel-${i}`,
      text,
      type: 'select',
      selector: buildSelector(el, 'select', i),
      options,
      required: el.required,
    })
  })

  // ── Autocomplete / combobox (SmartRecruiters style) ──
  // These render as input[role=combobox] with a listbox for options.
  document.querySelectorAll<HTMLInputElement>(
    'input[role="combobox"], input[aria-autocomplete]',
  ).forEach((el, i) => {
    const text = resolveLabel(el)
    // Collect listbox options if visible
    const listId = el.getAttribute('aria-controls') || el.getAttribute('aria-owns')
    const listEl = listId ? document.getElementById(listId) : null
    const options = listEl
      ? Array.from(listEl.querySelectorAll('[role="option"]')).map(o => o.textContent?.trim() ?? '').filter(Boolean)
      : []
    add({
      id: `q-cb-${i}`,
      text,
      type: options.length ? 'select' : 'text',
      selector: buildSelector(el, 'input', 1000 + i),
      options: options.length ? options : undefined,
      required: el.required || el.getAttribute('aria-required') === 'true',
    })
  })

  return questions
}
