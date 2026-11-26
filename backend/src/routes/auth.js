import { Hono } from 'hono'
import { requireUser } from '../middleware/auth.js'

export const authRoutes = new Hono()
authRoutes.get('/me', requireUser, (c) => c.json({ profile: c.get('profile') }))