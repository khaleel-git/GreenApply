import { useState, useEffect, useRef } from 'react'
import { ThemeProvider, useTheme } from '../shared/ThemeContext'
import type { UserProfile, LanguageEntry, AcademicProfile, DegreeLevel } from '../types'
import { parsePdf } from '../background/parsers/pdf.parser'
import { parseDocx } from '../background/parsers/docx.parser'
import { parseResumeDeterministic } from '../background/parsers/resume.parser'
import { parseTranscript } from '../background/parsers/transcript.parser'
import { buildResumeIndex } from '../background/nim/vectorstore'

type Section = 'resume' | 'export' | 'academic' | 'profile' | 'languages' | 'preferences' | 'api'

// Default so every section is usable before a résumé is uploaded — saving creates
// the profile on the backend.
const EMPTY_PROFILE: UserProfile = {
  id: 'main', name: '', email: '', location: '', targetLocations: [],
  workAuth: 'needs_sponsorship',
  preferences: {
    jobTypes: ['full-time'], remotePreference: 'any', minSalaryEur: undefined,
    excludedCompanies: [], targetRoles: [], targetIndustries: [], uiLanguage: 'en',
    treatInferredLanguagesAsHardFilter: true,
  },
  languages: [], skills: [], createdAt: 0, updatedAt: 0,
}

export function Options() {
  return <ThemeProvider><OptionsInner /></ThemeProvider>
}

function OptionsInner() {
  const { colors, theme, toggleTheme } = useTheme()
  const [section, setSection] = useState<Section>('resume')
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_PROFILE' }).then(p => {
      if (p) setProfile({ ...EMPTY_PROFILE, ...(p as UserProfile) })
    }).catch(() => {})
  }, [])

  async function saveProfile(updates: Partial<UserProfile>) {
    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_PROFILE', profile: updates })
      setProfile(prev => ({ ...prev, ...updates }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      // extension may be reloading or unavailable — avoid uncaught rejection
      // eslint-disable-next-line no-console
      console.warn('Failed to save profile via runtime.sendMessage', e)
    }
  }

  const nav: { id: Section; label: string }[] = [
    { id: 'resume', label: '📄 Resume' },
    { id: 'export', label: '💾 Export / Import' },
    { id: 'academic', label: '🎓 Academic' },
    { id: 'profile', label: '👤 Profile' },
    { id: 'languages', label: '🗣️ Languages & Skills' },
    { id: 'preferences', label: '⚙️ Preferences' },
    { id: 'api', label: '🔑 AI Features' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: colors.bg, color: colors.text }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: colors.bgSecondary, borderRight: `1px solid ${colors.border}`, padding: '24px 0' }}>
        <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🟢</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>GreenApply</span>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        {nav.map(({ id, label }) => (
          <button key={id} onClick={() => setSection(id)} style={{
            display: 'block', width: '100%', padding: '10px 20px', border: 'none',
            background: section === id ? colors.bg : 'none', cursor: 'pointer', textAlign: 'left',
            fontSize: 13, color: section === id ? '#16a34a' : colors.textSecondary,
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
        {section === 'export' && <ExportImportSection />}
        {section === 'academic' && (
          <AcademicSection profile={profile} onSave={saveProfile} />
        )}
        {section === 'profile' && (
          <ProfileSection profile={profile} onSave={saveProfile} />
        )}
        {section === 'languages' && (
          <LanguagesSkillsSection profile={profile} onSave={saveProfile} />
        )}
        {section === 'preferences' && (
          <PreferencesSection profile={profile} onSave={saveProfile} />
        )}
        {section === 'api' && <ApiSection />}
      </div>
    </div>
  )
}

function ResumeSection() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'indexing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [existingFile, setExistingFile] = useState<{ fileName: string; fileType: string; dataBase64: string; uploadedAt: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_FILE', id: 'resume' }).then((f: any) => {
      if (f) setExistingFile(f)
    }).catch(() => {})
  }, [])

  function downloadResume() {
    if (!existingFile) return
    const mime = existingFile.fileType === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const a = document.createElement('a')
    a.href = `data:${mime};base64,${existingFile.dataBase64}`
    a.download = existingFile.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

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
      // Merge new resume skills with whatever the user has already saved
      const currentProfile = await chrome.runtime.sendMessage({ type: 'GET_PROFILE' }).catch(() => null) as any
      const existingSkills: string[] = currentProfile?.skills ?? []
      const mergedSkills = [...new Set([...existingSkills, ...(resume.skills ?? [])])]
      // Save parsed resume into profile and upload raw file bytes to SW so
      // exported config can include the original uploaded file.
      await chrome.runtime.sendMessage({ type: 'UPLOAD_RESUME', fileName: file.name, fileBuffer: buffer, fileType: ext })
      await chrome.runtime.sendMessage({
        type: 'SAVE_PROFILE',
        profile: {
          resume,
          languages: resume.languages,
          skills: mergedSkills,
        },
      })
      // Build vector index for cover letter generation (requires API key)
      setStatus('indexing')
      await buildResumeIndex(resume).catch(() => { /* no API key yet — index built later */ })
      setStatus('done')
      // Refresh the existing-file card
      chrome.runtime.sendMessage({ type: 'GET_FILE', id: 'resume' }).then((f: any) => {
        if (f) setExistingFile(f)
      }).catch(() => {})
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

      {existingFile && status === 'idle' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', marginBottom: 16, borderRadius: 10,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{existingFile.fileType === 'pdf' ? '📄' : '📝'}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{existingFile.fileName}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                Uploaded {new Date(existingFile.uploadedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <button onClick={downloadResume} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid #16a34a',
            background: '#fff', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            ↓ Download
          </button>
        </div>
      )}

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
            : status === 'indexing' ? 'Building cover letter index…'
            : status === 'done' ? '✓ Resume uploaded and indexed'
            : existingFile ? 'Drop a new PDF or DOCX here to replace'
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
  const inputStyle = useInputStyle()
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

      <Field label="Location">
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Berlin, Germany" style={inputStyle} />
      </Field>

      <Field label="Work authorization">
        <select value={workAuth} onChange={e => setWorkAuth(e.target.value as UserProfile['workAuth'])} style={inputStyle}>
          <option value="citizen">EU Citizen</option>
          <option value="eu_freedom_of_movement">EU Freedom of Movement</option>
          <option value="blue_card">EU Blue Card</option>
          <option value="work_permit">Work Permit</option>
          <option value="needs_sponsorship">Needs Sponsorship</option>
        </select>
      </Field>

      <button onClick={() => onSave({ name, location, workAuth })} style={primaryBtn}>
        Save Profile
      </button>
    </div>
  )
}

const COMMON_LANGUAGES = ['German', 'English', 'French', 'Spanish', 'Italian', 'Dutch', 'Portuguese', 'Mandarin', 'Arabic', 'Hindi', 'Russian', 'Turkish']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native']

function LanguagesSkillsSection({ profile, onSave }: { profile: UserProfile; onSave: (p: Partial<UserProfile>) => void }) {
  const [languages, setLanguages] = useState<LanguageEntry[]>(
    profile.languages.length ? profile.languages : [
      { language: 'German', level: 'B1' },
      { language: 'English', level: 'C1' },
    ],
  )
  const [skills, setSkills] = useState((profile.skills ?? []).join(', '))

  const resumeSkills = profile.resume?.skills ?? []

  function updateLang(i: number, patch: Partial<LanguageEntry>) {
    setLanguages(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function save() {
    const cleanLangs = languages.filter(l => l.language.trim())
    const cleanSkills = skills.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    onSave({ languages: cleanLangs, skills: cleanSkills })
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Languages &amp; Skills</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Your language levels drive the language-gap check (e.g. a job requiring German B2 when
        you're at A2). Your skills drive the skill-match score. These work even without a résumé.
      </p>

      <Field label="Languages">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {languages.map((lang, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                list="ga-language-list"
                value={lang.language}
                onChange={e => updateLang(i, { language: e.target.value })}
                placeholder="Language"
                style={{ ...inputStyle, flex: 1 }}
              />
              <select
                value={lang.level}
                onChange={e => updateLang(i, { level: e.target.value })}
                style={{ ...inputStyle, width: 110 }}
              >
                {CEFR_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
              <button
                onClick={() => setLanguages(prev => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove language"
                style={{
                  border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8,
                  width: 34, height: 34, cursor: 'pointer', color: '#dc2626', fontSize: 16, flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <datalist id="ga-language-list">
            {COMMON_LANGUAGES.map(l => <option key={l} value={l} />)}
          </datalist>
          <button
            onClick={() => setLanguages(prev => [...prev, { language: '', level: 'B2' }])}
            style={{
              alignSelf: 'flex-start', marginTop: 2, padding: '6px 12px', borderRadius: 8,
              border: '1px dashed #16a34a', background: '#f0fdf4', color: '#16a34a',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Add language
          </button>
        </div>
      </Field>

      <Field label="Skills (comma-separated)">
        <textarea
          value={skills}
          onChange={e => setSkills(e.target.value)}
          placeholder="Python, Machine Learning, Deep Learning, Bash, Forensics"
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
        {resumeSkills.length > 0 && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
            Auto-detected from your résumé (also counted): {resumeSkills.slice(0, 20).join(', ')}
            {resumeSkills.length > 20 ? '…' : ''}
          </p>
        )}
      </Field>

      <button onClick={save} style={primaryBtn}>Save Languages &amp; Skills</button>
    </div>
  )
}

function PreferencesSection({ profile, onSave }: { profile: UserProfile; onSave: (p: Partial<UserProfile>) => void }) {
  const prefs = profile.preferences
  const [jobTypes, setJobTypes] = useState<string[]>(prefs.jobTypes)
  const [remote, setRemote] = useState(prefs.remotePreference)
  const [minSalary, setMinSalary] = useState(prefs.minSalaryEur?.toString() ?? '')
  const [excluded, setExcluded] = useState(prefs.excludedCompanies.join(', '))
  const [treatInferred, setTreatInferred] = useState<boolean>(prefs.treatInferredLanguagesAsHardFilter ?? true)

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

      <Field label="Inferred language requirements">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={treatInferred} onChange={e => setTreatInferred(e.target.checked)} />
          <div style={{ fontSize: 13 }}>Treat AI-inferred language requirements as hard filters</div>
        </label>
      </Field>

      <button onClick={() => onSave({
        preferences: {
          ...prefs,
          jobTypes: jobTypes as UserProfile['preferences']['jobTypes'],
          remotePreference: remote,
          minSalaryEur: minSalary ? parseInt(minSalary, 10) : undefined,
          excludedCompanies: excluded.split(',').map(s => s.trim()).filter(Boolean),
          treatInferredLanguagesAsHardFilter: treatInferred,
        },
      })} style={primaryBtn}>
        Save Preferences
      </button>
    </div>
  )
}

function ExportImportSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPayload, setImportPayload] = useState<any>(null)
  const [importPreview, setImportPreview] = useState<Record<string, number | boolean>>({})
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Export / Import</h2>
      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0, marginBottom: 8 }}>
        Export your configuration (resume, profile, skills, preferences, rules, and related data) to a JSON file. Import to restore it later without re-uploading your résumé.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={async () => {
          try {
            const data = await chrome.runtime.sendMessage({ type: 'EXPORT_CONFIG' })
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `greenapply-config-${new Date().toISOString().slice(0,10)}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Export failed', e)
          }
        }} style={{ ...primaryBtn, background: '#0f766e' }}>
          Export Configuration
        </button>

        <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }}
          onChange={async e => {
            const f = e.target.files?.[0]
            if (!f) return
            setImportStatus(null)
            try {
              const text = await f.text()
              const parsed = JSON.parse(text)
              const preview: Record<string, number | boolean> = {
                profile: !!parsed.profile,
                jobs: Array.isArray(parsed.jobs) ? parsed.jobs.length : 0,
                applications: Array.isArray(parsed.applications) ? parsed.applications.length : 0,
                files: Array.isArray(parsed.files) ? parsed.files.length : 0,
                resumeChunks: Array.isArray(parsed.resumeChunks) ? parsed.resumeChunks.length : 0,
                rules: Array.isArray(parsed.rules) ? parsed.rules.length : 0,
                metrics: Array.isArray(parsed.metrics) ? parsed.metrics.length : 0,
                companies: Array.isArray(parsed.companies) ? parsed.companies.length : 0,
                extractions: Array.isArray(parsed.extractions) ? parsed.extractions.length : 0,
                matches: Array.isArray(parsed.matches) ? parsed.matches.length : 0,
              }
              setImportPayload(parsed)
              setImportPreview(preview)
              setShowImportModal(true)
            } catch (err) {
              setImportStatus('Invalid JSON file')
              setTimeout(() => setImportStatus(null), 3000)
              if (fileRef.current) fileRef.current.value = ''
            }
          }} />

        <button onClick={() => fileRef.current?.click()} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
          Import Configuration
        </button>
        {importStatus && <div style={{ fontSize: 12, color: '#374151' }}>{importStatus}</div>}
      </div>

      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: 520, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>Confirm Import</h3>
            <p style={{ color: '#6b7280' }}>This will overwrite or merge data in your extension based on the selected mode. Review the counts below and confirm to proceed.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {Object.entries(importPreview).map(([k, v]) => (
                <div key={k} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{k}</strong>: {String(v)}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="radio" name="importMode" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /> Merge (safe)
              </label>
              <label style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /> Replace (overwrite all)
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => {
                setShowImportModal(false)
                if (fileRef.current) fileRef.current.value = ''
              }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}>Cancel</button>
              <button onClick={async () => {
                if (!importPayload) return
                setImportStatus('Importing...')
                setShowImportModal(false)
                try {
                  await chrome.runtime.sendMessage({ type: 'IMPORT_CONFIG', payload: importPayload, mode: importMode })
                  setImportStatus('Import successful')
                } catch (err) {
                  setImportStatus('Import failed')
                }
                setTimeout(() => setImportStatus(null), 2500)
                if (fileRef.current) fileRef.current.value = ''
              }} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff' }}>Confirm Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ApiSection() {
  const inputStyle = useInputStyle()
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Source of truth is chrome.storage.local (what the NIM client reads)
    chrome.storage.local.get('nvidiaApiKey').then(res => {
      if (res.nvidiaApiKey) setKey(res.nvidiaApiKey as string)
    }).catch(() => {})
  }, [])

  async function handleSave() {
    // Write to chrome.storage.local so the NIM client picks it up immediately
    await chrome.storage.local.set({ nvidiaApiKey: key })
    // Also mirror to profile so it's included in exports
    await chrome.runtime.sendMessage({ type: 'SAVE_PROFILE', profile: { nimApiKey: key } }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111827' }}>AI Features</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Enter your NVIDIA NIM API key to enable cover letter generation and resume-to-job semantic matching.
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

// ─── Academic section ─────────────────────────────────────────────────────────

const DEGREE_LABELS: Record<DegreeLevel, string> = {
  bachelor_student:  'Bachelor Student (currently enrolled)',
  bachelor_graduate: 'Bachelor Graduate',
  master_student:    'Master Student (currently enrolled)',
  master_graduate:   'Master Graduate',
  phd_student:       'PhD Student (currently enrolled)',
  phd_graduate:      'PhD Graduate',
  other:             'Other',
}

function AcademicSection({ profile, onSave }: { profile: UserProfile; onSave: (u: Partial<UserProfile>) => Promise<void> }) {
  const existing = profile.academic
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>(existing?.degreeLevel ?? 'bachelor_student')
  const [fieldOfStudy, setFieldOfStudy] = useState(existing?.fieldOfStudy ?? '')
  const [university, setUniversity] = useState(existing?.university ?? '')
  const [courses, setCourses] = useState<string[]>(existing?.courses ?? [])
  const [certifications, setCertifications] = useState<string[]>(existing?.certifications ?? [])
  const [newCert, setNewCert] = useState('')
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>(existing?.uploadedFileNames ?? [])
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const [certUploadStatus, setCertUploadStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [certUploadError, setCertUploadError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const certInputRef = useRef<HTMLInputElement>(null)

  async function handleDocUpload(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      setUploadError('Only PDF and DOCX supported')
      setUploadStatus('error')
      return
    }
    setUploadStatus('parsing')
    setUploadError('')
    try {
      const buffer = await file.arrayBuffer()
      const raw = ext === 'pdf' ? await parsePdf(buffer) : await parseDocx(buffer)
      const result = parseTranscript(raw)

      // Merge extracted courses with existing (deduplicate)
      const merged = [...new Set([...courses, ...result.courses])]
      setCourses(merged)
      if (result.university && !university) setUniversity(result.university)
      if (result.fieldOfStudy && !fieldOfStudy) setFieldOfStudy(result.fieldOfStudy)
      if (result.degreeHint && degreeLevel === 'bachelor_student') setDegreeLevel(result.degreeHint)
      setUploadedFileNames(prev => [...new Set([...prev, file.name])])
      setUploadStatus('done')
    } catch (e) {
      setUploadError(String(e))
      setUploadStatus('error')
    }
  }

  async function handleCertUpload(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      setCertUploadError('Only PDF and DOCX supported')
      setCertUploadStatus('error')
      return
    }
    setCertUploadStatus('parsing')
    setCertUploadError('')
    try {
      const buffer = await file.arrayBuffer()
      const raw = ext === 'pdf' ? await parsePdf(buffer) : await parseDocx(buffer)
      const result = parseTranscript(raw)
      const extracted = result.certifications
      if (extracted.length > 0) {
        setCertifications(prev => [...new Set([...prev, ...extracted])])
        setCertUploadStatus('done')
      } else {
        // Fallback: use filename (without extension) as cert name
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        setCertifications(prev => [...new Set([...prev, name])])
        setCertUploadStatus('done')
      }
    } catch (e) {
      setCertUploadError(String(e))
      setCertUploadStatus('error')
    }
  }

  async function save() {
    const academic: AcademicProfile = {
      degreeLevel, fieldOfStudy, university,
      courses, certifications, uploadedFileNames,
      uploadedAt: Date.now(),
    }
    await onSave({ academic })
  }

  function removeCourse(c: string) { setCourses(prev => prev.filter(x => x !== c)) }
  function addCert() {
    const t = newCert.trim()
    if (t) { setCertifications(prev => [...prev, t]); setNewCert('') }
  }
  function removeCert(c: string) { setCertifications(prev => prev.filter(x => x !== c)) }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Academic Profile</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
        Upload your transcript, enrollment letter, or certificates. GreenApply extracts your courses and uses them to match you with relevant student positions.
      </p>

      {/* Degree level */}
      <Field label="Degree Level">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(DEGREE_LABELS) as DegreeLevel[]).map(d => (
            <button key={d} onClick={() => setDegreeLevel(d)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: `2px solid ${degreeLevel === d ? '#16a34a' : '#d1d5db'}`,
              background: degreeLevel === d ? '#f0fdf4' : '#fff',
              color: degreeLevel === d ? '#16a34a' : '#374151',
              fontWeight: degreeLevel === d ? 700 : 400,
            }}>
              {DEGREE_LABELS[d]}
            </button>
          ))}
        </div>
      </Field>

      {/* Field + university */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Field label="Field of Study">
          <input style={inputStyle} placeholder="e.g. Computer Science" value={fieldOfStudy}
            onChange={e => setFieldOfStudy(e.target.value)} />
        </Field>
        <Field label="University">
          <input style={inputStyle} placeholder="e.g. TU Berlin" value={university}
            onChange={e => setUniversity(e.target.value)} />
        </Field>
      </div>

      {/* Document upload */}
      <Field label="Upload Academic Documents">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleDocUpload(f) }}
          style={{
            border: '2px dashed #d1d5db', borderRadius: 10, padding: '20px 16px',
            textAlign: 'center', cursor: 'pointer', background: '#f9fafb',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>📄</div>
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
            Drop PDF or DOCX here, or click to browse
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            Transcript · Enrollment letter · Certificates · Course lists
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(f) }} />
        </div>
        {uploadStatus === 'parsing' && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>⏳ Parsing document…</div>
        )}
        {uploadStatus === 'done' && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a' }}>✓ Courses extracted successfully</div>
        )}
        {uploadStatus === 'error' && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>Error: {uploadError}</div>
        )}
        {uploadedFileNames.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
            Uploaded: {uploadedFileNames.join(', ')}
          </div>
        )}
      </Field>

      {/* Extracted courses */}
      <Field label={`Courses (${courses.length})`}>
        <p style={{ fontSize: 11, color: '#6b7280', marginTop: 0, marginBottom: 8 }}>
          Auto-extracted from your documents. Used to match you with relevant positions.
        </p>
        {courses.length === 0 && (
          <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0' }}>
            No courses yet — upload a transcript to auto-extract, or add manually below.
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {courses.map(c => (
            <span key={c} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', background: '#eff6ff', color: '#1d4ed8',
              borderRadius: 999, fontSize: 11, border: '1px solid #bfdbfe',
            }}>
              {c}
              <button onClick={() => removeCourse(c)} style={{
                border: 'none', background: 'none', cursor: 'pointer',
                color: '#93c5fd', fontSize: 13, padding: 0, lineHeight: 1,
              }}>×</button>
            </span>
          ))}
        </div>
        {/* Manual course add */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Add a course manually…"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val && !courses.includes(val)) { setCourses(prev => [...prev, val]) }
                ;(e.target as HTMLInputElement).value = ''
              }
            }} />
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Press Enter to add</div>
      </Field>

      {/* Certifications */}
      <Field label="Online Certifications">
        <div
          onClick={() => certInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCertUpload(f) }}
          style={{
            border: '2px dashed #d1d5db', borderRadius: 10, padding: '14px 16px',
            textAlign: 'center', cursor: 'pointer', background: '#f9fafb', marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 4 }}>🏅</div>
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
            Drop certificate PDF or DOCX here, or click to upload
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            Coursera · Udemy · AWS · Google · any certificate document
          </div>
          <input ref={certInputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCertUpload(f); if (certInputRef.current) certInputRef.current.value = '' }} />
        </div>
        {certUploadStatus === 'parsing' && (
          <div style={{ marginBottom: 8, fontSize: 12, color: '#6b7280' }}>⏳ Extracting certification name…</div>
        )}
        {certUploadStatus === 'done' && (
          <div style={{ marginBottom: 8, fontSize: 12, color: '#16a34a' }}>✓ Certification added</div>
        )}
        {certUploadStatus === 'error' && (
          <div style={{ marginBottom: 8, fontSize: 12, color: '#dc2626' }}>Error: {certUploadError}</div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="e.g. Machine Learning Specialization (Coursera, 2024)"
            value={newCert} onChange={e => setNewCert(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCert()} />
          <button onClick={addCert} style={{ ...primaryBtn, marginTop: 0, padding: '8px 16px', fontSize: 13 }}>
            Add
          </button>
        </div>
        {certifications.map(c => (
          <div key={c} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', background: '#f0fdf4', borderRadius: 6,
            border: '1px solid #bbf7d0', marginBottom: 4, fontSize: 12,
          }}>
            <span>🏅 {c}</span>
            <button onClick={() => removeCert(c)} style={{
              border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14,
            }}>×</button>
          </div>
        ))}
      </Field>

      <button onClick={save} style={primaryBtn}>Save Academic Profile</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function useInputStyle(): React.CSSProperties {
  const { colors } = useTheme()
  return {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${colors.inputBorder}`, fontSize: 13, outline: 'none',
    boxSizing: 'border-box', background: colors.inputBg, color: colors.text,
  }
}

// Legacy alias used by sub-sections — replaced section by section with useInputStyle()
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
