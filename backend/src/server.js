import 'dotenv/config'
import { createApp } from './app.js'
import { connectDatabase } from './db.js'
import { createConsultationService } from './services/consultations.js'
import { createPartnerService } from './services/partners.js'
import { createAuthService } from './services/auth.js'
import { createMailer } from './services/mailer.js'
import { createChatService } from './services/chat.js'
import { createDashboardService } from './services/dashboard.js'

const port = Number(process.env.PORT || 3001)
const database = await connectDatabase({ uri: process.env.MONGODB_URI, databaseName: process.env.MONGODB_DB_NAME })
const mailer = createMailer({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD, from: process.env.SMTP_FROM })
const authService = createAuthService({ admins: database.adminRepository, sessions: database.sessionRepository, resets: database.resetRepository, mailer })
await authService.bootstrap(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD)
const chatService = createChatService({ conversations: database.chatConversationRepository, messages: database.chatMessageRepository, recoveryCodes: database.chatRecoveryRepository, mailer, recoveryMinutes: Number(process.env.CHAT_RECOVERY_MINUTES || 10), recoveryMaxAttempts: Number(process.env.CHAT_RECOVERY_MAX_ATTEMPTS || 5) })
const dashboardService = createDashboardService({ consultations: database.consultationRepository, partners: database.partnerRepository, chats: database.chatConversationRepository, admins: database.adminRepository })
const app = createApp({ service: createConsultationService(database.consultationRepository), partnerService: createPartnerService(database.partnerRepository), chatService, authService, dashboardService, corsOrigin: process.env.CORS_ORIGIN, rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900_000), rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 20), authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 10), secureCookies: process.env.NODE_ENV !== 'development' })
const server = app.listen(port, () => console.log(`AVL Capital API listening on port ${port}`))
async function shutdown() { chatService.hub.close(); server.close(async () => { await database.close(); process.exit(0) }) }

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
