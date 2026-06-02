import { useState, useEffect, useRef } from 'react'
import type { MatchResult, ContentMessage, ExtractionResult, FormQuestion, ApplicationAnswer } from '../types'
import { ThemeProvider, useTheme } from '../shared/ThemeContext'
import { ScoreRing } from './components/ScoreRing'
import { RecommendationBadge } from './components/RecommendationBadge'
import { HardFilterAlert } from './components/HardFilterAlert'
import { SkillGapList } from './components/SkillGapList'
import { JobFreshness } from './components/JobFreshness'
import { ActionButtons } from './components/ActionButtons'
import { GeneratePanel } from './components/GeneratePanel'
import { TrackingDropdown } from './components/TrackingDropdown'
import { ApplicationPanel } from './components/ApplicationPanel'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; match: MatchResult; extraction?: ExtractionResult }
  | { status: 'error'; message: string }
  | { status: 'app_loading'; questions: FormQuestion[] }
  | { status: 'app_ready'; questions: FormQuestion[]; answers: ApplicationAnswer[] }

type DragOrigin = { mouseX: number; mouseY: number; hostLeft: number; hostTop: number }

export function Overlay() {
  return <ThemeProvider><OverlayInner /></ThemeProvider>
}

function OverlayInner() {
  const { colors, theme, toggleTheme } = useTheme()
  const [state, setState] = useState<State>({ status: 'idle' })
  const [minimized, setMinimized] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const rootRef  = useRef<HTMLDivElement>(null)
  const dragRef  = useRef<DragOrigin | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<ContentMessage>).detail
      if (msg.type === 'MATCH_LOADING') setState({ status: 'loading' })
      else if (msg.type === 'MATCH_RESULT') setState({ status: 'result', match: msg.payload })
      else if (msg.type === 'MATCH_ERROR') setState({ status: 'error', message: msg.error })
      else if (msg.type === 'EXTRACTION_RESULT') {
        setState(prev =>
          prev.status === 'result' ? { ...prev, extraction: msg.payload } : prev,
        )
      } else if (msg.type === 'APPLICATION_LOADING') {
        const qs = (msg as unknown as { questions?: FormQuestion[] }).questions ?? []
        setState({ status: 'app_loading', questions: qs } as State)
      } else if (msg.type === 'APPLICATION_ANSWERS') {
        setState(prev => {
          const questions = (prev as { questions?: FormQuestion[] }).questions ?? []
          return { status: 'app_ready', questions, answers: msg.answers }
        })
      }
    }
    window.addEventListener('greenapply:message', handler)
    setState({ status: 'loading' })

    const timeout = setTimeout(() => {
      setState(prev =>
        prev.status === 'loading'
          ? { status: 'error', message: 'No response from extension. Try reloading the page.' }
          : prev,
      )
    }, 12_000)

    return () => {
      window.removeEventListener('greenapply:message', handler)
      clearTimeout(timeout)
    }
  }, [])

  // After expanding: clamp host position so the full panel stays within the viewport
  useEffect(() => {
    if (minimized) return
    requestAnimationFrame(() => {
      if (!rootRef.current) return
      try {
        const shadowRoot = rootRef.current.getRootNode() as ShadowRoot
        const host = shadowRoot?.host as HTMLElement
        if (!host) return

        const hostRect = host.getBoundingClientRect()
        const panelHeight = rootRef.current.getBoundingClientRect().height
        const margin = 12
        const OVERLAY_WIDTH = 320

        let newTop  = hostRect.top
        let newLeft = hostRect.left
        let changed = false

        // Clamp bottom overflow
        if (hostRect.top + panelHeight + margin > window.innerHeight) {
          newTop  = Math.max(margin, window.innerHeight - panelHeight - margin)
          changed = true
        }
        // Clamp top overflow (shouldn't normally happen, but be safe)
        if (newTop < margin) { newTop = margin; changed = true }

        // Clamp right overflow
        if (hostRect.left + OVERLAY_WIDTH + margin > window.innerWidth) {
          newLeft = Math.max(margin, window.innerWidth - OVERLAY_WIDTH - margin)
          changed = true
        }

        if (changed) {
          window.dispatchEvent(new CustomEvent('greenapply:setPosition', { detail: { top: newTop, left: newLeft } }))
          chrome.storage.local.set({ overlayPosition: { top: newTop, left: newLeft } }).catch(() => {})
        }
      } catch { /* ignore */ }
    })
  }, [minimized])

  // Drag: attach mousemove/mouseup to window (crosses shadow DOM boundary)
  useEffect(() => {
    if (!isDragging) return

    function onMove(e: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      const newLeft = Math.max(0, Math.min(window.innerWidth  - 100, d.hostLeft + (e.clientX - d.mouseX)))
      const newTop  = Math.max(0, Math.min(window.innerHeight - 50,  d.hostTop  + (e.clientY - d.mouseY)))
      window.dispatchEvent(new CustomEvent('greenapply:setPosition', { detail: { top: newTop, left: newLeft } }))
    }

    function onUp(e: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      const dx = Math.abs(e.clientX - d.mouseX)
      const dy = Math.abs(e.clientY - d.mouseY)
      if (dx < 5 && dy < 5) {
        // Was a tap/click — toggle minimize
        setMinimized(m => !m)
      } else {
        // Persist final position
        const newLeft = Math.max(0, Math.min(window.innerWidth  - 100, d.hostLeft + (e.clientX - d.mouseX)))
        const newTop  = Math.max(0, Math.min(window.innerHeight - 50,  d.hostTop  + (e.clientY - d.mouseY)))
        chrome.storage.local.set({ overlayPosition: { top: newTop, left: newLeft } }).catch(() => {})
      }
      dragRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  function handleHeaderMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    // Get host element position via the shadow root chain
    try {
      const shadowRoot = rootRef.current?.getRootNode() as ShadowRoot
      const host = shadowRoot?.host as HTMLElement
      const rect = host?.getBoundingClientRect()
      if (!rect) return
      dragRef.current = { mouseX: e.clientX, mouseY: e.clientY, hostLeft: rect.left, hostTop: rect.top }
      setIsDragging(true)
    } catch { /* ignore */ }
  }

  if (state.status === 'idle') return null

  const score = state.status === 'result' ? state.match.score : null
  const scoreColor = score !== null ? (score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626') : '#9ca3af'

  return (
    <div ref={rootRef} style={{
      pointerEvents: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      width: minimized ? 'auto' : 320,
      maxHeight: minimized ? 'none' : 'calc(100vh - 48px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    }}>
      {/* Header / drag handle */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: minimized ? '7px 12px' : '10px 14px',
          background: colors.bg,
          borderRadius: minimized ? 999 : '12px 12px 0 0',
          boxShadow: colors.shadow,
          cursor: isDragging ? 'grabbing' : 'grab',
          border: `1px solid ${colors.border}`,
          borderBottom: minimized ? undefined : 'none',
          userSelect: 'none',
          gap: 8,
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🟢</span>
          {minimized ? (
            score !== null
              ? <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor }}>{score}</span>
              : <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>GA</span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>GreenApply</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); toggleTheme() }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, padding: '2px 4px', borderRadius: 4, lineHeight: 1,
              color: colors.textMuted,
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1 }}>{minimized ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div style={{
          background: colors.bg, borderRadius: '0 0 12px 12px',
          boxShadow: colors.shadow,
          border: `1px solid ${colors.border}`, borderTop: 'none',
          padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
          flex: 1, minHeight: 0, overflowY: 'auto',
        }}>
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'error' && <ErrorState message={state.message} />}
          {state.status === 'result' && (
            <ResultState
              match={state.match}
              extraction={state.extraction}
              saved={saved}
              onSaved={() => setSaved(true)}
            />
          )}
          {state.status === 'app_loading' && (
            <AppLoadingState questions={state.questions} />
          )}
          {state.status === 'app_ready' && (
            <ApplicationPanel
              questions={state.questions}
              answers={state.answers}
              onFill={(questionId, value) => {
                const q = state.questions.find(q => q.id === questionId)
                if (!q) return
                window.dispatchEvent(new CustomEvent('greenapply:fill', {
                  detail: { selector: q.selector, value, isCombobox: q.type === 'select' && q.selector.includes('input') },
                }))
              }}
              onFillAll={answers => {
                for (const a of answers) {
                  const q = state.questions.find(q => q.id === a.questionId)
                  if (!q) continue
                  window.dispatchEvent(new CustomEvent('greenapply:fill', {
                    detail: { selector: q.selector, value: a.value, isCombobox: q.type === 'select' && q.selector.includes('input') },
                  }))
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

type LanguageStatus = {
  language: string
  required: string
  actual: string | null
  met: boolean
  requiredByJob: boolean
}

function renderLanguageIcon(language: string) {
  if (language === 'German') return '🇩🇪'
  if (language === 'English') return '🇬🇧'
  if (language === 'French') return '🇫🇷'
  return '🌐'
}

function MatchSummary({ match, extraction }: { match: MatchResult; extraction?: ExtractionResult }) {
  const { colors, theme } = useTheme()
  const isDark = theme === 'dark'
  const languageMap = new Map(match.skillGap.languageGaps.map(g => [g.language.toLowerCase(), g]))
  const detectedBy = extraction ? extraction.extractedBy : null
  const langConfPct = extraction ? Math.round((extraction.confidence?.languages ?? 0) * 100) : null
  const extractionLangs = extraction?.requiredLanguages ?? null
  const extractionHasLanguages = Boolean(extraction && (extraction.requiredLanguages?.length ?? 0) > 0)
  const extractionLangMap = new Map((extraction?.requiredLanguages ?? []).map((l: any) => [l.language.toLowerCase(), l]))
  const targetLanguages: Array<'German' | 'English'> = ['German', 'English']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
      <div>
        <div style={{ fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>Matched Skills</div>
        {match.skillGap.matched.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {match.skillGap.matched.map(skill => (
              <span key={skill} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 999,
                background: isDark ? '#052e16' : '#f0fdf4', color: isDark ? '#4ade80' : '#16a34a',
                border: `1px solid ${isDark ? '#166534' : '#bbf7d0'}`, fontSize: 11,
              }}>
                ✓ {skill}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ color: colors.textMuted }}>No clear skill matches detected.</div>
        )}
      </div>
      {detectedBy && (
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
          Detected by: <strong style={{ color: colors.textSecondary }}>{detectedBy === 'llm' ? 'AI (LLM)' : detectedBy}</strong>
          {langConfPct !== null && ` · confidence ${langConfPct}%`}
          {detectedBy === 'llm' && languageMap.size > 0 && (
            <span style={{ marginLeft: 8, color: colors.textMuted }}>(levels may be inferred)</span>
          )}
        </div>
      )}

      <div>
        <div style={{ fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>Language Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {targetLanguages.map(language => {
            const gap = languageMap.get(language.toLowerCase())
            const ex = extractionLangMap.get(language.toLowerCase())
            const hasSignal = extraction
              ? extractionHasLanguages ? Boolean(ex) : false
              : Boolean(gap)
            const met = gap?.met ?? false
            const requiredLevel = extraction
              ? (ex ? (ex.minLevel ?? 'unknown') : 'not detected')
              : (gap?.required ?? 'not detected')
            const actualLevel = gap?.actual ?? 'not set'
            return (
              <div key={language} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 8px', borderRadius: 6,
                background: hasSignal
                  ? (met ? (isDark ? '#052e16' : '#f0fdf4') : (isDark ? '#3b0f0f' : '#fef2f2'))
                  : colors.bgSecondary,
                border: `1px solid ${hasSignal ? (met ? (isDark ? '#166534' : '#bbf7d0') : (isDark ? '#7f1d1d' : '#fecaca')) : colors.border}`,
              }}>
                <span style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{renderLanguageIcon(language)} {language}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
                    borderRadius: 999, padding: '1px 6px',
                    color: hasSignal ? (gap?.requiredByJob ? '#166534' : '#92400e') : colors.textMuted,
                    background: hasSignal ? (gap?.requiredByJob ? (isDark ? '#052e16' : '#dcfce7') : (isDark ? '#431407' : '#fef3c7')) : colors.bgTertiary,
                    border: `1px solid ${hasSignal ? (gap?.requiredByJob ? (isDark ? '#166534' : '#86efac') : (isDark ? '#78350f' : '#fcd34d')) : colors.border}`,
                  }}>
                    {hasSignal ? (gap?.requiredByJob ? 'Required' : 'Optional') : 'Not detected'}
                  </span>
                </span>
                <span style={{ fontWeight: 600, color: hasSignal ? (met ? '#22c55e' : '#ef4444') : colors.textMuted, fontSize: 11 }}>
                  {hasSignal ? `${actualLevel} / ${requiredLevel} ${met ? '✓' : '✗'}` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  const { colors } = useTheme()
  return (
    <>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        border: `2px solid ${colors.border}`, borderTopColor: '#16a34a',
        animation: 'spin 0.8s linear infinite', flexShrink: 0,
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

function LoadingState() {
  const { colors } = useTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <Spinner />
      <span style={{ fontSize: 13, color: colors.textMuted }}>Analyzing job fit…</span>
    </div>
  )
}

function AppLoadingState({ questions }: { questions: FormQuestion[] }) {
  const { colors } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Spinner />
        <span style={{ fontSize: 13, color: colors.textMuted }}>
          Generating answers for {questions.length} question{questions.length !== 1 ? 's' : ''}…
        </span>
      </div>
      {questions.map(q => (
        <div key={q.id} style={{
          padding: '6px 8px', borderRadius: 6,
          background: colors.bgSecondary, border: `1px solid ${colors.border}`,
          fontSize: 11, color: colors.textMuted,
        }}>
          {q.text.length > 70 ? q.text.slice(0, 70) + '…' : q.text}
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  const { colors } = useTheme()
  return (
    <div style={{ fontSize: 12, color: colors.textMuted, padding: '4px 0' }}>
      {message}
    </div>
  )
}

function ResultState({
  match, extraction, saved, onSaved,
}: {
  match: MatchResult
  extraction?: ExtractionResult
  saved: boolean
  onSaved: () => void
}) {
  const [showDebug, setShowDebug] = useState(false)
  const blockers = match.hardFilters.filter(f => f.severity === 'blocker')
  const warnings = match.hardFilters.filter(f => f.severity === 'warning')

  return (
    <>
      {/* Score + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ScoreRing score={match.score} recommendation={match.recommendation} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <RecommendationBadge recommendation={match.recommendation} score={match.score} />
          {extraction && <JobFreshness postedDate={extraction.postedDate} />}
        </div>
      </div>

      {/* Hard filter blockers */}
      {blockers.length > 0 && <HardFilterAlert filters={blockers} />}

      {/* Language requirements — always shown in the compact summary */}
      <MatchSummary match={match} extraction={extraction} />

      {/* Skill gap */}
      <SkillGapList
        matched={match.skillGap.matched}
        missing={match.skillGap.missing}
        bonus={match.skillGap.bonus}
      />

      {/* Warnings (non-language) */}
      {warnings.filter(f => f.type !== 'language_gap').length > 0 && (
        <HardFilterAlert filters={warnings.filter(f => f.type !== 'language_gap')} />
      )}

      {/* LLM summary if available */}
      {match.summary && (
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
          {match.summary}
        </div>
      )}

      {/* Time saved badge for skips */}
      {match.recommendation === 'red' && (
        <div style={{
          fontSize: 11, color: '#16a34a', background: '#f0fdf4',
          border: '1px solid #bbf7d0', borderRadius: 6, padding: '5px 10px',
          textAlign: 'center',
        }}>
          ⏱ Estimated time saved: ~15 minutes
        </div>
      )}

      {/* Actions */}
      {match.recommendation !== 'red' && !saved && (
        <ActionButtons jobId={match.jobId} onSaved={onSaved} />
      )}
      {(saved || match.recommendation !== 'red') && (
        <TrackingDropdown jobId={match.jobId} />
      )}
      {match.recommendation !== 'red' && (
        <GeneratePanel jobId={match.jobId} />
      )}

      {/* Debug: raw extraction/match — hidden by default */}
      <div style={{ marginTop: 8 }}>
        <button onClick={() => setShowDebug(s => !s)} style={{ fontSize: 11, border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer' }}>
          {showDebug ? 'Hide debug' : 'Show debug'}
        </button>
        {showDebug && (
          <pre style={{ maxHeight: 220, overflow: 'auto', background: '#f9fafb', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 11 }}>
            {JSON.stringify({ extraction, match }, null, 2)}
          </pre>
        )}
      </div>
    </>
  )
}
