// node --env-file=.env scripts/test-assistant.mjs   (con "npm run dev" corriendo en otra terminal)
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.API_URL ?? 'http://localhost:8787'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'SeguiMed-Demo-2026!'
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'OK    ' : 'FALLÓ '} ${name}${detail ? ' — ' + detail : ''}`)
}

async function login(email) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`Login de ${email}: ${error.message}`)
  return { sb, token: data.session.access_token, id: data.user.id }
}

async function call(method, path, { body, token } = {}) {
  const t0 = Date.now()
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json().catch(() => null), ms: Date.now() - t0 }
}
const chat = (u, message, extra = {}) => call('POST', '/assistant/chat', { token: u.token, body: { message, ...extra } })
const kind = (r, k) => r.data?.display?.find((d) => d.kind === k)

try {
  const carlos = await login('carlos@seguimed.test')
  const ana = await login('ana@seguimed.test')
  const nurse = await login('enfermeria1@seguimed.test')

  let r = await call('POST', '/assistant/chat', { body: { message: 'hola' } })
  check('Sin sesión: 401', r.status === 401, `estado ${r.status}`)
  r = await chat(nurse, 'hola')
  check('Enfermería no usa el asistente del médico: 403', r.status === 403, `estado ${r.status}`)

  r = await chat(carlos, '¿Qué citas tengo hoy?')
  check('Citas de hoy (Carlos tiene 2)', kind(r, 'citas')?.items?.length === 2, `"${r.data?.reply}" [${r.ms} ms]`)

  r = await chat(carlos, '¿Tengo alertas abiertas?')
  const al = kind(r, 'alertas')?.items ?? []
  check('Alertas abiertas incluyen a Rosa (HN-000102)', al.some((i) => i.paciente.codigo === 'HN-000102'), `${al.length} alertas [${r.ms} ms]`)

  r = await chat(carlos, '¿Cómo está Rosa Choque?')
  const est = kind(r, 'estado')
  check('Estado de Rosa: NEWS2 = 15 y prioridad alta',
    est?.ultimoControl?.news2_total === 15 && est?.ultimoControl?.news2_prioridad === 'alta',
    `"${r.data?.reply}" [${r.ms} ms]`)

  r = await chat(carlos, 'Léeme el historial de Edgar Mamani')
  check('Carlos NO ve el historial de Edgar sin que se lo compartan', !kind(r, 'historial'), `"${r.data?.reply}"`)

  r = await chat(ana, 'Comparte el historial de Edgar Mamani con el doctor Carlos Mendoza, es una interconsulta')
  const pend = r.data?.pending?.[0]
  check('Ana: la IA PROPONE compartir (no lo ejecuta)', pend?.type === 'share_record', `"${r.data?.reply}" [${r.ms} ms]`)

  if (pend) {
    let x = await call('POST', '/assistant/confirm', { token: ana.token, body: { token: pend.token.slice(0, -3) + 'abc' } })
    check('Confirmación adulterada: 400', x.status === 400, `estado ${x.status}`)

    x = await call('POST', '/assistant/confirm', { token: carlos.token, body: { token: pend.token } })
    check('Otro usuario no puede usar la confirmación de Ana: 400', x.status === 400, `estado ${x.status}`)

    x = await call('POST', '/assistant/confirm', { token: ana.token, body: { token: pend.token } })
    check('Ana confirma y se comparte', x.status === 200 && x.data?.ok === true, x.data?.message ?? x.data?.error)

    x = await call('POST', '/assistant/confirm', { token: ana.token, body: { token: pend.token } })
    check('La misma confirmación no se reutiliza: 400', x.status === 400, `estado ${x.status}`)

    r = await chat(carlos, 'Léeme el historial de Edgar Mamani')
    check('Ahora Carlos sí ve el historial (3 documentos)', kind(r, 'historial')?.documentos?.length === 3, `"${r.data?.reply}" [${r.ms} ms]`)
  }

  // Limpieza: revoca lo compartido para dejar los datos como estaban
  const { data: shares } = await ana.sb.from('record_shares').select('id').eq('shared_with', carlos.id).is('revoked_at', null)
  for (const s of shares ?? []) await ana.sb.rpc('revoke_share', { p_share: s.id })
  console.log(`(limpieza: ${shares?.length ?? 0} compartido(s) revocado(s))`)
} catch (e) {
  console.error('Error en la prueba:', e.message)
  process.exit(1)
}

console.log(`\n${results.filter(Boolean).length} de ${results.length} pruebas correctas`)
process.exit(results.every(Boolean) ? 0 : 1)