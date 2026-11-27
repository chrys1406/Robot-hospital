import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

const base = { auth: { persistSession: false, autoRefreshToken: false } }

// Robot público: solo lee lo que las políticas RLS permiten al rol "anon"
export const anonDb = createClient(config.supabaseUrl, config.supabaseAnonKey, base)

// Cliente "como el usuario": usa SU token, así RLS y la bitácora aplican a esa persona
export const userDb = (token) =>
  createClient(config.supabaseUrl, config.supabaseAnonKey, {
    ...base,
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

// Llave maestra: SOLO para lo que no puede hacerse con la sesión de un usuario
// (altas de usuarios, y el paciente que responde sin login). Siempre se valida antes quién pide qué.
let admin = null
export function adminDb() {
  if (!config.supabaseServiceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en backend/.env')
  admin ??= createClient(config.supabaseUrl, config.supabaseServiceKey, base)
  return admin
}