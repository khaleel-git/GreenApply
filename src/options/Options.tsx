import { useState, useEffect, useRef } from 'react'
import type { UserProfile } from '../types'
import { parsePdf } from '../background/parsers/pdf.parser'
import { parseDocx } from '../background/parsers/docx.parser'
import { parseResumeDeterministic } from '../background/parsers/resume.parser'

type Section = 'resume' | 'profile' | 'preferences' | 'api'

export function Options() {
  const [section, setSection] = useState<Section>('resume')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_PROFILE' }).then(p => {
      if (p) setProfile(p as UserProfile)
    })
  }, [])

  async function saveProfile(updates: Partial<UserProfile>) {
    await chrome.runtime.sendMessage({ type: 'SAVE_PROFILE', profile: updates })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const nav: { id: Section; label: string }[] = [
    { id: 'resume', label: '📄 Resume' },
    { id: 'profile', label: '👤 Profile' },
    { id: 'preferences', label: '⚙️ Preferences' },
    { id: 'api', label: '🔑 AI Features' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#f9fafb', borderRight: '1px solid #e5e7eb', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🟢</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>GreenApply</span>
        </div>
        {nav.map(({ id, label }) => (
          <button key={id} onClick={() => setSection(id)} style={{
            display: 'block', width: '100%', padding: '10px 20px', border: 'none',
            background: section === id ? '#fff' : 'none', cursor: 'pointer', textAlign: 'left',
            fontSize: 13, color: section === id ? '#16a34a' : '#374151',
            fontWeight: section === id ? 600 : 400,
            borderLeft: section === id ? '3px solid #16a34a' : '3px solid transparent',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 32, maxWidth: 640 }}>
        {saved && (
          <div style={{
            marginBottom: 16, padding: '8px 16px', borderRadius: 8,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            fontSize: 13, color: '#16a34a',
          }}>
            ✓ Saved
          </div>
        )}

        {section === 'resume' && <ResumeSection />}
        {section === 'profile' && profile && (
          <ProfileSection profile={profile} onSave={saveProfile} />
        )}
        {section === 'preferences' && profile && (
          <PreferencesSection profile={profile} onSave={saveProfile} />
        )}
        {section === 'api' && <ApiSection />}
        {!profile && section !== 'resume' && section !== 'api' && (
          <div style={{ color: '#9ca3af', fontSize: 14 }}>
            Upload your resume first to set up your profile.
          </div>
        )}
      </div>
    </div>
  )
}

function ResumeSection() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      setErrorMsg('Only PDF and DOCX files are supported.')
      return
    }
    setStatus('uploading')
    try {
      const buffer = await file.arrayBuffer()
      const raw = ext === 'pdf'
        ? await parsePdf(buffer)
        : await parseDocx(buffer)
      const resume = parseResumeDeterministic(raw, file.name, ext as 'pdf' | 'docx')
      await chrome.runtime.sendMessage({
        type: 'SAVE_PROFILE',
        profile: {
          resume,
          languages: resume.languages,
        },
      })
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setErrorMsg(String(e))
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Resume</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Upload your resume to enable job matching. Parsed locally — no data is sent anywhere without your API key.
      </p>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: '2px dashed #d1d5db', borderRadius: 12, padding: 32,
          textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
          background: '#f9fafb',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
          {status === 'uploading' ? 'Parsing resume…'
            : status === 'done' ? '✓ Resume uploaded and parsed'
            : 'Drop PDF or DOCX here, or click to browse'}
        </div>
        {status === 'idle' && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>PDF, DOCX — max 5MB</div>
        )}
        {status === 'error' && (
          <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errorMsg}</div>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>
    </div>
  )
}

function ProfileSection({ profile, onSave }: { profile: UserProfile; onSave: (p: Partial<UserProfile>) => void }) {
  const [name, setName] = useState(profile.name)
  const [location, setLocation] = useState(profile.location)
  const [workAuth, setWorkAuth] = useState(profile.workAuth)

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Profile</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Your profile is used for hard filter checking and match scoring.
      </p>

      <Field label="Full name">
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </Field>

      <Field label="Current location (city)">
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Berlin, Germany" style={inputStyle} />
      </Field>

      <Field label="Work authorization">
        <select value={workAuth} onChange={e => setWorkAuth(e.target.value as UserProfile['workAuth'])} style={inputStyle}>
          <option value="citizen">EU Citizen</option>
          <option value="permanent_resident">Permanent Resident</option>
          <option value="eu_blue_card">EU Blue Card</option>
          <option value="work_permit">Work Permit</option>
          <option value="student_visa">Student Visa</option>
          <option value="needs_sponsorship">Needs Visa Sponsorship</option>
        </select>
      </Field>

      <button onClick={() => onSave({ name, location, workAuth })} style={primaryBtn}>
        Save Profile
      </button>
    </div>
  )
}

function PreferencesSection({ profile, onSave }: { profile: UserProfile; onSave: (p: Partial<UserProfile>) => void }) {
  const prefs = profile.preferences
  const [jobTypes, setJobTypes] = useState<string[]>(prefs.jobTypes)
  const [remote, setRemote] = useState(prefs.remotePreference)
  const [minSalary, setMinSalary] = useState(prefs.minSalaryEur?.toString() ?? '')
  const [excluded, setExcluded] = useState(prefs.excludedCompanies.join(', '))

  const jobTypeOptions = [
    { id: 'full-time', label: 'Full-time' },
    { id: 'part-time', label: 'Part-time' },
    { id: 'internship', label: 'Internship' },
    { id: 'werkstudent', label: 'Werkstudent' },
    { id: 'freelance', label: 'Freelance' },
    { id: 'thesis', label: 'Thesis' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Preferences</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Used for hard filters and scoring.
      </p>

      <Field label="Job types">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {jobTypeOptions.map(({ id, label }) => (
            <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={jobTypes.includes(id)}
                onChange={e => setJobTypes(prev => e.target.checked ? [...prev, id] : prev.filter(t => t !== id))}
              />
              {label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Remote preference">
        <select value={remote} onChange={e => setRemote(e.target.value as typeof remote)} style={inputStyle}>
          <option value="any">Any</option>
          <option value="remote">Remote only</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
      </Field>

      <Field label="Minimum salary (EUR/year, optional)">
        <input value={minSalary} onChange={e => setMinSalary(e.target.value)} type="number" placeholder="45000" style={inputStyle} />
      </Field>

      <Field label="Excluded companies (comma-separated)">
        <input value={excluded} onChange={e => setExcluded(e.target.value)} placeholder="Amazon, Uber" style={inputStyle} />
      </Field>

      <button onClick={() => onSave({
        preferences: {
          ...prefs,
          jobTypes: jobTypes as UserProfile['preferences']['jobTypes'],
          remotePreference: remote,
          minSalaryEur: minSalary ? parseInt(minSalary, 10) : undefined,
          excludedCompanies: excluded.split(',').map(s => s.trim()).filter(Boolean),
        },
      })} style={primaryBtn}>
        Save Preferences
      </button>
    </div>
  )
}

function ApiSection() {
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.storage.local.get('nvidiaApiKey').then(r => {
      if (r.nvidiaApiKey) setKey(r.nvidiaApiKey)
    })
  }, [])

  async function handleSave() {
    await chrome.storage.local.set({ nvidiaApiKey: key.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111827' }}>AI Features</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Optional. Provide an NVIDIA NIM API key to unlock AI-generated score explanations and cover letter generation.
        The key is stored locally and never shared.
      </p>
      <Field label="NVIDIA NIM API Key">
        <input
          value={key} onChange={e => setKey(e.target.value)}
          type="password" placeholder="nvapi-…" style={inputStyle}
        />
      </Field>
      <button onClick={handleSave} style={primaryBtn}>
        {saved ? '✓ Saved' : 'Save Key'}
      </button>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
        Get a free key at build.nvidia.com
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}

const primaryBtn: React.CSSProperties = {
  marginTop: 8, padding: '10px 24px', background: '#16a34a', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: 'pointer',
}
