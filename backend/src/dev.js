import { serve } from '@hono/node-server'
import app from './index.js'
import { config } from './config.js'

serve({ fetch: app.fetch, port: config.port }, (info) =>
  console.log(`API lista en http://localhost:${info.port}`))