import { config } from '../config.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Llamada REST a Gemini. Reintenta una vez ante 429/500/503.
export async function geminiGenerate({ system, contents, tools, maxOutputTokens = 1024, timeoutMs = 12000 }) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens, temperature: 0.3, thinkingConfig: { thinkingLevel: 'low' } },
  }
  if (tools) body.tools = tools

  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(`${BASE}/${config.geminiModel}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      if (res.ok) return await res.json()
      if (![429, 500, 503].includes(res.status) || attempt === 1) throw new Error(`Gemini ${res.status}`)
    } finally {
      clearTimeout(timer)
    }
    await new Promise((r) => setTimeout(r, 700))
  }
}

export const candidateText = (data) =>
  (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim()