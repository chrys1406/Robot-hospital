import { userDb } from '../lib/supabase.js'

// Valida el token con Supabase y carga el perfil. Un usuario inactivo no tiene perfil visible (RLS) -> 403.
export const requireUser = async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return c.json({ error: 'No autenticado' }, 401)

  const db = userDb(token)
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) return c.json({ error: 'Sesión no válida' }, 401)

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, service_id, center_id, specialty')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!profile) return c.json({ error: 'Usuario sin perfil activo' }, 403)

  c.set('db', db)
  c.set('user', data.user)
  c.set('profile', profile)
  c.set('token', token)
  await next()
}

export const requireRole = (...roles) => async (c, next) =>
  roles.includes(c.get('profile').role)
    ? next()
    : c.json({ error: 'Tu rol no permite esta acción' }, 403)