import { Hono } from 'hono'
import { adminDb } from '../lib/supabase.js'
import { rateLimit } from '../lib/rateLimit.js'
import { hashToken } from './followups.js'

export const followupPublicRoutes = new Hono()
followupPublicRoutes.use('*', rateLimit({ windowMs: 60_000, max: 20 }))

const MSG = { 404: 'Este enlace no es válido.', 410: 'Este enlace venció. Pide uno nuevo al hospital.', 409: 'Ya recibimos tus respuestas. ¡Gracias!' }

async function load(token) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return { code: 404 }
  const db = adminDb()
  const { data: req } = await db.from('followup_requests')
    .select('id, patient_id, status, token_expires_at, questionnaire_id')
    .eq('access_token_hash', hashToken(token)).maybeSingle()
  if (!req) return { code: 404 }
  if (!req.token_expires_at || new Date(req.token_expires_at) < new Date()) return { code: 410 }
  if (req.status === 'respondido') return { code: 409 }
  const { data: q } = await db.from('followup_questionnaires').select('name, questions, status')
    .eq('id', req.questionnaire_id).maybeSingle()
  if (!q || q.status !== 'aprobado') return { code: 404 }
  return { req, q, db }
}

// Valida cada respuesta según el tipo de pregunta; devuelve null si algo no es válido
function validate(questions, answers) {
  const out = {}
  for (const q of questions) {
    const v = answers?.[q.id]
    if (v === undefined || v === null || v === '') {
      if (q.type === 'text') continue
      return null
    }
    if (q.type === 'yesno') {
      const s = String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (s !== 'si' && s !== 'no') return null
      out[q.id] = s
    } else if (q.type === 'scale') {
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0 || n > 10) return null
      out[q.id] = String(n)
    } else if (q.type === 'text') {
      out[q.id] = String(v).slice(0, 500)
    } else return null
  }
  return out
}

// Las preguntas (sin las reglas de alerta ni datos del paciente)
followupPublicRoutes.get('/:token', async (c) => {
  const r = await load(c.req.param('token'))
  if (r.code) return c.json({ error: MSG[r.code] }, r.code)
  return c.json({
    questionnaire: { name: r.q.name, questions: r.q.questions.map(({ id, text, type }) => ({ id, text, type })) },
  })
})

// Guarda las respuestas. Si cumplen una regla, la base crea la alerta (el paciente nunca decide prioridades).
followupPublicRoutes.post('/:token', async (c) => {
  const r = await load(c.req.param('token'))
  if (r.code) return c.json({ error: MSG[r.code] }, r.code)

  const body = await c.req.json().catch(() => null)
  const answers = validate(r.q.questions, body?.answers)
  if (!answers) return c.json({ error: 'Revisa tus respuestas: falta alguna o no es válida.' }, 400)

  const { data: resp, error } = await r.db.from('followup_responses')
    .insert({ request_id: r.req.id, patient_id: r.req.patient_id, answers }).select('id').single()
  if (error) {
    if (error.code === '23505') return c.json({ error: MSG[409] }, 409)
    console.error('[followup/responder]', error.code, error.message)
    return c.json({ error: 'No pudimos guardar tus respuestas. Inténtalo de nuevo.' }, 500)
  }

  const { data: alerts } = await r.db.from('alerts').select('priority').eq('followup_response_id', resp.id)
  const notified = (alerts?.length ?? 0) > 0
  const urgent = alerts?.some((a) => a.priority === 'alta') ?? false
  return c.json({
    ok: true, notified, urgent,
    message: urgent
      ? 'Gracias. Avisamos de inmediato al personal de salud. Si sientes que empeoras, acude ya a Emergencias del hospital.'
      : notified
        ? 'Gracias. Avisamos al personal de salud sobre tus respuestas. Si empeoras, acude a Emergencias del hospital.'
        : 'Gracias, recibimos tus respuestas. Si empeoras o tienes una urgencia, acude a Emergencias del hospital.',
  })
})