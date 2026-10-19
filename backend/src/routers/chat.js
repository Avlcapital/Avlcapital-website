import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { createChatController } from '../controllers/chat.js'

const limited = (windowMs, limit) => rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_request, response) => response.status(429).json({ error: 'rate_limited', message: 'Too many chat requests. Please try again shortly.' }) })

export function chatRouter({ service, requireAdmin, secureCookies, rateLimitWindowMs = 60_000, rateLimitMax = 30 }) {
  const router = Router(); const controller = createChatController(service, { secureCookies })
  router.get('/session', controller.session)
  router.post('/session', limited(rateLimitWindowMs, Math.min(rateLimitMax, 10)), controller.start)
  router.post('/recovery/request', limited(rateLimitWindowMs, Math.min(rateLimitMax, 5)), controller.requestRecovery)
  router.post('/recovery/verify', limited(rateLimitWindowMs, Math.min(rateLimitMax, 10)), controller.verifyRecovery)
  router.get('/messages', controller.messages)
  router.post('/messages', limited(rateLimitWindowMs, rateLimitMax), controller.send)
  router.get('/stream', controller.visitorStream)
  router.get('/admin/conversations', requireAdmin, controller.adminList)
  router.get('/admin/conversations/:id', requireAdmin, controller.adminDetail)
  router.post('/admin/conversations/:id/messages', requireAdmin, limited(rateLimitWindowMs, rateLimitMax), controller.adminSend)
  router.patch('/admin/conversations/:id/status', requireAdmin, controller.adminStatus)
  router.get('/admin/stream', requireAdmin, controller.adminStream)
  return router
}
