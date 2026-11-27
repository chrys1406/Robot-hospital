import { Hono } from 'hono'
import { z } from 'zod'
import { createHash, randomBytes } from 'node:crypto'
import { requireUser, requireRole } from '../middleware/auth.js'
import { rateLimit } from '../lib/rateLimit.js'
import { adminDb } from '../lib/supabase.js'
import { config } from '../config.js'

export const followupRoutes = new Hono()
followupRoutes.use('*', requireUser, requireRole('medico', 'enfermeria', 'jefatura_enfermeria'))

export const hashToken = (t) => createHash('sha256').update(t).digest('hex')
const TTL_HOURS = 72
const newToken = () => randomBytes(32).toString('base64url')
const link = (token) => `${config.patientAppUrl}/seguimiento/${token}`
const perUser = rateLimit({ windowMs: 60_000, max: 20, key: (c) => c.get('user').id })

// Crea la solicitud de seguimiento y devuelve el enlace (solo se muestra esta vez: en la base queda el hash)
followupRoutes.post('/', perUser, async (c) => {
  const parsed = z.object({ patientId: z.string().uuid(), questionnaireId: z.string().uuid().optional() })
    .safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'Solicitud no válida' }, 400)
  const db = c.get('db'), profile = c.get('profile')
  const { patientId } = parsed.data

  // Si el paciente no es visible para este usuario (RLS), no hay ingreso que leer
  const { data: adm } = await db.from('admissions').select('id, discharged_at')
    .eq('patient_id', patientId).order('admitted_at', { ascending: false }).limit(1).maybeSingle()
  if (!adm) return c.json({ error: 'Paciente no encontrado o sin acceso' }, 404)
  if (!adm.discharged_at) return c.json({ error: 'El seguimiento posterior al alta solo aplica a pacientes dados de alta' }, 400)

  let qid = parsed.data.questionnaireId
  if (!qid) {
    const { data: q } = await db.from('followup_questionnaires').select('id')
      .eq('center_id', profile.center_id).eq('status', 'aprobado').order('version', { ascending: false }).limit(1).maybeSingle()
    qid = q?.id
  }
  if (!qid) return c.json({ error: 'No hay un cuestionario aprobado' }, 409)

  const token = newToken()
  const { data, error } = await db.from('followup_requests').insert({
    patient_id: patientId, admission_id: adm.id, questionnaire_id: qid,
    access_token_hash: hashToken(token),
    token_expires_at: new Date(Date.now() + TTL_HOURS * 3_600_000).toISOString(),
  }).select('id, status, due_at, token_expires_at').single()

  if (error) {
    if (error.code === 'P0001') return c.json({ error: error.message }, 409)   // p. ej. falta el consentimiento
    console.error('[followups] crear', error.code, error.message)
    return c.json({ error: 'No se pudo crear el seguimiento' }, 400)
  }
  await db.rpc('log_audit', { p_action: 'seguimiento.enlace_creado', p_entity_type: 'followup_request', p_entity_id: data.id, p_patient: patientId })
  return c.json({ request: data, link: link(token) }, 201)
})

// Nuevo enlace (el anterior deja de funcionar). Útil cuando toca reenviarlo.
followupRoutes.post('/:id/renew', perUser, async (c) => {
  const id = c.req.param('id')
  if (!z.string().uuid().safeParse(id).success) return c.json({ error: 'Solicitud no válida' }, 400)
  const db = c.get('db')

  const { data: req } = await db.from('followup_requests').select('id, status, patient_id').eq('id', id).maybeSingle()
  if (!req) return c.json({ error: 'Seguimiento no encontrado' }, 404)
  if (req.status === 'respondido') return c.json({ error: 'El paciente ya respondió' }, 409)

  const token = newToken()
  const { error } = await adminDb().from('followup_requests').update({
    access_token_hash: hashToken(token),
    token_expires_at: new Date(Date.now() + TTL_HOURS * 3_600_000).toISOString(),
  }).eq('id', id)
  if (error) { console.error('[followups] renovar', error.message); return c.json({ error: 'No se pudo renovar el enlace' }, 500) }

  await db.rpc('log_audit', { p_action: 'seguimiento.enlace_renovado', p_entity_type: 'followup_request', p_entity_id: id, p_patient: req.patient_id })
  return c.json({ link: link(token) })
})