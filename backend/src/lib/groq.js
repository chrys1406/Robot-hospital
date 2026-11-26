import { config } from '../config.js'

const BASE = 'https://api.groq.com/openai/v1'

async function timedFetch(url, init, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try { return await fetch(url, { ...init, signal: ctrl.signal }) } finally { clearTimeout(timer) }
}

// Respaldo de chat cuando Gemini falla
export async function groqChat({ system, messages, timeoutMs = 9000 }) {
  if (!config.groqKey) throw new Error('Groq no configurado')
  const res = await timedFetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqKey}` },
    body: JSON.stringify({
      model: config.groqChatModel,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.3,
      max_completion_tokens: 800,
      reasoning_effort: 'low',
      include_reasoning: false,
    }),
  }, timeoutMs)
  if (!res.ok) throw new Error(`Groq ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

// Voz -> texto (Whisper)
export async function transcribe(file) {
  if (!config.groqKey) throw new Error('Groq no configurado')
  const fd = new FormData()
  fd.append('file', file, file.name || 'audio.webm')
  fd.append('model', config.whisperModel)
  fd.append('language', 'es')
  fd.append('temperature', '0')
  fd.append('response_format', 'json')
  fd.append('prompt', 'Hospital del Norte, El Alto, emergencias, consulta externa, consultorio, cardiología, pediatría, medicina interna.')
  const res = await timedFetch(`${BASE}/audio/transcriptions`, {
    method: 'POST', headers: { Authorization: `Bearer ${config.groqKey}` }, body: fd,
  }, 20000)
  if (!res.ok) throw new Error(`Whisper ${res.status}`)
  const data = await res.json()
  return (data.text ?? '').trim()
}