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