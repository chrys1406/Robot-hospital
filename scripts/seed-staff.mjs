// scripts/seed-staff.mjs · Crea el personal de DEMOSTRACIÓN (datos ficticios)
// Uso:  npm i @supabase/supabase-js
//       node --env-file=.env.seed scripts/seed-staff.mjs
// .env.seed (NO subir a git):  SUPABASE_URL=...   SUPABASE_SERVICE_ROLE_KEY=...   [DEMO_PASSWORD=...]
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.seed')
  process.exit(1)
}
const CENTER = '00000000-0000-4000-8000-000000000001'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'SeguiMed-Demo-2026!'
const WARD_MI = 'Hospitalización Medicina Interna (demo)'
const WARD_CX = 'Hospitalización Cirugía (demo)'

const staff = [
  { email: 'director@seguimed.test',    full_name: 'Roberto Quispe Mamani',   role: 'director' },
  { email: 'calidad@seguimed.test',     full_name: 'Patricia Condori Rojas',  role: 'calidad' },
  { email: 'jefatura@seguimed.test',    full_name: 'Rosario Mamani Flores',   role: 'jefatura_enfermeria', service: WARD_MI },
  { email: 'enfermeria1@seguimed.test', full_name: 'Carla Choque Apaza',      role: 'enfermeria',          service: WARD_MI },
  { email: 'enfermeria2@seguimed.test', full_name: 'Jorge Limachi Mamani',    role: 'enfermeria',          service: WARD_CX },
  { email: 'carlos@seguimed.test',      full_name: 'Dr. Carlos Mendoza',      role: 'medico', service: 'Medicina interna', specialty: 'Medicina interna' },
  { email: 'lucia@seguimed.test',       full_name: 'Dra. Lucía Fernández',    role: 'medico', service: 'Cirugía general',  specialty: 'Cirugía general' },
  { email: 'ana@seguimed.test',         full_name: 'Dra. Ana Gutiérrez',      role: 'medico', service: 'Cardiología',      specialty: 'Cardiología' },
]

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const fail = (msg, err) => { console.error(msg, err?.message ?? err); process.exit(1) }

const { data: services, error: sErr } = await sb.from('services').select('id,name,floor').eq('center_id', CENTER)
if (sErr || !services?.length) fail('No hay servicios: ¿ejecutaste 005_seed_hospital.sql?', sErr)
const byName = Object.fromEntries(services.map((s) => [s.name, s]))

async function findUserId(email) {
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (error) fail('No pude listar usuarios', error)
  return data.users.find((u) => u.email === email)?.id
}

const ids = {}
for (const u of staff) {
  let id
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: u.full_name },
  })
  if (error) { id = await findUserId(u.email); if (!id) fail(`No pude crear ${u.email}`, error) }
  else id = data.user.id
  ids[u.email] = id

  const svc = u.service ? byName[u.service] : null
  if (u.service && !svc) fail(`Servicio no encontrado: ${u.service}`)
  const { error: pErr } = await sb.from('profiles').upsert({
    id, center_id: CENTER, full_name: u.full_name, role: u.role,
    service_id: svc?.id ?? null, specialty: u.specialty ?? null, is_active: true,
  }, { onConflict: 'id' })
  if (pErr) fail(`Perfil de ${u.email}`, pErr)

  if (u.role === 'medico') {   // aparece en el directorio público del robot
    await sb.from('doctor_directory').delete().eq('profile_id', id)
    const { error: dErr } = await sb.from('doctor_directory').insert({
      center_id: CENTER, profile_id: id, display_name: u.full_name, specialty: u.specialty,
      service_id: svc.id, floor: svc.floor, office: null, schedule: null, is_public: true,
    })
    if (dErr) fail(`Directorio de ${u.email}`, dErr)
  }
  console.log('OK', u.role.padEnd(20), u.email)
}

// ── Aprobación de DEMOSTRACIÓN (en uso real la hacen profesionales con approve_rule_set) ──
const approver = ids['carlos@seguimed.test']
const demoNote = ' | DEMO: aprobación ficticia, sin validación clínica real.'
const { data: rs } = await sb.from('rule_sets').select('id,notes').eq('center_id', CENTER).eq('name', 'NEWS2 Hospital del Norte').eq('version', 1).single()
const { error: rErr } = await sb.from('rule_sets')
  .update({ status: 'aprobado', approved_by: approver, notes: (rs.notes ?? '') + demoNote }).eq('id', rs.id)
if (rErr) fail('Aprobando reglas', rErr)
const { error: qErr } = await sb.from('followup_questionnaires')
  .update({ status: 'aprobado', approved_by: approver }).eq('center_id', CENTER).eq('name', 'Seguimiento post-alta')
if (qErr) fail('Aprobando cuestionario', qErr)

console.log(`\nListo. Contraseña de demostración para todos: ${PASSWORD}\nCámbiala antes de mostrar esto fuera de tu equipo.`)