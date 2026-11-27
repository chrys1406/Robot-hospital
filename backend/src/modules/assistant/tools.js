import { z } from 'zod'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { config } from '../../config.js'

const TZ = 'America/La_Paz'
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
const hhmm = (iso) => new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
const edad = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 31_557_600_000)
const minutesAgo = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
const uuid = z.string().uuid()
const PRIO = { alta: 'alta', media: 'media', baja_media: 'baja-media', baja: 'baja' }
const ESTADO = { generada: 'generada', notificada: 'pendiente de acuse', acusada: 'acusada', en_atencion: 'en atención', cerrada: 'cerrada' }

// ───────── Confirmaciones firmadas (5 min, un solo uso, ligadas al usuario) ─────────
const sign = (body) => createHmac('sha256', config.actionSecret).update(body).digest('base64url')
const used = new Map()

export function signAction(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, jti: randomUUID(), exp: Date.now() + 5 * 60_000 })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifyAction(token, uid) {
  const [body, sig] = String(token ?? '').split('.')
  if (!body || !sig) return null
  const a = Buffer.from(sig), b = Buffer.from(sign(body))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  let p
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString()) } catch { return null }
  if (p.uid !== uid || p.exp < Date.now() || used.has(p.jti)) return null
  used.set(p.jti, p.exp)
  for (const [k, v] of used) if (v < Date.now()) used.delete(k)
  return p
}

// ───────── Declaración de herramientas para Gemini ─────────
const id = { type: 'string', description: 'UUID obtenido con buscar_paciente o buscar_colega' }
export const declarations = [
  { name: 'citas_de_hoy', description: 'Lista las citas del médico para hoy.' },
  { name: 'buscar_paciente', description: 'Busca entre los pacientes del médico por nombre o código (ej. HN-000101). Devuelve el paciente_id.',
    parameters: { type: 'object', properties: { texto: { type: 'string', description: 'Nombre, apellido o código' } }, required: ['texto'] } },
  { name: 'estado_actual', description: 'Estado actual de un paciente: último control, puntaje NEWS2, alertas abiertas e ingreso. Registra el acceso en la bitácora.',
    parameters: { type: 'object', properties: { paciente_id: id }, required: ['paciente_id'] } },
  { name: 'ver_alertas', description: 'Alertas abiertas (no cerradas) de los pacientes del médico, de mayor a menor prioridad.' },
  { name: 'leer_historial', description: 'Documentos clínicos de un paciente (historia, laboratorio, indicaciones, epicrisis). Registra el acceso en la bitácora.',
    parameters: { type: 'object', properties: { paciente_id: id, consulta: { type: 'string', description: 'Texto a buscar dentro del historial (opcional)' } }, required: ['paciente_id'] } },
  { name: 'buscar_colega', description: 'Busca a otro médico del hospital por nombre. Devuelve el colega_id.',
    parameters: { type: 'object', properties: { nombre: { type: 'string' } }, required: ['nombre'] } },
  { name: 'proponer_compartir_historial', description: 'Prepara compartir el historial de un paciente con otro médico. NO lo ejecuta: queda pendiente de confirmación del médico.',
    parameters: { type: 'object', properties: { paciente_id: id, colega_id: id, motivo: { type: 'string' } }, required: ['paciente_id', 'colega_id'] } },
  { name: 'proponer_mensaje', description: 'Prepara un mensaje para otro médico. NO lo envía: queda pendiente de confirmación del médico.',
    parameters: { type: 'object', properties: { colega_id: id, texto: { type: 'string' }, paciente_id: { type: 'string', description: 'Paciente relacionado (opcional)' } }, required: ['colega_id', 'texto'] } },
]

// ───────── Ejecución: cada herramienta corre con la sesión del médico ─────────
export function buildTools({ db, uid, mode }) {
  const seesNames = mode === 'completo'
  const who = (code, name) => (seesNames && name ? `${name} (${code})` : code)

  const impl = {
    async citas_de_hoy() {
      const { data, error } = await db.rpc('my_appointments_today')
      if (error) throw error
      const items = data.map((a) => ({
        hora: hhmm(a.starts_at), estado: a.status, motivo: a.reason, servicio: a.service_name,
        paciente: { id: a.patient_id, codigo: a.patient_code, nombre: a.patient_name },
      }))
      const reply = items.length
        ? `Hoy tienes ${items.length} ${items.length === 1 ? 'cita' : 'citas'}. ` +
          items.map((i) => `A las ${i.hora}, ${i.paciente.nombre}${i.motivo ? `, ${i.motivo.toLowerCase()}` : ''}.`).join(' ')
        : 'Hoy no tienes citas programadas.'
      return {
        directReply: reply,
        display: { kind: 'citas', items },
        forModel: { cantidad: items.length, citas: items.map((i) => ({ hora: i.hora, motivo: i.motivo, paciente: who(i.paciente.codigo, i.paciente.nombre) })) },
      }
    },

    async buscar_paciente(args) {
      const { texto } = z.object({ texto: z.string().min(2).max(80) }).parse(args)
      const { data, error } = await db.from('patients').select('id, code, full_name, birth_date, sex').order('full_name').limit(200)
      if (error) throw error
      const q = norm(texto)
      const hits = data.filter((p) => norm(p.full_name).includes(q) || norm(p.code).includes(q)).slice(0, 5)
      return {
        forModel: hits.length
          ? { resultados: hits.map((p) => ({ paciente_id: p.id, codigo: p.code, ...(seesNames ? { nombre: p.full_name } : {}) })) }
          : { resultados: [], nota: 'Sin coincidencias entre los pacientes del médico' },
        display: { kind: 'pacientes', items: hits.map((p) => ({ id: p.id, codigo: p.code, nombre: p.full_name, edad: edad(p.birth_date), sexo: p.sex })) },
        focus: hits.length === 1 ? { id: hits[0].id, code: hits[0].code, name: hits[0].full_name } : undefined,
      }
    },

    async estado_actual(args) {
      const { paciente_id } = z.object({ paciente_id: uuid }).parse(args)
      const { data: p, error } = await db.rpc('open_patient', { p_patient: paciente_id, p_via_assistant: true })
      if (error || !p) return { forModel: { error: 'No tienes acceso a ese paciente' } }

      const [vit, alerts, adm] = await Promise.all([
        db.from('vital_signs')
          .select('measured_at, resp_rate, spo2, systolic_bp, pulse, temperature, consciousness, supplemental_o2, news2_total, news2_priority, news2_breakdown')
          .eq('patient_id', p.id).order('measured_at', { ascending: false }).limit(2),
        db.from('alerts').select('alert_number, priority, status, rule_applied, generated_at')
          .eq('patient_id', p.id).neq('status', 'cerrada').order('generated_at', { ascending: false }),
        db.from('admissions').select('bed, admitted_at, discharged_at, tracking, services(name)')
          .eq('patient_id', p.id).order('admitted_at', { ascending: false }).limit(1),
      ])
      const v = vit.data?.[0], prev = vit.data?.[1], ing = adm.data?.[0]
      const base = {
        edad: edad(p.birth_date), sexo: p.sex,
        servicio: ing?.services?.name ?? null, cama: ing?.bed ?? null,
        ingreso: ing?.admitted_at ?? null, alta: ing?.discharged_at ?? null,
        ultimoControl: v ? {
          hace_min: minutesAgo(v.measured_at),
          valores: { fr: v.resp_rate, spo2: v.spo2, pas: v.systolic_bp, pulso: v.pulse, temp: v.temperature, conciencia: v.consciousness, o2_suplementario: v.supplemental_o2 },
          news2_total: v.news2_total, news2_prioridad: PRIO[v.news2_priority], detalle: v.news2_breakdown,
          news2_control_anterior: prev?.news2_total ?? null,
        } : null,
        alertasAbiertas: (alerts.data ?? []).map((a) => ({
          numero: a.alert_number, prioridad: PRIO[a.priority], estado: ESTADO[a.status], regla: a.rule_applied, hace_min: minutesAgo(a.generated_at),
        })),
      }
      return {
        display: { kind: 'estado', paciente: { id: p.id, codigo: p.code, nombre: p.full_name }, ...base },
        forModel: { paciente: who(p.code, p.full_name), ...base },
        focus: { id: p.id, code: p.code, name: p.full_name },
      }
    },

    async ver_alertas() {
      const { data, error } = await db.from('alerts')
        .select('id, alert_number, priority, status, patient_id, patient_code_snapshot, rule_applied, generated_at')
        .neq('status', 'cerrada').order('priority', { ascending: false }).order('generated_at', { ascending: false }).limit(10)
      if (error) throw error
      const ids = [...new Set(data.map((a) => a.patient_id))]
      const { data: pats } = ids.length ? await db.from('patients').select('id, code, full_name').in('id', ids) : { data: [] }
      const nameOf = Object.fromEntries((pats ?? []).map((p) => [p.id, p.full_name]))
      const items = data.map((a) => ({
        numero: a.alert_number, prioridad: PRIO[a.priority], estado: ESTADO[a.status], regla: a.rule_applied, hace_min: minutesAgo(a.generated_at),
        paciente: { id: a.patient_id, codigo: a.patient_code_snapshot, nombre: nameOf[a.patient_id] ?? a.patient_code_snapshot },
      }))
      const top = items.slice(0, 3).map((i) => `prioridad ${i.prioridad}, ${i.paciente.nombre}, ${i.estado}`)
      const reply = items.length
        ? `Tienes ${items.length} ${items.length === 1 ? 'alerta abierta' : 'alertas abiertas'}: ${top.join('; ')}.` + (items.length > 3 ? ` Y ${items.length - 3} más en pantalla.` : '')
        : 'No tienes alertas abiertas.'
      return {
        directReply: reply,
        display: { kind: 'alertas', items },
        forModel: { cantidad: items.length, alertas: items.map((i) => ({ prioridad: i.prioridad, estado: i.estado, paciente: who(i.paciente.codigo, i.paciente.nombre) })) },
      }
    },

    async leer_historial(args) {
      const { paciente_id, consulta } = z.object({ paciente_id: uuid, consulta: z.string().max(120).optional() }).parse(args)
      const [{ data: docs, error }, { data: p }] = await Promise.all([
        db.rpc('read_clinical_documents', { p_patient: paciente_id, p_query: consulta ?? null, p_via_assistant: true }),
        db.from('patients').select('id, code, full_name').eq('id', paciente_id).maybeSingle(),
      ])
      if (error || !p) return { forModel: { error: 'No tienes acceso al historial de ese paciente' } }
      const documentos = (docs ?? []).map((d) => ({ id: d.id, tipo: d.doc_type, titulo: d.title, fecha: d.doc_date, texto: d.content_text }))
      const display = { kind: 'historial', paciente: { id: p.id, codigo: p.code, nombre: p.full_name }, documentos }
      const focus = { id: p.id, code: p.code, name: p.full_name }
      if (seesNames) {
        return { display, focus, forModel: { paciente: who(p.code, p.full_name), documentos: documentos.map(({ tipo, titulo, fecha, texto }) => ({ tipo, titulo, fecha, texto })) } }
      }
      return {
        display, focus,
        forModel: { cantidad: documentos.length, titulos: documentos.map((d) => d.titulo) },
        directReply: documentos.length
          ? `Encontré ${documentos.length} ${documentos.length === 1 ? 'documento' : 'documentos'} en el historial de ${p.full_name}: ${documentos.map((d) => d.titulo).join(', ')}. Los muestro en pantalla.`
          : `No encontré documentos${consulta ? ' que coincidan' : ''} en el historial de ${p.full_name}.`,
      }
    },

    async buscar_colega(args) {
      const { nombre } = z.object({ nombre: z.string().min(2).max(80) }).parse(args)
      const { data, error } = await db.from('profiles').select('id, full_name, specialty').eq('role', 'medico').eq('is_active', true).neq('id', uid)
      if (error) throw error
      const q = norm(nombre)
      const hits = data.filter((m) => norm(m.full_name).includes(q)).slice(0, 5)
      return {
        forModel: hits.length
          ? { resultados: hits.map((m) => ({ colega_id: m.id, nombre: m.full_name, especialidad: m.specialty })) }
          : { resultados: [], nota: 'No hay un médico con ese nombre' },
      }
    },

    async proponer_compartir_historial(args) {
      const a = z.object({ paciente_id: uuid, colega_id: uuid, motivo: z.string().max(200).optional() }).parse(args)
      const [{ data: p }, { data: c }] = await Promise.all([
        db.from('patients').select('id, code, full_name').eq('id', a.paciente_id).maybeSingle(),
        db.from('profiles').select('id, full_name').eq('id', a.colega_id).eq('role', 'medico').eq('is_active', true).maybeSingle(),
      ])
      if (!p || !c) return { forModel: { error: 'Paciente o colega no válido' } }
      const summary = `Compartir el historial clínico de ${p.full_name} (${p.code}) con ${c.full_name}${a.motivo ? `. Motivo: ${a.motivo}` : ''}.`
      const token = signAction({ uid, type: 'share_record', paciente_id: p.id, colega_id: c.id, motivo: a.motivo ?? null })
      return {
        pending: { type: 'share_record', summary, token },
        forModel: { estado: 'pendiente_de_confirmacion', paciente: who(p.code, p.full_name), colega: c.full_name },
      }
    },

    async proponer_mensaje(args) {
      const a = z.object({ colega_id: uuid, texto: z.string().min(1).max(1000), paciente_id: uuid.optional() }).parse(args)
      const { data: c } = await db.from('profiles').select('id, full_name').eq('id', a.colega_id).eq('role', 'medico').eq('is_active', true).maybeSingle()
      let p = null
      if (a.paciente_id) ({ data: p } = await db.from('patients').select('id, code, full_name').eq('id', a.paciente_id).maybeSingle())
      if (!c || (a.paciente_id && !p)) return { forModel: { error: 'Colega o paciente no válido' } }
      const summary = `Enviar a ${c.full_name}${p ? ` (sobre ${p.full_name})` : ''}: "${a.texto}"`
      const token = signAction({ uid, type: 'send_message', colega_id: c.id, texto: a.texto, paciente_id: p?.id ?? null })
      return {
        pending: { type: 'send_message', summary, token },
        forModel: { estado: 'pendiente_de_confirmacion', colega: c.full_name },
      }
    },
  }

  async function run(name, args) {
    const fn = impl[name]
    if (!fn) return { forModel: { error: `Herramienta desconocida: ${name}` } }
    try {
      return await fn(args ?? {})
    } catch (e) {
      if (e instanceof z.ZodError) return { forModel: { error: 'Parámetros no válidos' } }
      console.error(`[assistant/tool:${name}]`, e.message ?? e)
      return { forModel: { error: 'No se pudo completar la consulta' } }
    }
  }

  return { run }
}