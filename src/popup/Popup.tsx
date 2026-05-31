import { useState, useEffect } from 'react'
import type { Application } from '../types'
import type { UsageMetrics } from '../background/db/metrics.store'
import { timeAgo } from '../shared/utils/date.utils'
import { scoreToColor, scoreToEmoji } from '../shared/utils/score.utils'

type Tab = 'dashboard' | 'jobs'

const LISTED_ORIGINS = [
  'linkedin.com', 'indeed.', 'glassdoor.', 'stepstone.de',
  'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com', 'personio.',
  'jobs.tu-berlin.de',
]
const JOB_URL_SIGNALS = [
  '/job/', '/jobs/', '/career/', '/careers/', '/karriere/', '/stellenangebote/',
  '/vacancy/', '/vacancies/', '/position/', '/positions/', '/opening/', '/openings/',
  '/stellenanzeige/', '/jobangebote/', '/search/', '/offre/',
  '/job-postings', '/job-posting',
]

function looksLikeCareerPage(url: string): boolean {
  const lower = url.toLowerCase()
  return JOB_URL_SIGNALS.some(s => lower.includes(s))
}

export function Popup() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null)
  const [activating, setActivating] = useState(false)
  const [activated, setActivated] = useState(false)
  const [alreadyGranted, setAlreadyGranted] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_DASHBOARD_STATS' }).then(setMetrics)
    chrome.runtime.sendMessage({ type: 'GET_APPLICATIONS' }).then(setApplications)
    chrome.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
      const tab = tabs[0]
      if (!tab) return
      setCurrentTab(tab)
      // Check if we already have permission for this origin — if so, SW auto-injects on load
      if (tab.url && !tab.url.startsWith('chrome')) {
        try {
          const origin = new URL(tab.url).origin
          const granted = await chrome.permissions.contains({ origins: [`${origin}/*`] })
          setAlreadyGranted(granted)
        } catch { /* ignore */ }
      }
    })
  }, [])

  const tabUrl = currentTab?.url ?? ''
  const isListedSite = LISTED_ORIGINS.some(o => tabUrl.includes(o))
  const isCareerPage = !isListedSite && looksLikeCareerPage(tabUrl)
  // Only show banner when permission not yet granted for this origin
  const showActivateBanner = isCareerPage && !alreadyGranted && !activated

  async function activateOnPage() {
    if (!currentTab?.id || !currentTab.url) return
    setActivating(true)
    try {
      const origin = new URL(currentTab.url).origin
      const granted = await chrome.permissions.request({ origins: [`${origin}/*`] })
      if (!granted) { setActivating(false); return }

      const files = (chrome.runtime.getManifest().content_scripts?.[0]?.js ?? []) as string[]
      await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files })
      setActivated(true)
      setAlreadyGranted(true)
    } catch { /* ignore */ }
    setActivating(false)
  }

  return (
    <div style={{
      width: 360, minHeight: 400,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', background: '#16a34a', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>🟢</span>
        <span style={{ fontSize: 15, fontWeight: 700 }}>GreenApply</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.8 }}>Know before you apply</span>
      </div>

      {/* Activate banner for unsupported career pages */}
      {showActivateBanner && (
        <div style={{
          padding: '10px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Career page detected</div>
            <div style={{ fontSize: 11, color: '#78350f' }}>Activate GreenApply on this site</div>
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
            {activating ? '…' : 'Activate'}
          </button>
        </div>
      )}
      {activated && (
        <div style={{ padding: '8px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontSize: 12, color: '#16a34a', textAlign: 'center' }}>
          GreenApply activated — reload the page to see scores
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        {(['dashboard', 'jobs'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '10px 0', border: 'none', background: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
            color: activeTab === tab ? '#16a34a' : '#6b7280',
            borderBottom: activeTab === tab ? '2px solid #16a34a' : '2px solid transparent',
          }}>
            {tab === 'dashboard' ? 'Dashboard' : 'Jobs'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {activeTab === 'dashboard' && metrics && <DashboardTab metrics={metrics} />}
        {activeTab === 'jobs' && <JobsTab applications={applications} />}
        {!metrics && activeTab === 'dashboard' && <EmptyState />}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid #e5e7eb', fontSize: 11,
        color: '#9ca3af', display: 'flex', justifyContent: 'space-between',
      }}>
        <span>v0.1.0</span>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: '#16a34a' }}
        >
          Settings →
        </button>
      </div>
    </div>
  )
}

function DashboardTab({ metrics }: { metrics: UsageMetrics }) {
  const savedHours = (metrics.timeSavedMinutes / 60).toFixed(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Time saved headline */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 10, padding: '12px 14px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{savedHours}h</div>
        <div style={{ fontSize: 12, color: '#065f46', marginTop: 2 }}>estimated time saved</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
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
            background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
          </div>
        ))}
      </div>

      {metrics.applicationsSubmitted === 0 && (
        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>
          Browse job listings to start analyzing matches.
        </div>
      )}
    </div>
  )
}

function JobsTab({ applications }: { applications: Application[] }) {
  if (applications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
        No saved jobs yet.<br />
        <span style={{ fontSize: 11 }}>Click "Save Job" on any analyzed job page.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {applications.map(app => (
        <ApplicationCard key={app.id} app={app} />
      ))}
    </div>
  )
}

function ApplicationCard({ app }: { app: Application }) {
  const color = scoreToColor(app.matchScore)
  const emoji = scoreToEmoji(
    app.matchScore >= 75 ? 'green' : app.matchScore >= 50 ? 'yellow' : app.matchScore >= 35 ? 'orange' : 'red',
  )

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
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
      <StatusBadge status={app.status} />
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
