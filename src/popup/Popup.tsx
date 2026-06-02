import { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from '../shared/ThemeContext'
import type { Application, JobListing } from '../types'
import type { UsageMetrics } from '../background/db/metrics.store'
import { timeAgo } from '../shared/utils/date.utils'
import { scoreToColor, scoreToEmoji } from '../shared/utils/score.utils'

type Tab = 'dashboard' | 'jobs'

// Sites already covered by declarative content_scripts — no enable button needed
const LISTED_ORIGINS = [
  'linkedin.com', 'indeed.', 'glassdoor.', 'stepstone.de',
  'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com', 'personio.',
  'jobs.tu-berlin.de', 'successfactors.com', 'successfactors.eu', 'taleo.net',
  'bamboohr.com', 'icims.com', 'recruitee.com', 'softgarden.', 'smartrecruiters.com',
  'xing.com', 'jobteaser.com', 'absolventa.de', 'workwise.io', 'join.com',
  'monster.de', 'monster.com', 'jobware.de',
]

export function Popup() {
  return <ThemeProvider><PopupInner /></ThemeProvider>
}

function PopupInner() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null)
  const [activating, setActivating] = useState(false)
  const [enabledSites, setEnabledSites] = useState<string[]>([])
  const [extensionOn, setExtensionOn] = useState(true)
  const { colors, theme, toggleTheme } = useTheme()

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_DASHBOARD_STATS' }).then(setMetrics).catch(() => {})
    chrome.runtime.sendMessage({ type: 'GET_APPLICATIONS' }).then(setApplications).catch(() => {})
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) setCurrentTab(tabs[0])
    })
    chrome.storage.local.get(['enabledSites', 'extensionEnabled']).then(({ enabledSites: stored, extensionEnabled }) => {
      if (Array.isArray(stored)) setEnabledSites(stored)
      setExtensionOn(extensionEnabled !== false)
    }).catch(() => {})
  }, [])

  function toggleExtension() {
    const next = !extensionOn
    setExtensionOn(next)
    chrome.storage.local.set({ extensionEnabled: next }).catch(() => {})
  }

  const tabUrl = currentTab?.url ?? ''
  const isChromePage = !tabUrl || tabUrl.startsWith('chrome') || tabUrl.startsWith('about')
  const isListedSite = LISTED_ORIGINS.some(o => tabUrl.includes(o))

  let currentHostname = ''
  try { currentHostname = new URL(tabUrl).hostname } catch { /* ignore */ }

  const isSiteEnabled = enabledSites.includes(currentHostname)
  // Show enable button on any real page that isn't already handled
  const showEnableBanner = !isChromePage && !isListedSite && !isSiteEnabled
  const showActiveBadge  = !isChromePage && !isListedSite && isSiteEnabled

  async function activateOnPage() {
    if (!currentTab?.id || !currentTab.url || !currentHostname) return
    setActivating(true)
    try {
      const origin = new URL(currentTab.url).origin
      // Request host permission (shows Chrome's one-time permission dialog)
      const granted = await chrome.permissions.request({ origins: [`${origin}/*`] })
      if (!granted) { setActivating(false); return }

      // Persist so the background auto-injects on every future visit
      const next = [...new Set([...enabledSites, currentHostname])]
      await chrome.storage.local.set({ enabledSites: next })
      setEnabledSites(next)

      // Inject into the current tab right away — no reload needed
      const files = (chrome.runtime.getManifest().content_scripts?.[0]?.js ?? []) as string[]
      if (files.length) {
        await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files }).catch(() => {})
      }
    } catch { /* ignore */ }
    setActivating(false)
  }

  return (
    <div style={{
      width: 360, minHeight: 400,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
      background: colors.bg, color: colors.text,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: extensionOn ? '#16a34a' : '#6b7280', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s',
      }}>
        <span style={{ fontSize: 18 }}>🟢</span>
        <span style={{ fontSize: 15, fontWeight: 700 }}>GreenApply</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Dark / light theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 16, padding: 0, lineHeight: 1,
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {/* On/Off toggle */}
          <span style={{ fontSize: 11, opacity: 0.85 }}>{extensionOn ? 'On' : 'Off'}</span>
          <button
            onClick={toggleExtension}
            title={extensionOn ? 'Turn off GreenApply' : 'Turn on GreenApply'}
            style={{
              width: 40, height: 22, borderRadius: 999, border: 'none',
              background: extensionOn ? '#ffffff40' : '#ffffff25',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              padding: 0,
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: extensionOn ? 21 : 3,
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>

      {/* Enable banner — shown on any site not already covered */}
      {showEnableBanner && (
        <div style={{
          padding: '10px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>
              {currentHostname || 'This site'}
            </div>
            <div style={{ fontSize: 11, color: '#78350f' }}>Enable GreenApply here</div>
          </div>
          <button
            onClick={activateOnPage}
            disabled={activating}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: activating ? 'default' : 'pointer', opacity: activating ? 0.7 : 1,
            }}
          >
            {activating ? '…' : 'Enable'}
          </button>
        </div>
      )}
      {showActiveBadge && (
        <div style={{
          padding: '7px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0',
          fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>✓</span>
          <span>GreenApply active on <strong>{currentHostname}</strong></span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
        {(['dashboard', 'jobs'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '10px 0', border: 'none', background: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
            color: activeTab === tab ? '#16a34a' : colors.textMuted,
            borderBottom: activeTab === tab ? '2px solid #16a34a' : '2px solid transparent',
          }}>
            {tab === 'dashboard' ? 'Dashboard' : 'Jobs'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: colors.bg }}>
        {activeTab === 'dashboard' && metrics && <DashboardTab metrics={metrics} />}
        {activeTab === 'jobs' && (
          <JobsTab
            applications={applications}
            onDownloadCsv={() => downloadApplicationsCsv(applications)}
            onUpdateJob={async (applicationId, jobPatch) => {
              await chrome.runtime.sendMessage({ type: 'UPDATE_APPLICATION_DETAILS', applicationId, jobPatch })
              setApplications(prev => prev.map(app => (
                app.id === applicationId ? { ...app, job: { ...app.job, ...jobPatch } } : app
              )))
            }}
            onDeleteJob={async applicationId => {
              await chrome.runtime.sendMessage({ type: 'DELETE_APPLICATION', applicationId })
              setApplications(prev => prev.filter(app => app.id !== applicationId))
            }}
          />
        )}
        {!metrics && activeTab === 'dashboard' && <EmptyState />}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', borderTop: `1px solid ${colors.border}`, fontSize: 11,
        color: colors.textMuted, display: 'flex', justifyContent: 'space-between',
        background: colors.bg,
      }}>
        <span>v0.1.0</span>
        <button
          onClick={() => { try { chrome.runtime.openOptionsPage() } catch { } }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: '#16a34a' }}
        >
          Settings →
        </button>
      </div>
    </div>
  )
}

function DashboardTab({ metrics }: { metrics: UsageMetrics }) {
  const { colors } = useTheme()
  const savedHours = (metrics.timeSavedMinutes / 60).toFixed(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Time saved headline */}
      <div style={{
        background: colors.bgSecondary, border: `1px solid ${colors.border}`,
        borderRadius: 10, padding: '12px 14px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{savedHours}h</div>
        <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2, opacity: 0.8 }}>estimated time saved</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
          {metrics.jobsSkipped} jobs skipped · {metrics.jobsAnalyzed} analyzed
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Saved', value: metrics.jobsSaved, icon: '💾' },
          { label: 'Applied', value: metrics.applicationsSubmitted, icon: '📤' },
          { label: 'Interviews', value: metrics.interviews, icon: '📅' },
          { label: 'Offers', value: metrics.offers, icon: '🎉' },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            background: colors.bgSecondary, borderRadius: 8, padding: '10px 12px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{value}</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>{label}</div>
          </div>
        ))}
      </div>

      {metrics.applicationsSubmitted === 0 && (
        <div style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', padding: '8px 0' }}>
          Browse job listings to start analyzing matches.
        </div>
      )}
    </div>
  )
}

function JobsTab({
  applications,
  onDownloadCsv,
  onUpdateJob,
  onDeleteJob,
}: {
  applications: Application[]
  onDownloadCsv: () => void
  onUpdateJob: (applicationId: string, jobPatch: Partial<Pick<JobListing, 'title' | 'company' | 'location' | 'url'>>) => Promise<void>
  onDeleteJob: (applicationId: string) => Promise<void>
}) {
  if (applications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
        No saved jobs yet.<br />
        <span style={{ fontSize: 11 }}>Click "Save Job" on any analyzed job page.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        onClick={onDownloadCsv}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          background: '#fff',
          color: '#374151',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Download CSV
      </button>
      {applications.map(app => (
        <ApplicationCard key={app.id} app={app} onUpdateJob={onUpdateJob} onDeleteJob={onDeleteJob} />
      ))}
    </div>
  )
}

function ApplicationCard({
  app,
  onUpdateJob,
  onDeleteJob,
}: {
  app: Application
  onUpdateJob: (applicationId: string, jobPatch: Partial<Pick<JobListing, 'title' | 'company' | 'location' | 'url'>>) => Promise<void>
  onDeleteJob: (applicationId: string) => Promise<void>
}) {
  const color = scoreToColor(app.matchScore)
  const [status, setStatus] = useState<Application['status']>(app.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [draft, setDraft] = useState({
    title: app.job.title,
    company: app.job.company,
    location: app.job.location,
    url: app.job.url,
  })

  useEffect(() => {
    setStatus(app.status)
  }, [app.status])

  useEffect(() => {
    setDraft({
      title: app.job.title,
      company: app.job.company,
      location: app.job.location,
      url: app.job.url,
    })
  }, [app.job.title, app.job.company, app.job.location, app.job.url])

  async function handleStatusChange(nextStatus: Application['status']) {
    if (nextStatus === status) return
    setSavingStatus(true)
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_STATUS',
        applicationId: app.id,
        status: nextStatus,
      })
      setStatus(nextStatus)
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleSaveEdit() {
    setSavingEdit(true)
    try {
      await onUpdateJob(app.id, {
        title: draft.title.trim(),
        company: draft.company.trim(),
        location: draft.location.trim(),
        url: draft.url.trim(),
      })
      setEditing(false)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this tracked job?')) return
    await onDeleteJob(app.id)
  }

  async function openJobUrl() {
    if (!app.job.url) return
    await chrome.tabs.create({ url: app.job.url })
  }

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div
        onClick={openJobUrl}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: app.job.url ? 'pointer' : 'default' }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color, flexShrink: 0,
        }}>
          {app.matchScore}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {app.job.title}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {app.job.company} · {timeAgo(app.createdAt)}
          </div>
        </div>
        <StatusBadge status={status} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            onClick={e => {
              e.stopPropagation()
              setEditing(o => !o)
            }}
            style={{
              border: '1px solid #d1d5db', background: '#fff', color: '#374151',
              borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {editing ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              void handleDelete()
            }}
            style={{
              border: '1px solid #fecaca', background: '#fff', color: '#dc2626',
              borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {editing && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ marginTop: 2, width: '100%', display: 'grid', gap: 8 }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Status</label>
            <select
              value={status}
              disabled={savingStatus}
              onClick={e => e.stopPropagation()}
              onChange={e => handleStatusChange(e.target.value as Application['status'])}
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: '#fff',
                color: '#374151',
                fontSize: 12,
                padding: '6px 8px',
                cursor: savingStatus ? 'default' : 'pointer',
              }}
            >
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Title</label>
            <input
              value={draft.title}
              onClick={e => e.stopPropagation()}
              onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
              style={{
                width: '100%', border: '1px solid #d1d5db', borderRadius: 6,
                padding: '6px 8px', fontSize: 12, color: '#111827',
              }}
            />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Company</label>
            <input
              value={draft.company}
              onClick={e => e.stopPropagation()}
              onChange={e => setDraft(prev => ({ ...prev, company: e.target.value }))}
              style={{
                width: '100%', border: '1px solid #d1d5db', borderRadius: 6,
                padding: '6px 8px', fontSize: 12, color: '#111827',
              }}
            />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Location</label>
            <input
              value={draft.location}
              onClick={e => e.stopPropagation()}
              onChange={e => setDraft(prev => ({ ...prev, location: e.target.value }))}
              style={{
                width: '100%', border: '1px solid #d1d5db', borderRadius: 6,
                padding: '6px 8px', fontSize: 12, color: '#111827',
              }}
            />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>URL</label>
            <input
              value={draft.url}
              onClick={e => e.stopPropagation()}
              onChange={e => setDraft(prev => ({ ...prev, url: e.target.value }))}
              style={{
                width: '100%', border: '1px solid #d1d5db', borderRadius: 6,
                padding: '6px 8px', fontSize: 12, color: '#111827',
              }}
            />
          </div>
          <button
            onClick={e => {
              e.stopPropagation()
              void handleSaveEdit()
            }}
            disabled={savingEdit}
            style={{
              marginTop: 2, border: 'none', background: '#16a34a', color: '#fff',
              borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 700,
              cursor: savingEdit ? 'default' : 'pointer',
              opacity: savingEdit ? 0.7 : 1,
            }}
          >
            {savingEdit ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const config: Record<Application['status'], { label: string; color: string; bg: string }> = {
    saved: { label: 'Saved', color: '#6b7280', bg: '#f3f4f6' },
    applied: { label: 'Applied', color: '#2563eb', bg: '#eff6ff' },
    screening: { label: 'Screening', color: '#7c3aed', bg: '#f5f3ff' },
    interview: { label: 'Interview', color: '#d97706', bg: '#fef3c7' },
    offer: { label: 'Offer', color: '#16a34a', bg: '#f0fdf4' },
    accepted: { label: 'Accepted', color: '#16a34a', bg: '#dcfce7' },
    rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' },
    withdrawn: { label: 'Withdrawn', color: '#6b7280', bg: '#f9fafb' },
  }
  const { label, color, bg } = config[status]
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, color, background: bg, fontWeight: 600, flexShrink: 0 }}>
      {label}
    </span>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>
      Loading…
    </div>
  )
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function formatCsvDate(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp).toISOString()
}

function downloadApplicationsCsv(applications: Application[]): void {
  const headers = [
    'status',
    'job_title',
    'company',
    'location',
    'platform',
    'match_score',
    'job_url',
    'job_id',
    'created_at',
    'updated_at',
    'applied_at',
    'notes',
  ]

  const rows = applications
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(app => [
      app.status,
      app.job.title,
      app.job.company,
      app.job.location,
      app.job.platform,
      app.matchScore,
      app.job.url,
      app.jobId,
      formatCsvDate(app.createdAt),
      formatCsvDate(app.updatedAt),
      formatCsvDate(app.appliedAt),
      app.notes,
    ].map(csvEscape).join(','))

  const csv = [headers.map(csvEscape).join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `greenapply-tracked-jobs-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
