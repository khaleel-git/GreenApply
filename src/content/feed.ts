import type { MatchResult } from '../types'
import { scoreToColor, scoreToEmoji } from '../shared/utils/score.utils'

const BADGE_ATTR = 'data-ga-badge'

// ─── Quick inline scan for listing pages (no full analysis needed) ────────────

interface QuickTag { label: string; color: string; bg: string }

const QUICK_PATTERNS: Array<{ pattern: RegExp; tag: QuickTag }> = [
  // ── German language ──────────────────────────────────────────────────────────
  // C2 / native / C1 / verhandlungssicher / fließend
  {
    pattern: /Deutsch(kenntnisse)?\s*(C2|C1|verhandlungssicher|fließend|Muttersprachler|muttersprachlich|native\s*German|German\s*native)/i,
    tag: { label: '🇩🇪 German C1+', color: '#dc2626', bg: '#fee2e2' },
  },
  {
    pattern: /German\s*(C2|C1|fluent|native|verhandlungssicher|fließend|proficient|required|mandatory|necessary|obligatory)/i,
    tag: { label: '🇩🇪 German C1+', color: '#dc2626', bg: '#fee2e2' },
  },
  // Deutschkenntnisse erforderlich (level not stated — assume C1 requirement)
  {
    pattern: /Deutschkenntnisse\s*(sind\s*)?(erforderlich|notwendig|werden\s*vorausgesetzt|Voraussetzung|required|necessary)/i,
    tag: { label: '🇩🇪 German req.', color: '#dc2626', bg: '#fee2e2' },
  },
  {
    pattern: /Deutsch\s*(ist|als\s*Arbeitssprache|Arbeitssprache\s*ist|language\s*of\s*work\s*is\s*German)/i,
    tag: { label: '🇩🇪 German req.', color: '#dc2626', bg: '#fee2e2' },
  },
  // B2
  {
    pattern: /Deutsch(kenntnisse)?\s*(B2|sehr\s*gut[e]?|fortgeschritten)/i,
    tag: { label: '🇩🇪 German B2', color: '#d97706', bg: '#fef3c7' },
  },
  {
    pattern: /German\s*(B2|good|advanced|solid|strong\s*German)/i,
    tag: { label: '🇩🇪 German B2', color: '#d97706', bg: '#fef3c7' },
  },
  // B1 or lower
  {
    pattern: /Deutsch(kenntnisse)?\s*(B1|A2|A1|Grundkenntnisse|Grundlagen|basic|beginner)/i,
    tag: { label: '🇩🇪 German B1', color: '#ca8a04', bg: '#fef9c3' },
  },

  // ── English language ─────────────────────────────────────────────────────────
  {
    pattern: /Englisch\s*(C2|C1|B2|fließend|verhandlungssicher|sehr\s*gut)|English\s*(C2|C1|fluent|native|proficient|business\s*level|required|mandatory)/i,
    tag: { label: '🇬🇧 English req.', color: '#2563eb', bg: '#eff6ff' },
  },

  // ── Job type ─────────────────────────────────────────────────────────────────
  {
    pattern: /Werkstudent|Working[\s-]Student|Studentische[\s]Hilfskraft|Student\s*Assistant|HiWi\b/i,
    tag: { label: 'Werkstudent', color: '#7c3aed', bg: '#f5f3ff' },
  },
  {
    pattern: /Praktikum|Internship|Pflichtpraktikum|Praktikant(in)?/i,
    tag: { label: 'Internship', color: '#0891b2', bg: '#e0f2fe' },
  },
  {
    pattern: /Thesis|Abschlussarbeit|Bachelor[\s-]?arbeit|Master[\s-]?arbeit|Diplomarbeit/i,
    tag: { label: 'Thesis', color: '#0891b2', bg: '#e0f2fe' },
  },
]

function quickTagsFromText(text: string): QuickTag[] {
  const seen = new Set<string>()
  const tags: QuickTag[] = []
  for (const { pattern, tag } of QUICK_PATTERNS) {
    if (pattern.test(text) && !seen.has(tag.label)) {
      seen.add(tag.label)
      tags.push(tag)
    }
  }
  return tags
}

function injectQuickTags(el: Element, tags: QuickTag[]): void {
  if (!tags.length || el.querySelector('[data-ga-qtag]')) return
  const row = document.createElement('div')
  row.setAttribute('data-ga-qtag', '1')
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:5px'
  for (const { label, color, bg } of tags) {
    const pill = document.createElement('span')
    pill.style.cssText = `display:inline-block;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:600;color:${color};background:${bg};border:1px solid ${color}40;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`
    pill.textContent = label
    row.appendChild(pill)
  }
  el.appendChild(row)
}

// Generic listing-page scanner — runs on any page with job cards
function scanGenericListingCards(): void {
  // Look for elements that carry a job link pointing to a URL with typical job path segments
  const jobLinkPattern = /\/(job|jobs|job-postings?|career|careers|vacancy|vacancies|position|stellenangebote|stelle)\//i
  const cards = new Set<Element>()

  document.querySelectorAll('a[href]').forEach(a => {
    const href = (a as HTMLAnchorElement).href
    if (!jobLinkPattern.test(href)) return
    // Walk up to find the containing card (stop at body)
    let el: Element | null = a
    for (let i = 0; i < 5; i++) {
      el = el?.parentElement ?? null
      if (!el || el === document.body) break
      const tag = el.tagName.toLowerCase()
      if (['article', 'li', 'tr', 'div'].includes(tag) && (el as HTMLElement).offsetHeight > 40) {
        cards.add(el)
        break
      }
    }
  })

  for (const card of cards) {
    if (card.querySelector('[data-ga-qtag]')) continue
    const text = (card as HTMLElement).innerText ?? ''
    if (text.length < 10) continue
    const tags = quickTagsFromText(text)
    if (tags.length) injectQuickTags(card, tags)
  }
}

let genericScanObserver: MutationObserver | null = null

export function startGenericListingScan(): void {
  scanGenericListingCards()
  if (genericScanObserver) genericScanObserver.disconnect()
  genericScanObserver = new MutationObserver(() => scanGenericListingCards())
  genericScanObserver.observe(document.body, { childList: true, subtree: true })
}

// Platform-specific job card + link selectors
const CARD_CONFIGS: Array<{
  test: (url: string) => boolean
  cardSelector: string
  linkSelector: string
  jobIdExtractor: (href: string) => string | null
}> = [
  {
    test: url => /linkedin\.com/i.test(url),
    cardSelector: 'li.jobs-search-results__list-item, .job-card-container, [data-occludable-job-id]',
    linkSelector: 'a[href*="/jobs/view/"]',
    jobIdExtractor: href => {
      const m = href.match(/\/jobs\/view\/(\d+)/)
      return m ? m[1] : null
    },
  },
  {
    test: url => /indeed\.com/i.test(url),
    cardSelector: '.job_seen_beacon, .tapItem, [class*="jobCard"]',
    linkSelector: 'a[href*="viewjob"], a[href*="/rc/clk"]',
    jobIdExtractor: href => {
      try { return new URL(href, location.href).searchParams.get('jk') } catch { return null }
    },
  },
  {
    test: url => /stepstone\.de/i.test(url),
    cardSelector: 'article[data-at="job-item"], [class*="ResultList"] article',
    linkSelector: 'a[href*="stellenangebote"]',
    jobIdExtractor: href => {
      const m = href.match(/--(\d+)-\d+/)
      return m ? m[1] : null
    },
  },
]

function createBadge(match: MatchResult): HTMLElement {
  const badge = document.createElement('div')
  badge.setAttribute(BADGE_ATTR, '1')
  const color = scoreToColor(match.score, match.recommendation)
  const emoji = scoreToEmoji(match.recommendation)

  badge.style.cssText = [
    'display:inline-flex;align-items:center;gap:4px',
    `padding:2px 8px;border-radius:999px`,
    `background:${color}18;border:1px solid ${color}40`,
    `font-size:11px;font-weight:600;color:${color}`,
    'margin-top:4px;cursor:default;user-select:none',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  ].join(';')

  badge.textContent = `${emoji} ${match.score}`
  if (match.hardFilters.some(f => f.severity === 'blocker')) {
    const reason = match.hardFilters.find(f => f.severity === 'blocker')?.message ?? ''
    badge.title = reason
    const hint = document.createElement('span')
    hint.style.cssText = 'font-size:9px;opacity:0.8;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'
    hint.textContent = ' · ' + reason.slice(0, 40)
    badge.appendChild(hint)
  }
  return badge
}

async function annotateCard(card: Element, match: MatchResult): Promise<void> {
  if (card.querySelector(`[${BADGE_ATTR}]`)) return // already annotated
  const badge = createBadge(match)
  // Insert after the job title or at end of card header
  const title = card.querySelector('h3, h2, [class*="title"], [class*="heading"]')
  if (title?.parentElement) {
    title.parentElement.insertBefore(badge, title.nextSibling)
  } else {
    card.appendChild(badge)
  }
}

let feedObserver: MutationObserver | null = null
const matchCache = new Map<string, MatchResult>()

async function scanCards(): Promise<void> {
  const config = CARD_CONFIGS.find(c => c.test(location.href))
  if (!config) return

  const cards = document.querySelectorAll(config.cardSelector)
  for (const card of cards) {
    if (card.getAttribute(BADGE_ATTR)) continue
    card.setAttribute(BADGE_ATTR, 'pending')

    const link = card.querySelector(config.linkSelector) as HTMLAnchorElement | null
    if (!link?.href) continue

    const rawId = config.jobIdExtractor(link.href)
    if (!rawId) continue

    // Check cache first
    if (matchCache.has(rawId)) {
      await annotateCard(card, matchCache.get(rawId)!)
      continue
    }

    // Request match from background — guard against missing runtime (iframe / reload)
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) continue
    try {
      chrome.runtime.sendMessage({ type: 'GET_MATCH', jobId: rawId }).then(
        async (match: unknown) => {
          if (match && typeof match === 'object' && 'score' in match) {
            const m = match as MatchResult
            matchCache.set(rawId, m)
            await annotateCard(card, m)
          }
        },
      ).catch(() => {})  // swallow async rejections
    } catch { /* extension reloaded — context invalidated, ignore */ }
  }
}

export function startFeedAnnotation(): void {
  if (feedObserver) feedObserver.disconnect()

  scanCards()

  feedObserver = new MutationObserver(() => { scanCards() })
  feedObserver.observe(document.body, { childList: true, subtree: true })
}
