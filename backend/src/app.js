import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { consultationRoutes } from './routes/consultations.js'

export function createApp({ service, corsOrigin, rateLimitWindowMs, rateLimitMax }) {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin(origin, callback) { if (!origin || (corsOrigin && origin === corsOrigin)) return callback(null, true); const error = new Error('Origin not allowed'); error.code = 'CORS_ORIGIN_DENIED'; return callback(error) } }))
  app.use(express.json({ limit: '16kb' }))
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
  app.use('/api/consultations', consultationRoutes({ service, rateLimitWindowMs, rateLimitMax }))
  app.use((error, _request, response, _next) => {
    if (error?.code === 'CORS_ORIGIN_DENIED') return response.status(403).json({ error: 'origin_forbidden', message: 'This origin is not allowed.' })
    if (error?.type === 'entity.parse.failed') return response.status(400).json({ error: 'invalid_json', message: 'The request body must contain valid JSON.' })
    if (error?.type === 'entity.too.large') return response.status(413).json({ error: 'request_too_large', message: 'The request body is too large.' })
    return response.status(500).json({ error: 'server_error', message: 'We could not process your enquiry. Please try again later.' })
  })
  return app
}
