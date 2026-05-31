import { NIM_BASE_URL } from '../../constants/models'

export interface NimMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface NimOptions {
  model: string
  messages: NimMessage[]
  maxTokens: number
  stream?: boolean
  jsonMode?: boolean
}

async function getApiKey(): Promise<string> {
  const result = await chrome.storage.local.get('nvidiaApiKey')
  const key = result.nvidiaApiKey as string | undefined
  if (!key) throw new Error('No NVIDIA API key configured. Add one in Settings → AI Features.')
  return key
}

export async function nimComplete(opts: NimOptions): Promise<string> {
  const key = await getApiKey()
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    max_tokens: opts.maxTokens,
    stream: false,
    temperature: 0.3,
  }
  if (opts.jsonMode) body.response_format = { type: 'json_object' }

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`NIM API ${res.status}: ${err}`)
      }
      const data = await res.json() as { choices: Array<{ message: { content: string } }> }
      return data.choices[0]?.message?.content ?? ''
    } catch (e) {
      lastError = e as Error
      if (attempt < 2) await delay(Math.pow(2, attempt) * 500)
    }
  }
  throw lastError
}

export async function* nimStream(opts: NimOptions): AsyncGenerator<string> {
  const key = await getApiKey()
  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      max_tokens: opts.maxTokens,
      stream: true,
      temperature: 0.6,
    }),
  })

  if (!res.ok) throw new Error(`NIM API ${res.status}: ${await res.text()}`)
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data) as { choices: Array<{ delta: { content?: string } }> }
        const token = parsed.choices[0]?.delta?.content
        if (token) yield token
      } catch { /* malformed chunk, skip */ }
    }
  }
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
