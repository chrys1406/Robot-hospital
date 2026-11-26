export const clientIp = (c) =>
  c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.req.header('x-real-ip') || 'local'

// Ventana fija en memoria (suficiente para una sola instancia)
export function rateLimit({ windowMs, max, key = clientIp, message = 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }) {
  const hits = new Map()
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
  }, windowMs).unref()

  return async (c, next) => {
    const k = key(c)
    const now = Date.now()
    let e = hits.get(k)
    if (!e || e.reset <= now) { e = { count: 0, reset: now + windowMs }; hits.set(k, e) }
    e.count += 1
    if (e.count > max) {
      c.header('Retry-After', String(Math.ceil((e.reset - now) / 1000)))
      return c.json({ error: message }, 429)
    }
    await next()
  }
}