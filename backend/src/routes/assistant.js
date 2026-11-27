import { Hono } from 'hono'
import { z } from 'zod'
import { requireUser, requireRole } from '../middleware/auth.js'
import { rateLimit } from '../lib/rateLimit.js'
import { geminiGenerate } from '../lib/gemini.js'
import { transcribe } from '../lib/groq.js'
import { config } from '../config.js'
import { declarations, buildTools, verifyAction } from '../modules/assistant/tools.js'
import { buildAssistantPrompt } from '../modules/assistant/prompt.js'

export const assistantRoutes = new Hono()
assistantRoutes.use('*', requireUser, requireRole('medico'))

const perUser = (max) => rateLimit({ windowMs: 60_000, max, key: (c) => c.get('user').id })

const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(1500) })).max(10).default([]),
  focusPatientId: z.string().uuid().nullish(),
})

const clean = (t) => t.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim()
const textOf = (content) => (content?.parts ?? []).filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim()

function toContents(history, message) {
  const turns = [...history, { role: 'user', text: message }]
  while (turns.length && turns[0].role !== 'user') turns.shift()
  return turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] }))
}

const modeCache = new Map()
async function aiMode(db, centerId) {
  const hit = modeCache.get(centerId)
  if (hit && hit.exp > Date.now()) return hit.mode
  const { data } = await db.from('centers').select('ai_data_mode').eq('id', centerId).maybeSingle()
  const mode = data?.ai_data_mode ?? 'ninguno'
  modeCache.set(centerId, { mode, exp: Date.now() + 60_000 })
  return mode
}

async function loadFocus(db, patientId) {
  if (!patientId) return null
  const { data } = await db.from('patients').select('id, code, full_name').eq('id', patientId).maybeSingle()
  return data ? { id: data.id, code: data.code, name: data.full_name } : null
}

assistantRoutes.post('/chat', perUser(20), async (c) => {
  const t0 = Date.now()
  const parsed = chatSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'Mensaje no válido' }, 400)
  const { message, history, focusPatientId } = parsed.data
  const db = c.get('db'), profile = c.get('profile'), uid = c.get('user').id

  const [mode, focus] = await Promise.all([aiMode(db, profile.center_id), loadFocus(db, focusPatientId)])
  const system = buildAssistantPrompt({ profile, focus, mode })
  const tools = buildTools({ db, uid, mode })
  const contents = toContents(history, message)

  const display = [], pending = [], used = []
  let reply = '', newFocus = focus
  try {
    for (let step = 0; step < 4 && !reply; step++) {
      const data = await geminiGenerate({ system, contents, tools: [{ functionDeclarations: declarations }], timeoutMs: 8000 })
      const content = data?.candidates?.[0]?.content
      const calls = (content?.parts ?? []).filter((p) => p.functionCall).map((p) => p.functionCall)
      if (!calls.length) { reply = clean(textOf(content)); break }

      contents.push(content) // se reenvía tal cual (incluye las firmas de razonamiento de Gemini)
      const results = []
      for (const call of calls) {
        used.push(call.name)
        const r = await tools.run(call.name, call.args)
        if (r.display) display.push(r.display)
        if (r.pending) pending.push(r.pending)
        if (r.focus) newFocus = r.focus
        results.push({ name: call.name, r })
      }
      if (results.length === 1 && results[0].r.directReply) { reply = results[0].r.directReply; break }
      contents.push({ role: 'user', parts: results.map(({ name, r }) => ({ functionResponse: { name, response: r.forModel ?? {} } })) })
    }
  } catch (e) {
    console.error('[assistant/chat]', e.message)
  }

  if (!reply) {
    reply = pending.length ? 'Dejé la acción lista. Confírmala con el botón si estás de acuerdo.'
      : display.length ? 'Aquí tienes lo que encontré.'
      : 'Disculpa, no pude procesar eso ahora. Inténtalo de nuevo.'
  }
  if (used.length) {
    await db.rpc('log_audit', { p_action: 'asistente.consulta', p_detail: { herramientas: used }, p_via_assistant: true })
  }
  c.header('Server-Timing', `total;dur=${Date.now() - t0}`)
  console.log('[assistant/chat]', { tools: used, total: Date.now() - t0 })
  return c.json({ reply, display, pending, focus: newFocus, ms: Date.now() - t0 })
})

// Confirmación de una acción propuesta (compartir historial / enviar mensaje)
assistantRoutes.post('/confirm', perUser(20), async (c) => {
  const body = z.object({ token: z.string().min(20).max(3000) }).safeParse(await c.req.json().catch(() => null))
  if (!body.success) return c.json({ error: 'Solicitud no válida' }, 400)
  const db = c.get('db')
  const p = verifyAction(body.data.token, c.get('user').id)
  if (!p) return c.json({ error: 'La confirmación venció o no es válida. Pídemelo de nuevo.' }, 400)

  try {
    if (p.type === 'share_record') {
      const { error } = await db.rpc('share_record', {
        p_patient: p.paciente_id, p_with: p.colega_id, p_reason: p.motivo, p_via_assistant: true, p_expires_at: null,
      })
      if (error) throw error
      return c.json({ ok: true, message: 'Listo: compartí el historial y le avisé a tu colega en mensajes.' })
    }
    if (p.type === 'send_message') {
      const conv = await db.rpc('get_or_create_direct_conversation', { p_other: p.colega_id })
      if (conv.error) throw conv.error
      const { error } = await db.rpc('send_message', {
        p_conversation: conv.data, p_body: p.texto, p_patient: p.paciente_id, p_via_assistant: true, p_share: null,
      })
      if (error) throw error
      return c.json({ ok: true, message: 'Mensaje enviado.' })
    }
    return c.json({ error: 'Acción desconocida' }, 400)
  } catch (e) {
    console.error('[assistant/confirm]', e.code, e.message)
    const safe = e.code === '42501' || e.code === 'P0001'   // errores propios de las funciones de la base, en español
    return c.json({ error: safe ? e.message : 'No se pudo completar la acción' }, 400)
  }
})

// Voz del médico -> texto
assistantRoutes.post('/transcribe', perUser(20), async (c) => {
  if (!config.groqKey) return c.json({ error: 'Transcripción no disponible' }, 503)
  const form = await c.req.parseBody().catch(() => null)
  const file = form?.audio
  if (!file || typeof file === 'string') return c.json({ error: 'Falta el audio' }, 400)
  if (file.size < 1000) return c.json({ error: 'Audio demasiado corto' }, 400)
  if (file.size > 5 * 1024 * 1024) return c.json({ error: 'Audio demasiado grande' }, 413)
  try {
    return c.json({ text: await transcribe(file) })
  } catch (e) {
    console.error('[assistant/transcribe]', e.message)
    return c.json({ error: 'No se pudo transcribir el audio' }, 502)
  }
})