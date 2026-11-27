// node --env-file=.env scripts/test-b2.mjs   (con "npm run dev" corriendo en otra terminal)
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.API_URL ?? 'http://localhost:8787'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'SeguiMed-Demo-2026!'
const TEMP_EMAIL = 'temporal.enf@seguimed.test'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Falta SUPABASE_SERVICE_ROLE_KEY en backend/.env'); process.exit(1) }

const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'OK    ' : 'FALLÓ '} ${name}${detail ? ' — ' + detail : ''}`)
}

async function login(email, password = PASSWORD) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) return { error }
  return { sb, token: data.session.access_token, id: data.user.id }
}
async function call(method, path, { body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}
const tokenOf = (link) => link.split('/').pop()
const createdRequests = []
let tempUserId = null

try {
  const nurse1 = await login('enfermeria1@seguimed.test')
  const nurse2 = await login('enfermeria2@seguimed.test')
  const director = await login('director@seguimed.test')
  if (nurse1.error || nurse2.error || director.error) throw new Error('Fallo el login de prueba (¿contraseña?)')

  // Limpieza previa por si una corrida anterior quedó a medias
  const { data: all } = await svc.auth.admin.listUsers({ perPage: 1000 })
  for (const u of all.users.filter((x) => x.email === TEMP_EMAIL)) await svc.auth.admin.deleteUser(u.id)

  // ───────── Seguimiento post-alta ─────────
  const { data: hugo } = await nurse1.sb.from('patients').select('id').eq('code', 'HN-000109').single()

  let r = await call('POST', '/followups', { body: { patientId: hugo.id } })
  check('Crear enlace sin sesión: 401', r.status === 401, `estado ${r.status}`)

  r = await call('POST', '/followups', { token: nurse2.token, body: { patientId: hugo.id } })
  check('Enfermería de OTRO servicio no puede crear el enlace: 404', r.status === 404, `estado ${r.status}`)

  r = await call('POST', '/followups', { token: nurse1.token, body: { patientId: hugo.id } })
  const link1 = r.data?.link ?? ''
  if (r.data?.request?.id) createdRequests.push(r.data.request.id)
  check('Enfermería crea el enlace seguro', r.status === 201 && /\/seguimiento\/[A-Za-z0-9_-]{40,}$/.test(link1), link1.slice(0, 55) + '…')
  const token1 = tokenOf(link1)

  r = await call('GET', `/public/followup/${token1}`)
  const raw = JSON.stringify(r.data)
  check('El paciente ve las 6 preguntas, sin reglas ni datos clínicos',
    r.status === 200 && r.data?.questionnaire?.questions?.length === 6 && !/alert_rules|priority|prioridad|Hugo|HN-/.test(raw), `${r.data?.questionnaire?.questions?.length} preguntas`)

  r = await call('GET', '/public/followup/enlace-inventado')
  check('Enlace inventado: 404', r.status === 404, `estado ${r.status}`)

  r = await call('POST', `/public/followup/${token1}`, { body: { answers: { q1: 'quizás', q2: 'no', q3: 3, q4: 'no', q5: 'si' } } })
  check('Respuesta inválida: 400', r.status === 400, `estado ${r.status}`)

  r = await call('POST', `/public/followup/${token1}`, { body: { answers: { q1: 'no', q2: 'no', q3: 3, q4: 'no', q5: 'si', q6: 'Todo bien' } } })
  check('Respuestas válidas se guardan (sin alerta)', r.status === 200 && r.data?.ok === true && r.data?.notified === false, r.data?.message)

  r = await call('POST', `/public/followup/${token1}`, { body: { answers: { q1: 'no', q2: 'no', q3: 3, q4: 'no', q5: 'si' } } })
  check('No se puede responder dos veces: 409', r.status === 409, `estado ${r.status}`)

  r = await call('POST', '/followups', { token: nurse1.token, body: { patientId: hugo.id } })
  const req2 = r.data?.request?.id
  const oldLink = r.data?.link ?? ''
  if (req2) createdRequests.push(req2)
  r = await call('POST', `/followups/${req2}/renew`, { token: nurse1.token })
  const newLink = r.data?.link ?? ''
  check('Renovar entrega un enlace distinto', r.status === 200 && newLink && newLink !== oldLink)
  r = await call('GET', `/public/followup/${tokenOf(oldLink)}`)
  check('El enlace anterior deja de funcionar: 404', r.status === 404, `estado ${r.status}`)
  r = await call('GET', `/public/followup/${tokenOf(newLink)}`)
  check('El enlace nuevo funciona', r.status === 200, `estado ${r.status}`)

  // ───────── Administración de usuarios ─────────
  r = await call('GET', '/admin/users', { token: nurse1.token })
  check('Enfermería no entra a administración: 403', r.status === 403, `estado ${r.status}`)

  r = await call('GET', '/admin/users', { token: director.token })
  check('El director lista los usuarios (8 o más)', r.status === 200 && r.data?.users?.length >= 8, `${r.data?.users?.length} usuarios`)

  r = await call('POST', '/admin/users', { token: director.token, body: { email: TEMP_EMAIL, fullName: 'Enf. Temporal', role: 'director' } })
  check('No se crean directores desde la API: 400', r.status === 400, `estado ${r.status}`)

  r = await call('POST', '/admin/users', { token: director.token, body: { email: TEMP_EMAIL, fullName: 'Enf. Temporal', role: 'enfermeria' } })
  check('Enfermería sin servicio es rechazada: 400', r.status === 400, r.data?.error)

  const { data: ward } = await director.sb.from('services').select('id').eq('name', 'Hospitalización Medicina Interna').single()
  r = await call('POST', '/admin/users', { token: director.token, body: { email: TEMP_EMAIL, fullName: 'Enf. Temporal', role: 'enfermeria', serviceId: ward.id } })
  tempUserId = r.data?.user?.id ?? null
  const tempPass = r.data?.temporaryPassword
  check('El director crea un usuario con contraseña temporal', r.status === 201 && !!tempPass, `estado ${r.status}`)

  const fresh = await login(TEMP_EMAIL, tempPass)
  r = fresh.token ? await call('GET', '/me', { token: fresh.token }) : { status: 0 }
  check('El usuario nuevo inicia sesión con rol enfermería', r.status === 200 && r.data?.profile?.role === 'enfermeria', r.data?.profile?.role)

  r = await call('PATCH', `/admin/users/${director.id}`, { token: director.token, body: { isActive: false } })
  check('El director no puede desactivarse a sí mismo: 400', r.status === 400, `estado ${r.status}`)

  r = await call('PATCH', `/admin/users/${tempUserId}`, { token: director.token, body: { isActive: false } })
  check('El director desactiva al usuario nuevo', r.status === 200 && r.data?.user?.is_active === false, `estado ${r.status}`)
  const blocked = await login(TEMP_EMAIL, tempPass)
  check('Un usuario desactivado ya no puede iniciar sesión', !!blocked.error, blocked.error?.message ?? 'inició sesión')
} catch (e) {
  console.error('Error en la prueba:', e.message)
  results.push(false)
} finally {
  // Limpieza: deja los datos como estaban
  for (const id of createdRequests) {
    await svc.from('followup_responses').delete().eq('request_id', id)
    await svc.from('followup_requests').delete().eq('id', id)
  }
  if (tempUserId) await svc.auth.admin.deleteUser(tempUserId)
  console.log('(limpieza hecha: solicitudes de prueba y usuario temporal eliminados)')
}

console.log(`\n${results.filter(Boolean).length} de ${results.length} pruebas correctas`)
process.exit(results.every(Boolean) ? 0 : 1)