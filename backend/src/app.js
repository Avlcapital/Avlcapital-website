import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { requireAdmin } from './middlewares/auth.js'
import { errorHandler } from './middlewares/errors.js'
import { adminRouter } from './routers/admin.js'
import { consultationRouter } from './routers/consultations.js'
import { partnerRouter } from './routers/partners.js'
import { chatRouter } from './routers/chat.js'

export function createApp({ service, partnerService, chatService, authService, dashboardService, corsOrigin, rateLimitWindowMs, rateLimitMax, authRateLimitMax, secureCookies = true }) {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ credentials: true, origin(origin, callback) { if (!origin || (corsOrigin && origin === corsOrigin)) return callback(null, true); const error = new Error('Origin not allowed'); error.code = 'CORS_ORIGIN_DENIED'; return callback(error) } }))
  app.use(express.json({ limit: '16kb' }))
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
  const protectedRoute = authService ? requireAdmin(authService) : (_request, response) => response.status(401).json({ error: 'unauthorized', message: 'Authentication required.' })
  app.use('/api/consultations', consultationRouter({ service, requireAdmin: protectedRoute, rateLimitWindowMs, rateLimitMax }))
  if (partnerService) app.use('/api/partners', partnerRouter({ service: partnerService, requireAdmin: protectedRoute, rateLimitWindowMs, rateLimitMax }))
  if (chatService) app.use('/api/chat', chatRouter({ service: chatService, requireAdmin: protectedRoute, secureCookies, rateLimitWindowMs, rateLimitMax }))
  if (authService) app.use('/api/admin', adminRouter({ auth: authService, dashboard: dashboardService || { overview: async () => ({ counts: {}, activity: [], unavailable: [] }) }, requireAdmin: protectedRoute, secureCookies, rateLimitWindowMs, authRateLimitMax }))
  app.use(errorHandler)
  return app
}
