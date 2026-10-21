import { Router } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { createAdminController } from '../controllers/admin.js'
import { createDashboardController } from '../controllers/dashboard.js'

export function adminRouter({ auth, dashboard, requireAdmin, secureCookies, rateLimitWindowMs = 900_000, authRateLimitMax = 10 }) {
  const router = Router()
  const controller = createAdminController(auth, { secureCookies })
  const limited = rateLimit({ windowMs: rateLimitWindowMs, limit: authRateLimitMax, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_request, response) => response.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please try again later.' }) })
  const emailLimited = rateLimit({ windowMs: rateLimitWindowMs, limit: authRateLimitMax, standardHeaders: false, legacyHeaders: false, keyGenerator: (request) => String(request.body?.email || ipKeyGenerator(request.ip)).trim().toLowerCase(), handler: (_request, response) => response.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please try again later.' }) })
  router.post('/login', limited, controller.login)
  router.post('/forgot-password', limited, emailLimited, controller.forgot)
  router.post('/reset-password', limited, emailLimited, controller.reset)
  router.get('/session', requireAdmin, controller.session)
  router.post('/logout', requireAdmin, controller.logout)
  router.get('/dashboard', requireAdmin, createDashboardController(dashboard).overview)
  router.get('/accounts', requireAdmin, controller.list)
  router.post('/accounts', requireAdmin, controller.create)
  return router
}
