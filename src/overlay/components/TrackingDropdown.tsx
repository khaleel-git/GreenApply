import { useState, useEffect } from 'react'
import type { ApplicationStatus } from '../../types'
import { useTheme } from '../../shared/ThemeContext'

const STATUSES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'saved', label: 'Saved', color: '#6b7280' },
  { value: 'applied', label: 'Applied', color: '#2563eb' },
  { value: 'screening', label: 'Screening', color: '#7c3aed' },
  { value: 'interview', label: 'Interview', color: '#d97706' },
  { value: 'offer', label: 'Offer', color: '#16a34a' },
  { value: 'rejected', label: 'Rejected', color: '#dc2626' },
  { value: 'withdrawn', label: 'Withdrawn', color: '#9ca3af' },
]

interface Props {
  jobId: string
}

export function TrackingDropdown({ jobId }: Props) {
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [status, setStatus] = useState<ApplicationStatus>('saved')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Check if already saved
    chrome.runtime.sendMessage({ type: 'GET_APPLICATIONS' }).then(
      (apps: unknown) => {
        const list = apps as Array<{ id: string; jobId: string; status: ApplicationStatus }>
        const app = list?.find(a => a.jobId === jobId)
        if (app) { setApplicationId(app.id); setStatus(app.status) }
      },
    ).catch(() => {})
  }, [jobId])

  async function handleStatusChange(newStatus: ApplicationStatus) {
    setSaving(true)
    setOpen(false)
    try {
      if (!applicationId) {
        // Save first
        const app = await chrome.runtime.sendMessage({ type: 'SAVE_APPLICATION', jobId }) as { id: string } | null
        if (app?.id) {
          setApplicationId(app.id)
          await chrome.runtime.sendMessage({ type: 'UPDATE_STATUS', applicationId: app.id, status: newStatus })
        }
      } else {
        await chrome.runtime.sendMessage({ type: 'UPDATE_STATUS', applicationId, status: newStatus })
      }
      setStatus(newStatus)
    } finally {
      setSaving(false)
    }
  }

  const { colors } = useTheme()
  const current = STATUSES.find(s => s.value === status) ?? STATUSES[0]

  return (
    <div style={{ position: 'relative', pointerEvents: 'auto' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        style={{
          width: '100%', padding: '7px 12px', borderRadius: 8,
          border: `1px solid ${current.color}40`,
          background: `${current.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, color: current.color,
        }}
      >
        <span>{saving ? 'Saving…' : `📋 ${current.label}`}</span>
        <span style={{ fontSize: 10 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4,
          background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8,
          boxShadow: colors.shadow, overflow: 'hidden', zIndex: 10,
        }}>
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              style={{
                display: 'block', width: '100%', padding: '8px 14px',
                border: 'none', background: s.value === status ? `${s.color}15` : colors.bg,
                cursor: 'pointer', textAlign: 'left', fontSize: 12,
                fontWeight: s.value === status ? 700 : 400, color: s.color,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
