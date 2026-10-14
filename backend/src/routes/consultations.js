import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { validateConsultation } from '../validation.js'

const confirmation = (id) => ({ id, status: 'received', message: 'Your consultation enquiry has been received.' })

export function consultationRoutes({ service, rateLimitWindowMs = 900_000, rateLimitMax = 20 }) {
  const router = Router()
  router.use(rateLimit({ windowMs: rateLimitWindowMs, limit: rateLimitMax, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_request, response) => response.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please try again later.' }) }))
  router.post('/', async (request, response, next) => {
    try {
      const { data, errors, valid } = validateConsultation(request.body)
      if (data.website) return response.status(201).json(confirmation(randomUUID()))
      if (!valid) return response.status(400).json({ error: 'validation_error', message: 'Please correct the highlighted fields.', fields: errors })
      return response.status(201).json(confirmation(await service.create(data)))
    } catch (error) { return next(error) }
  })
  return router
}
