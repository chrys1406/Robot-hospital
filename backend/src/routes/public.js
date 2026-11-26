import { Hono } from 'hono'
import { z } from 'zod'
import { config } from '../config.js'
import { rateLimit } from '../lib/rateLimit.js'
import { geminiGenerate, candidateText } from '../lib/gemini.js'
import { groqChat, transcribe } from '../lib/groq.js'
import { matchLocalRule } from '../modules/publicBot/localRules.js'
import { getPublicContext } from '../modules/publicBot/context.js'
import { buildPublicPrompt } from '../modules/publicBot/prompt.js'

export const publicRoutes = new Hono()

const chatSchema = z.object({
  message: z.string().trim().min(1).max(600),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().max(800),
  })).max(8).default([]),
})

const FALLBACK = 'Disculpa, en este momento no puedo responder. Por favor consulta directamente en el hospital y con gusto te atenderán.'
const clean = (t) => t.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim()

function toGeminiContents(history, message) {
  const turns = [...history, { role: 'user', text: message }]
  while (turns.length && turns[0].role !== 'user') turns.shift()
  return turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] }))
}

publicRoutes.post('/chat', rateLimit({ windowMs: 60_000, max: 15 }), async (c) => {
  const t0 = Date.now()
  const parsed = chatSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'Mensaje no válido' }, 400)
  const { message, history } = parsed.data

  const local = matchLocalRule(message)
  if (local) return c.json({ reply: local.reply, emergency: local.emergency, source: 'reglas', ms: Date.now() - t0 })

  const done = (reply, source, ctxMs, llmMs) => {
    c.header('Server-Timing', `ctx;dur=${ctxMs}, llm;dur=${llmMs}, total;dur=${Date.now() - t0}`)
    console.log('[public/chat]', { source, ctxMs, llmMs, total: Date.now() - t0 })
    return c.json({ reply, emergency: false, source, ms: Date.now() - t0 })
  }

  let system
  const tCtx = Date.now()
  try {
    system = buildPublicPrompt(await getPublicContext())
  } catch (e) {
    console.error('[public/chat] contexto', e.message)
    return done(FALLBACK, 'fijo', Date.now() - tCtx, 0)
  }
  const ctxMs = Date.now() - tCtx

  const tLlm = Date.now()
  try {
    const data = await geminiGenerate({ system, contents: toGeminiContents(history, message), timeoutMs: 5000 })
    const reply = clean(candidateText(data))
    if (reply) return done(reply, 'gemini', ctxMs, Date.now() - tLlm)
  } catch (e) {
    console.error('[public/chat] gemini', e.message)
  }

  try {
    const msgs = [...history, { role: 'user', text: message }].map((t) => ({ role: t.role, content: t.text }))
    const reply = clean(await groqChat({ system, messages: msgs, timeoutMs: 4000 }))
    if (reply) return done(reply, 'groq', ctxMs, Date.now() - tLlm)
  } catch (e) {
    console.error('[public/chat] groq', e.message)
  }

  return done(FALLBACK, 'fijo', ctxMs, Date.now() - tLlm)
})

publicRoutes.post('/transcribe', rateLimit({ windowMs: 60_000, max: 8 }), async (c) => {
  if (!config.groqKey) return c.json({ error: 'Transcripción no disponible' }, 503)
  const form = await c.req.parseBody().catch(() => null)
  const file = form?.audio
  if (!file || typeof file === 'string') return c.json({ error: 'Falta el audio' }, 400)
  if (file.size < 1000) return c.json({ error: 'Audio demasiado corto' }, 400)
  if (file.size > 5 * 1024 * 1024) return c.json({ error: 'Audio demasiado grande' }, 413)
  try {
    return c.json({ text: await transcribe(file) })
  } catch (e) {
    console.error('[public/transcribe]', e.message)
    return c.json({ error: 'No se pudo transcribir el audio' }, 502)
  }
})