import 'dotenv/config'
import { createApp } from './app.js'
import { connectDatabase } from './db.js'
import { createConsultationService } from './services/consultations.js'

const port = Number(process.env.PORT || 3001)
const database = await connectDatabase({ uri: process.env.MONGODB_URI, databaseName: process.env.MONGODB_DB_NAME })
const app = createApp({ service: createConsultationService(database.repository), corsOrigin: process.env.CORS_ORIGIN, rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900_000), rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 20) })
const server = app.listen(port, () => console.log(`AVL Capital API listening on port ${port}`))
async function shutdown() { server.close(async () => { await database.close(); process.exit(0) }) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
