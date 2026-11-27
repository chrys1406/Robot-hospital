// Desde la RAÍZ de asistente-robot:  node --env-file=.env.seed scripts/reset-passwords.mjs
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const PASSWORD = process.env.DEMO_PASSWORD ?? 'SeguiMed-Demo-2026!'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
if (error) { console.error(error.message); process.exit(1) }

for (const u of data.users.filter((x) => x.email?.endsWith('@seguimed.test'))) {
  const { error: e } = await sb.auth.admin.updateUserById(u.id, { password: PASSWORD, email_confirm: true })
  console.log(e ? 'FALLÓ' : 'OK   ', u.email, e?.message ?? '')
}
console.log(`\nContraseña actual de todos: ${PASSWORD}`)