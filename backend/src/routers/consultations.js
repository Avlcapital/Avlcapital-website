import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { createConsultationController } from '../controllers/consultations.js'

export function consultationRouter({ service, requireAdmin, rateLimitWindowMs = 900_000, rateLimitMax = 20 }) {
  const router = Router()
  const controller = createConsultationController(service)
  router.post('/', rateLimit({ windowMs: rateLimitWindowMs, limit: rateLimitMax, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_request, response) => response.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please try again later.' }) }), controller.submit)
  router.get('/', requireAdmin, controller.list)
  router.get('/:id', requireAdmin, controller.detail)
  router.patch('/:id/status', requireAdmin, controller.status)
  return router
}
