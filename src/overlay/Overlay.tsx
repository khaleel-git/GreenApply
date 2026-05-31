import { useState, useEffect } from 'react'
import type { MatchResult, ContentMessage, ExtractionResult } from '../types'
import { ScoreRing } from './components/ScoreRing'
import { RecommendationBadge } from './components/RecommendationBadge'
import { HardFilterAlert } from './components/HardFilterAlert'
import { SkillGapList } from './components/SkillGapList'
import { JobFreshness } from './components/JobFreshness'
import { ConfidenceCaveat } from './components/ConfidenceCaveat'
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

type LanguageGap = { language: string; required: string; actual: string | null; met: boolean }

function LanguageRequirements({ gaps }: { gaps: LanguageGap[] }) {
  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>Language Requirements</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {gaps.map(g => (
          <div key={g.language} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 8px', borderRadius: 6,
            background: g.met ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${g.met ? '#bbf7d0' : '#fecaca'}`,
          }}>
            <span style={{ color: '#374151' }}>
              {g.language === 'German' ? '🇩🇪' : g.language === 'English' ? '🇬🇧' : g.language === 'French' ? '🇫🇷' : '🌐'}
              {' '}{g.language} {g.required}
            </span>
            <span style={{ fontWeight: 600, color: g.met ? '#16a34a' : '#dc2626', fontSize: 11 }}>
              {g.actual ? `${g.actual} ${g.met ? '✓' : '✗'}` : 'not set'}
            </span>
          </div>
        ))}
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

      {/* Language requirements — always shown when detected, met or not */}
      {match.skillGap.languageGaps.length > 0 && (
        <LanguageRequirements gaps={match.skillGap.languageGaps} />
      )}

      {/* Confidence caveats */}
      {extraction && (
        <ConfidenceCaveat visa={extraction.visa} confidence={extraction.confidence} />
      )}

      {/* Skill gap */}
      {(match.skillGap.matched.length > 0 || match.skillGap.missing.length > 0) && (
        <SkillGapList
          matched={match.skillGap.matched}
          missing={match.skillGap.missing}
          bonus={match.skillGap.bonus}
        />
      )}

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
    </>
  )
}
