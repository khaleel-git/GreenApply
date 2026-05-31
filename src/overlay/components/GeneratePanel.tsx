import { useState, useRef } from 'react'

interface Props {
  jobId: string
}

export function GeneratePanel({ jobId }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const portRef = useRef<chrome.runtime.Port | null>(null)

  function handleGenerate() {
    if (generating) return
    setText('')
    setDone(false)
    setError('')
    setGenerating(true)
    setOpen(true)

    try {
      const port = chrome.runtime.connect({ name: 'generate' })
      portRef.current = port

      port.onMessage.addListener((msg: { type: string; token: string; done: boolean }) => {
        if (msg.type === 'GENERATION_CHUNK') {
          setText(prev => prev + msg.token)
          if (msg.done) {
            setGenerating(false)
            setDone(true)
            port.disconnect()
          }
        }
      })

      port.onDisconnect.addListener(() => {
        setGenerating(false)
      })

      port.postMessage({ type: 'GENERATE_COVER_LETTER', jobId })
    } catch (e) {
      setError(String(e))
      setGenerating(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          width: '100%', padding: '8px 0', borderRadius: 8,
          border: '1px solid #d1d5db', background: generating ? '#f9fafb' : '#fff',
          cursor: generating ? 'default' : 'pointer',
          fontSize: 13, fontWeight: 600, color: '#374151',
          pointerEvents: 'auto',
        }}
      >
        {generating ? '✍️ Writing cover letter…' : '✉️ Generate Cover Letter'}
      </button>

      {open && (text || generating || error) && (
        <div style={{
          marginTop: 8, padding: 10, background: '#f9fafb',
          border: '1px solid #e5e7eb', borderRadius: 8, maxHeight: 220,
          overflowY: 'auto',
        }}>
          {error && <div style={{ color: '#dc2626', fontSize: 12 }}>{error}</div>}
          {text && (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap' }}>
              {text}
              {generating && <span style={{ opacity: 0.4 }}>▌</span>}
            </div>
          )}
          {done && text && (
            <button
              onClick={handleCopy}
              style={{
                marginTop: 8, padding: '4px 12px', fontSize: 11,
                border: '1px solid #d1d5db', borderRadius: 6,
                background: '#fff', cursor: 'pointer', color: '#374151',
                pointerEvents: 'auto',
              }}
            >
              Copy
            </button>
          )}
        </div>
      )}
    </div>
  )
}
