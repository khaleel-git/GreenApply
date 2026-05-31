import { useState } from 'react'

interface Props {
  jobId: string
  onSaved: () => void
}

export function ActionButtons({ jobId, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (saved || saving) return
    setSaving(true)
    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_APPLICATION', jobId })
      setSaved(true)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={handleSave}
        disabled={saved || saving}
        style={{
          flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: saved ? 'default' : 'pointer',
          background: saved ? '#d1fae5' : '#16a34a', color: saved ? '#065f46' : '#fff',
          fontSize: 13, fontWeight: 600, transition: 'background 0.2s',
          pointerEvents: 'auto',
        }}
      >
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Job'}
      </button>
    </div>
  )
}
