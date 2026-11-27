import { Hono } from 'hono'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { requireUser, requireRole } from '../middleware/auth.js'
import { adminDb } from '../lib/supabase.js'
import { rateLimit } from '../lib/rateLimit.js'

export const adminRoutes = new Hono()
adminRoutes.use('*', requireUser, requireRole('director'), rateLimit({ windowMs: 60_000, max: 30, key: (c) => c.get('user').id }))

// El director no crea otros directores desde aquí (evita duplicar el máximo privilegio)
const ROLES = ['medico', 'enfermeria', 'jefatura_enfermeria', 'calidad']
const NEEDS_SERVICE = ['enfermeria', 'jefatura_enfermeria']
const tempPassword = () => `${randomBytes(9).toString('base64url')}!A7`
const uuid = z.string().uuid()

const createSchema = z.object({
  email: z.string().email().max(120).transform((s) => s.toLowerCase()),
  fullName: z.string().trim().min(3).max(120),
  role: z.enum(ROLES),
  serviceId: uuid.optional(),
  specialty: z.string().trim().max(80).optional(),
  licenseNumber: z.string().trim().max(40).optional(),
}).refine((v) => !NEEDS_SERVICE.includes(v.role) || v.serviceId, { message: 'La enfermería requiere un servicio', path: ['serviceId'] })

const patchSchema = z.object({
  role: z.enum(ROLES).optional(),
  serviceId: uuid.nullable().optional(),
  specialty: z.string().trim().max(80).nullable().optional(),
  isActive: z.boolean().optional(),
})

adminRoutes.get('/users', async (c) => {
  const db = c.get('db')
  const { data: profiles, error } = await db.from('profiles')
    .select('id, full_name, role, service_id, specialty, license_number, is_active, created_at, services(name)')
    .order('full_name')
  if (error) { console.error('[admin] listar', error.message); return c.json({ error: 'No se pudo listar' }, 500) }
  const { data: au } = await adminDb().auth.admin.listUsers({ perPage: 1000 })
  const email = Object.fromEntries((au?.users ?? []).map((u) => [u.id, u.email]))
  return c.json({ users: profiles.map((p) => ({ ...p, email: email[p.id] ?? null })) })
})

adminRoutes.post('/users', async (c) => {
  const parsed = createSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Datos no válidos' }, 400)
  const v = parsed.data
  const db = c.get('db'), centerId = c.get('profile').center_id   // el centro SIEMPRE sale de la sesión

  let service = null
  if (v.serviceId) {
    const { data } = await db.from('services').select('id, floor').eq('id', v.serviceId).eq('center_id', centerId).maybeSingle()
    if (!data) return c.json({ error: 'Servicio no válido' }, 400)
    service = data
  }

  const admin = adminDb()
  const password = tempPassword()
  const { data, error } = await admin.auth.admin.createUser({
    email: v.email, password, email_confirm: true,
    user_metadata: { full_name: v.fullName, must_change_password: true },
  })
  if (error) {
    return c.json({ error: /already|registered|exists/i.test(error.message) ? 'Ese correo ya está registrado' : 'No se pudo crear el usuario' }, 400)
  }

  const { error: pErr } = await admin.from('profiles').insert({
    id: data.user.id, center_id: centerId, full_name: v.fullName, role: v.role,
    service_id: v.serviceId ?? null, specialty: v.specialty ?? null, license_number: v.licenseNumber ?? null,
  })
  if (pErr) {
    console.error('[admin] perfil', pErr.message)
    await admin.auth.admin.deleteUser(data.user.id)   // no dejar un usuario sin perfil
    return c.json({ error: 'No se pudo crear el perfil' }, 500)
  }

  if (v.role === 'medico') {   // aparece en el directorio público del robot
    await admin.from('doctor_directory').insert({
      center_id: centerId, profile_id: data.user.id, display_name: v.fullName,
      specialty: v.specialty ?? 'Medicina general', service_id: v.serviceId ?? null,
      floor: service?.floor ?? null, is_public: true,
    })
  }

  await db.rpc('log_audit', { p_action: 'usuario.creado', p_entity_type: 'profile', p_entity_id: data.user.id, p_detail: { rol: v.role } })
  return c.json({
    user: { id: data.user.id, email: v.email, fullName: v.fullName, role: v.role },
    temporaryPassword: password,   // se muestra una sola vez; el front debe pedir cambiarla (must_change_password)
  }, 201)
})

adminRoutes.patch('/users/:id', async (c) => {
  const id = c.req.param('id')
  if (!uuid.safeParse(id).success) return c.json({ error: 'Solicitud no válida' }, 400)
  if (id === c.get('user').id) return c.json({ error: 'No puedes modificar tu propia cuenta desde aquí' }, 400)
  const parsed = patchSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'Datos no válidos' }, 400)
  const v = parsed.data, db = c.get('db')

  const { data: target } = await db.from('profiles').select('id, role, service_id').eq('id', id).maybeSingle()
  if (!target) return c.json({ error: 'Usuario no encontrado' }, 404)
  if (target.role === 'director') return c.json({ error: 'No se puede modificar a otro director' }, 403)

  const role = v.role ?? target.role
  const serviceId = v.serviceId === undefined ? target.service_id : v.serviceId
  if (NEEDS_SERVICE.includes(role) && !serviceId) return c.json({ error: 'La enfermería requiere un servicio' }, 400)
  if (serviceId) {
    const { data: s } = await db.from('services').select('id').eq('id', serviceId).maybeSingle()
    if (!s) return c.json({ error: 'Servicio no válido' }, 400)
  }

  const patch = { role, service_id: serviceId }
  if (v.specialty !== undefined) patch.specialty = v.specialty
  if (v.isActive !== undefined) patch.is_active = v.isActive
  const { data: updated, error } = await db.from('profiles').update(patch).eq('id', id)
    .select('id, full_name, role, service_id, specialty, is_active').single()
  if (error) { console.error('[admin] editar', error.message); return c.json({ error: 'No se pudo actualizar' }, 400) }

  if (v.isActive !== undefined) {   // además de quedar sin permisos, se bloquea el inicio de sesión
    await adminDb().auth.admin.updateUserById(id, { ban_duration: v.isActive ? 'none' : '876000h' })
  }
  await db.rpc('log_audit', { p_action: 'usuario.modificado', p_entity_type: 'profile', p_entity_id: id, p_detail: v })
  return c.json({ user: updated })
})

adminRoutes.post('/users/:id/reset-password', async (c) => {
  const id = c.req.param('id')
  if (!uuid.safeParse(id).success) return c.json({ error: 'Solicitud no válida' }, 400)
  if (id === c.get('user').id) return c.json({ error: 'Cambia tu propia contraseña desde tu perfil' }, 400)
  const db = c.get('db')
  const { data: target } = await db.from('profiles').select('id, role').eq('id', id).maybeSingle()
  if (!target) return c.json({ error: 'Usuario no encontrado' }, 404)
  if (target.role === 'director') return c.json({ error: 'No se puede modificar a otro director' }, 403)

  const password = tempPassword()
  const { error } = await adminDb().auth.admin.updateUserById(id, { password })
  if (error) { console.error('[admin] reset', error.message); return c.json({ error: 'No se pudo restablecer' }, 500) }
  await db.rpc('log_audit', { p_action: 'usuario.contrasena_restablecida', p_entity_type: 'profile', p_entity_id: id })
  return c.json({ temporaryPassword: password })
})