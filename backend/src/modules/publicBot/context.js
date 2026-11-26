import { anonDb } from '../../lib/supabase.js'
import { config } from '../../config.js'

let cache = { text: '', at: 0 }

// Arma, con datos públicos de la base, el texto que lee la IA. Caché de 60 s.
export async function getPublicContext() {
  if (cache.text && Date.now() - cache.at < 60_000) return cache.text
  const c = config.centerId

  const [center, services, doctors, kb] = await Promise.all([
    anonDb.from('centers').select('name, city, address').eq('id', c).maybeSingle(),
    anonDb.from('services').select('name, description, floor, location_notes, schedule').eq('center_id', c).order('name'),
    anonDb.from('doctor_directory').select('display_name, specialty, floor, office, schedule').eq('center_id', c).order('display_name'),
    anonDb.from('kb_documents').select('title, content').eq('center_id', c).order('title'),
  ])
  for (const r of [center, services, doctors, kb]) {
    if (r.error) throw new Error(`Contexto público: ${r.error.message}`)
  }

  const groups = new Map()
  const pending = []
  for (const s of services.data) {
    if (!s.floor) { pending.push(s); continue }
    const key = [s.floor, s.location_notes].filter(Boolean).join(' · ')
    groups.set(key, [...(groups.get(key) ?? []), s.name])
  }

  const lines = []
  const ce = center.data
  lines.push(`CENTRO: ${ce?.name ?? 'Hospital del Norte'}, ${ce?.address ?? ''}, ${ce?.city ?? ''}.`)
  lines.push('UBICACIÓN DE SERVICIOS:')
  for (const [key, names] of groups) lines.push(`- ${key}: ${names.join(', ')}.`)
  lines.push('OTROS SERVICIOS:')
  for (const s of pending) {
    lines.push(`- ${s.name}${s.description ? ` (${s.description})` : ''}${s.schedule ? `, horario: ${s.schedule}` : ''}${s.location_notes ? `. ${s.location_notes}` : ''}`)
  }
  if (doctors.data.length) {
    lines.push('MÉDICOS:')
    for (const d of doctors.data) {
      lines.push(`- ${d.display_name}, ${d.specialty}. ${d.floor ?? 'Piso por confirmar'}, consultorio ${d.office ?? 'por confirmar'}, horario ${d.schedule ?? 'por confirmar'}.`)
    }
  }
  lines.push('INFORMACIÓN GENERAL:')
  for (const k of kb.data) lines.push(`- ${k.title}: ${k.content}`)

  cache = { text: lines.join('\n'), at: Date.now() }
  return cache.text
}