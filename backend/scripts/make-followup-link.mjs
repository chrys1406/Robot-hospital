// Desde backend/:  node --env-file=.env scripts/make-followup-link.mjs
import { createClient } from '@supabase/supabase-js'

const code = process.argv[2] ?? 'HN-000109'
const BASE = process.env.API_URL ?? 'http://localhost:8787'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'SeguiMed-Demo-2026!'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data, error } = await sb.auth.signInWithPassword({ email: 'enfermeria1@seguimed.test', password: PASSWORD })
if (error) { console.error('Login:', error.message); process.exit(1) }

const { data: p } = await sb.from('patients').select('id').eq('code', code).maybeSingle()
if (!p) { console.error(`No veo al paciente ${code} con esta enfermera`); process.exit(1) }

const res = await fetch(`${BASE}/followups`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
  body: JSON.stringify({ patientId: p.id }),
})
const out = await res.json()
if (!res.ok) { console.error(out.error); process.exit(1) }
console.log('\nAbre este enlace en el navegador (vale 72 horas):\n' + out.link + '\n')