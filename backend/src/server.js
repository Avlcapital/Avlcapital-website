import 'dotenv/config'
import { createApp } from './app.js'
import { connectDatabase } from './db.js'
import { createConsultationService } from './services/consultations.js'
import { createAuthService } from './services/auth.js'
import { createMailer } from './services/mailer.js'

const port = Number(process.env.PORT || 3001)
const database = await connectDatabase({ uri: process.env.MONGODB_URI, databaseName: process.env.MONGODB_DB_NAME })
const mailer = createMailer({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD, from: process.env.SMTP_FROM })
const authService = createAuthService({ admins: database.adminRepository, sessions: database.sessionRepository, resets: database.resetRepository, mailer })
await authService.bootstrap(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD)
const app = createApp({ service: createConsultationService(database.consultationRepository), authService, corsOrigin: process.env.CORS_ORIGIN, rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900_000), rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 20), authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 10), secureCookies: process.env.NODE_ENV !== 'development' })
const server = app.listen(port, () => console.log(`AVL Capital API listening on port ${port}`))
async function shutdown() { server.close(async () => { await database.close(); process.exit(0) }) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
