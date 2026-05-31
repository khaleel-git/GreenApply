import { useState, useEffect } from 'react'
import type { MatchResult, ContentMessage, ExtractionResult } from '../types'
import { ScoreRing } from './components/ScoreRing'
import { RecommendationBadge } from './components/RecommendationBadge'
import { HardFilterAlert } from './components/HardFilterAlert'
import { SkillGapList } from './components/SkillGapList'
import { JobFreshness } from './components/JobFreshness'
import { ActionButtons } from './components/ActionButtons'
import { GeneratePanel } from './components/GeneratePanel'
import { TrackingDropdown } from './components/TrackingDropdown'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; match: MatchResult; extraction?: ExtractionResult }
  | { status: 'error'; message: string }

export function Overlay() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [minimized, setMinimized] = useState(false)
  const [saved, setSaved] = useState(false)

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
      }
    }
    window.addEventListener('greenapply:message', handler)
    setState({ status: 'loading' })

    // Timeout: if no response in 12s, show an error rather than spinning forever
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

  if (state.status === 'idle') return null

  return (
    <div style={{
      pointerEvents: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      width: 320,
    }}>
      {/* Header bar */}
      <div
        onClick={() => setMinimized(m => !m)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: '#fff', borderRadius: minimized ? 12 : '12px 12px 0 0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)', cursor: 'pointer',
          border: '1px solid #e5e7eb', borderBottom: minimized ? undefined : 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🟢</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>GreenApply</span>
        </div>
        <span style={{ fontSize: 16, color: '#9ca3af' }}>{minimized ? '▲' : '▼'}</span>
      </div>

      {/* Body */}
      {!minimized && (
        <div style={{
          background: '#fff', borderRadius: '0 0 12px 12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          border: '1px solid #e5e7eb', borderTop: 'none',
          padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
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
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>Matched Skills</div>
        {match.skillGap.matched.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {match.skillGap.matched.map(skill => (
              <span
                key={skill}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 999,
                  background: '#f0fdf4', color: '#16a34a',
                  border: '1px solid #bbf7d0', fontSize: 11,
                }}
              >
                ✓ {skill}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ color: '#6b7280' }}>No clear skill matches detected.</div>
        )}
      </div>
      {detectedBy && (
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
          Detected by: <strong style={{ color: '#374151' }}>{detectedBy === 'llm' ? 'AI (LLM)' : detectedBy}</strong>
          {langConfPct !== null && ` · confidence ${langConfPct}%`}
          {detectedBy === 'llm' && languageMap.size > 0 && (
            <span style={{ marginLeft: 8, color: '#9ca3af' }}>(levels may be inferred)</span>
          )}
        </div>
      )}

      <div>
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>Language Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {targetLanguages.map(language => {
            const gap = languageMap.get(language.toLowerCase())
            const ex = extractionLangMap.get(language.toLowerCase())
            // If an extraction object exists, prefer it. If extraction exists and
            // contains no requiredLanguages, treat language requirement as not detected.
            const hasSignal = extraction
              ? extractionHasLanguages ? Boolean(ex) : false
              : Boolean(gap)
            const met = extraction
              ? (ex ? !!ex.required : false)
              : (gap?.met ?? false)
            const requiredLevel = extraction
              ? (ex ? (ex.minLevel ?? 'unknown') : 'not detected')
              : (gap?.required ?? 'not detected')
            const actualLevel = extraction ? (ex ? (ex.actual ?? 'not set') : 'not set') : (gap?.actual ?? 'not set')
            return (
              <div
                key={language}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 8px', borderRadius: 6,
                  background: hasSignal ? (met ? '#f0fdf4' : '#fef2f2') : '#f9fafb',
                  border: `1px solid ${hasSignal ? (met ? '#bbf7d0' : '#fecaca') : '#e5e7eb'}`,
                }}
              >
                <span style={{ color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{renderLanguageIcon(language)} {language}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    color: hasSignal ? (gap?.requiredByJob ? '#166534' : '#92400e') : '#6b7280',
                    background: hasSignal ? (gap?.requiredByJob ? '#dcfce7' : '#fef3c7') : '#f3f4f6',
                    border: `1px solid ${hasSignal ? (gap?.requiredByJob ? '#86efac' : '#fcd34d') : '#d1d5db'}`,
                    borderRadius: 999,
                    padding: '1px 6px',
                  }}>
                    {hasSignal ? (gap?.requiredByJob ? 'Required' : 'Optional') : 'Not detected'}
                  </span>
                </span>
                <span style={{ fontWeight: 600, color: hasSignal ? (met ? '#16a34a' : '#dc2626') : '#6b7280', fontSize: 11 }}>
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

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        border: '2px solid #e5e7eb', borderTopColor: '#16a34a',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 13, color: '#6b7280' }}>Analyzing job fit…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ fontSize: 12, color: '#6b7280', padding: '4px 0' }}>
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
