import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { config } from './config.js'
import { anonDb } from './lib/supabase.js'
import { publicRoutes } from './routes/public.js'
import { authRoutes } from './routes/auth.js'

const app = new Hono()

app.use('*', secureHeaders())
app.use('*', cors({
  origin: (origin) => (config.corsOrigins.includes(origin) ? origin : null),
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Server-Timing'],
  maxAge: 7200, // el navegador recuerda el permiso previo y evita una ida y vuelta por petición
}))
app.use('*', bodyLimit({ maxSize: 6 * 1024 * 1024, onError: (c) => c.json({ error: 'Solicitud demasiado grande' }, 413) }))

app.get('/health', async (c) => {
  const { error } = await anonDb.from('centers').select('id').eq('id', config.centerId).limit(1)
  return c.json({ ok: !error, ts: new Date().toISOString() }, error ? 503 : 200)
})

app.route('/public', publicRoutes)
app.route('/', authRoutes)

app.notFound((c) => c.json({ error: 'No encontrado' }, 404))
app.onError((err, c) => {
  console.error('[error]', err.message)
  return c.json({ error: 'Error interno' }, 500)
})

export default app