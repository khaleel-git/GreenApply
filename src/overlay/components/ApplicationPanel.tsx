import { useState } from 'react'
import type { FormQuestion, ApplicationAnswer } from '../../types'

interface Props {
  questions: FormQuestion[]
  answers: ApplicationAnswer[]
  onFill: (questionId: string, value: string) => void
  onFillAll: (answers: ApplicationAnswer[]) => void
}

const SOURCE_BADGE: Record<ApplicationAnswer['source'], { label: string; color: string; bg: string }> = {
  ai:      { label: 'AI',      color: '#7c3aed', bg: '#f5f3ff' },
  profile: { label: 'Profile', color: '#0369a1', bg: '#e0f2fe' },
  default: { label: 'Default', color: '#92400e', bg: '#fef3c7' },
}

export function ApplicationPanel({ questions, answers: initialAnswers, onFill, onFillAll }: Props) {
  const [answers, setAnswers] = useState<ApplicationAnswer[]>(initialAnswers)
  const [filled, setFilled] = useState<Set<string>>(new Set())

  const questionMap = new Map(questions.map(q => [q.id, q]))

  function updateAnswer(questionId: string, value: string) {
    setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, value } : a))
  }

  function handleFill(answer: ApplicationAnswer) {
    onFill(answer.questionId, answer.value)
    setFilled(prev => new Set([...prev, answer.questionId]))
  }

  function handleFillAll() {
    const toFill = answers.filter(a => a.value.trim())
    onFillAll(toFill)
    setFilled(new Set(toFill.map(a => a.questionId)))
  }

  const filledCount = filled.size
  const totalCount  = answers.filter(a => a.value.trim()).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
          Application Questions
        </div>
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          {filledCount}/{totalCount} filled
        </span>
      </div>

      {answers.length === 0 ? (
        <div style={{ color: '#6b7280', fontSize: 12, padding: '4px 0' }}>
          No questions detected on this page.
        </div>
      ) : (
        <>
          {/* Per-question cards */}
          {answers.map(answer => {
            const q = questionMap.get(answer.questionId)
            if (!q) return null
            const badge = SOURCE_BADGE[answer.source]
            const isFilled = filled.has(answer.questionId)
            const charLen = answer.value.length
            const atLimit = q.maxLength && charLen > q.maxLength

            return (
              <div
                key={answer.questionId}
                style={{
                  border: `1px solid ${isFilled ? '#bbf7d0' : '#e5e7eb'}`,
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: isFilled ? '#f0fdf4' : '#fafafa',
                }}
              >
                {/* Question label row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
                  <div style={{ fontWeight: 600, color: '#374151', lineHeight: 1.3, flex: 1 }}>
                    {q.text}
                    {q.required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                    color: badge.color, background: badge.bg,
                    border: `1px solid ${badge.color}30`,
                    borderRadius: 999, padding: '1px 6px', flexShrink: 0,
                  }}>
                    {badge.label}
                  </span>
                </div>

                {/* Editable answer */}
                {q.type === 'textarea' || q.type === 'text' ? (
                  <textarea
                    value={answer.value}
                    onChange={e => updateAnswer(answer.questionId, e.target.value)}
                    rows={q.type === 'textarea' ? 3 : 1}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '5px 8px', borderRadius: 6, fontSize: 11,
                      border: `1px solid ${atLimit ? '#fca5a5' : '#d1d5db'}`,
                      background: '#fff', resize: 'vertical', fontFamily: 'inherit',
                      lineHeight: 1.4, color: '#111827',
                    }}
                    placeholder={answer.source === 'ai' ? 'Generating…' : 'Enter answer'}
                  />
                ) : (
                  // Select / dropdown — show as editable text for review
                  <select
                    value={answer.value}
                    onChange={e => updateAnswer(answer.questionId, e.target.value)}
                    style={{
                      width: '100%', padding: '5px 8px', borderRadius: 6,
                      border: '1px solid #d1d5db', background: '#fff',
                      fontSize: 11, color: '#111827', boxSizing: 'border-box',
                    }}
                  >
                    <option value="">-- select --</option>
                    {q.options?.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                    {/* Keep current value even if not in options list */}
                    {answer.value && !q.options?.includes(answer.value) && (
                      <option value={answer.value}>{answer.value}</option>
                    )}
                  </select>
                )}

                {/* Character count + fill button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  {q.maxLength ? (
                    <span style={{ fontSize: 10, color: atLimit ? '#dc2626' : '#9ca3af' }}>
                      {charLen} / {q.maxLength}
                    </span>
                  ) : <span />}
                  <button
                    onClick={() => handleFill(answer)}
                    disabled={!answer.value.trim()}
                    style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: 'none', cursor: answer.value.trim() ? 'pointer' : 'not-allowed',
                      background: isFilled ? '#16a34a' : '#374151',
                      color: '#fff', opacity: answer.value.trim() ? 1 : 0.4,
                    }}
                  >
                    {isFilled ? '✓ Filled' : 'Fill'}
                  </button>
                </div>
              </div>
            )
          })}

          {/* Fill all */}
          {totalCount > 1 && (
            <button
              onClick={handleFillAll}
              style={{
                padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                background: filledCount === totalCount ? '#16a34a' : '#111827',
                color: '#fff',
              }}
            >
              {filledCount === totalCount ? '✓ All Filled' : `Fill All (${totalCount})`}
            </button>
          )}

          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, lineHeight: 1.4 }}>
            Review each answer before filling. Edit directly in the boxes above.
          </p>
        </>
      )}
    </div>
  )
}
