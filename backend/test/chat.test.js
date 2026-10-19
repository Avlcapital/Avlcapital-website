import assert from 'node:assert/strict'
import http from 'node:http'
import { describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createConsultationService } from '../src/services/consultations.js'
import { createChatService } from '../src/services/chat.js'

const conversationId = '507f1f77bcf86cd799439011'
const messageIds = ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014']
const objectId = (value) => ({ toString: () => value })

function setup({ mailer: mailerOverride } = {}) {
  const conversationRecords = []; const messageRecords = []; const recoveryRecords = []; const delivered = []
  const conversations = {
    async create(record) { const id = conversationRecords.length === 0 ? conversationId : `507f1f77bcf86cd7994390${20 + conversationRecords.length}`; conversationRecords.push({ ...record, _id: objectId(id) }); return id },
    async findByVisitorHash(hash) { return conversationRecords.find((item) => item.visitorTokenHash === hash) || null },
    async findLatestByEmail(email) { return conversationRecords.filter((item) => item.email === email).sort((a, b) => b.lastMessageAt - a.lastMessageAt || b.createdAt - a.createdAt)[0] || null },
    async findById(id) { return conversationRecords.find((item) => item._id.toString() === id) || null },
    async list() { return conversationRecords }, async count() { return conversationRecords.length },
    async touch(id, timestamp) { const item = await this.findById(id); if (item) item.lastMessageAt = timestamp },
    async setStatus(id, status, timestamp) { const item = await this.findById(id); if (!item) return null; Object.assign(item, { status, updatedAt: timestamp }); return item },
    async rotateVisitorToken(id, currentHash, nextHash, timestamp) { const item = await this.findById(id); if (!item || item.visitorTokenHash !== currentHash) return null; Object.assign(item, { visitorTokenHash: nextHash, updatedAt: timestamp }); return item },
  }
  const messages = {
    async create(record) { const id = messageIds[messageRecords.length]; messageRecords.push({ ...record, _id: objectId(id) }); return id },
    async findById(id) { return messageRecords.find((item) => item._id.toString() === id) || null },
    async list(id) { return messageRecords.filter((item) => item.conversationId === id) },
  }
  const recoveryCodes = {
    async create(record) { const created = { ...record, _id: objectId(`recovery-${recoveryRecords.length + 1}`) }; recoveryRecords.push(created); return { insertedId: created._id } },
    async findActive(email, timestamp, maxAttempts) { return recoveryRecords.filter((item) => item.email === email && item.expiresAt > timestamp && !item.usedAt && item.attempts < maxAttempts).at(-1) || null },
    async consume(id, timestamp, maxAttempts) { const item = recoveryRecords.find((entry) => entry._id === id); if (!item || item.usedAt || item.expiresAt <= timestamp || item.attempts >= maxAttempts) return { modifiedCount: 0 }; item.usedAt = timestamp; return { modifiedCount: 1 } },
    async failAttempt(id, maxAttempts) { const item = recoveryRecords.find((entry) => entry._id === id); if (!item || item.usedAt || item.attempts >= maxAttempts) return { modifiedCount: 0 }; item.attempts += 1; return { modifiedCount: 1 } },
    async invalidate(id) { const index = recoveryRecords.findIndex((entry) => entry._id === id); if (index >= 0) recoveryRecords.splice(index, 1) },
    async invalidateForEmail(email) { for (let index = recoveryRecords.length - 1; index >= 0; index -= 1) if (recoveryRecords[index].email === email && !recoveryRecords[index].usedAt) recoveryRecords.splice(index, 1) },
  }
  const mailer = mailerOverride || { async sendChatRecovery(payload) { delivered.push(payload) } }
  const chatService = createChatService({ conversations, messages, recoveryCodes, mailer, logger: { error() {} } })
  const authService = { authenticate: async (token) => token === 'admin-token' ? { id: 'admin-1', email: 'owner@example.com' } : null }
  const app = createApp({ service: createConsultationService({ create: async () => 'id' }), chatService, authService, secureCookies: false, rateLimitMax: 100, rateLimitWindowMs: 60_000 })
  return { app, chatService, conversationRecords, messageRecords, recoveryRecords, delivered }
}

describe('live chat API', () => {
  it('requires valid contact details and stores only a digest of the visitor token', async () => {
    const { app, conversationRecords } = setup(); await request(app).post('/api/chat/session').send({ name: '', email: 'bad' }).expect(400)
    const created = await request(app).post('/api/chat/session').send({ name: 'Amina', email: 'AMINA@example.com', phone: '' }).expect(201)
    assert.match(created.headers['set-cookie'][0], /avl_chat=.*HttpOnly.*SameSite=Lax/); assert.equal(conversationRecords[0].email, 'amina@example.com'); assert.equal(conversationRecords[0].visitorTokenHash.length, 64); assert.doesNotMatch(JSON.stringify(created.body), /visitorToken|avl_chat/)
  })
  it('restores and continues the same conversation while isolating another visitor', async () => {
    const { app } = setup(); const visitor = request.agent(app); await visitor.post('/api/chat/session').send({ name: 'Amina', email: 'amina@example.com' }).expect(201)
    const sent = await visitor.post('/api/chat/messages').send({ body: 'I need help with finance.' }).expect(201); assert.equal(sent.body.message.body, 'I need help with finance.')
    const restored = await visitor.get('/api/chat/messages').expect(200); assert.equal(restored.body.messages.length, 1); assert.equal(restored.body.conversation.name, 'Amina')
    await request(app).get('/api/chat/messages').expect(404)
  })
  it('protects admin chat data and lets an admin reply, close, and reopen', async () => {
    const { app } = setup(); const visitor = request.agent(app); await visitor.post('/api/chat/session').send({ name: 'Amina', email: 'amina@example.com' }).expect(201)
    await request(app).get('/api/chat/admin/conversations').expect(401)
    const admin = request.agent(app); admin.jar.setCookie('avl_admin=admin-token')
    const list = await admin.get('/api/chat/admin/conversations').expect(200); assert.equal(list.body.items[0].email, 'amina@example.com')
    await admin.post(`/api/chat/admin/conversations/${conversationId}/messages`).send({ body: 'How can we assist?' }).expect(201)
    await admin.patch(`/api/chat/admin/conversations/${conversationId}/status`).send({ status: 'closed' }).expect(200)
    await visitor.post('/api/chat/messages').send({ body: 'One more thing' }).expect(409)
    await admin.patch(`/api/chat/admin/conversations/${conversationId}/status`).send({ status: 'open' }).expect(200)
    await visitor.post('/api/chat/messages').send({ body: 'Thank you' }).expect(201)
  })
  it('rejects empty and oversized messages without persistence', async () => {
    const { app, messageRecords } = setup(); const visitor = request.agent(app); await visitor.post('/api/chat/session').send({ name: 'Amina', email: 'amina@example.com' }).expect(201)
    await visitor.post('/api/chat/messages').send({ body: '   ' }).expect(400); await visitor.post('/api/chat/messages').send({ body: 'x'.repeat(2001) }).expect(400); assert.equal(messageRecords.length, 0)
  })
  it('returns the same recovery acknowledgement for known and unknown normalized emails', async () => {
    const { app, delivered } = setup(); await request(app).post('/api/chat/session').send({ name: 'Amina', email: 'AMINA@example.com' }).expect(201)
    const known = await request(app).post('/api/chat/recovery/request').send({ email: '  AMINA@example.com ' }).expect(202)
    const unknown = await request(app).post('/api/chat/recovery/request').send({ email: 'nobody@example.com' }).expect(202)
    assert.deepEqual(known.body, unknown.body); assert.equal(delivered.length, 1); assert.equal(delivered[0].to, 'amina@example.com'); assert.match(delivered[0].code, /^\d{6}$/)
  })
  it('keeps SMTP delivery failures generic and invalidates the undelivered code', async () => {
    const { app, recoveryRecords } = setup({ mailer: { async sendChatRecovery() { throw new Error('SMTP unavailable') } } })
    await request(app).post('/api/chat/session').send({ name: 'Amina', email: 'amina@example.com' }).expect(201)
    const response = await request(app).post('/api/chat/recovery/request').send({ email: 'amina@example.com' }).expect(202)
    assert.match(response.body.message, /if a conversation exists/i); assert.equal(recoveryRecords.length, 0)
  })
  it('recovers the latest conversation once and rotates access away from the previous browser', async () => {
    const { app, delivered } = setup(); const previous = request.agent(app)
    await previous.post('/api/chat/session').send({ name: 'Amina', email: 'amina@example.com' }).expect(201)
    await previous.post('/api/chat/messages').send({ body: 'Earlier message' }).expect(201)
    await request(app).post('/api/chat/recovery/request').send({ email: 'amina@example.com' }).expect(202)
    const recovered = request.agent(app); await recovered.post('/api/chat/recovery/verify').send({ email: 'AMINA@example.com', code: delivered[0].code }).expect(200)
    const history = await recovered.get('/api/chat/messages').expect(200); assert.equal(history.body.messages[0].body, 'Earlier message')
    await previous.get('/api/chat/messages').expect(404)
    await recovered.post('/api/chat/recovery/verify').send({ email: 'amina@example.com', code: delivered[0].code }).expect(401)
  })
  it('discloses no chat for wrong, expired, or capped recovery codes', async () => {
    const { app, delivered, recoveryRecords } = setup(); await request(app).post('/api/chat/session').send({ name: 'Amina', email: 'amina@example.com' }).expect(201)
    await request(app).post('/api/chat/recovery/request').send({ email: 'amina@example.com' }).expect(202)
    for (let attempt = 0; attempt < 5; attempt += 1) await request(app).post('/api/chat/recovery/verify').send({ email: 'amina@example.com', code: '000000' }).expect(401)
    await request(app).post('/api/chat/recovery/verify').send({ email: 'amina@example.com', code: delivered[0].code }).expect(401)
    await request(app).post('/api/chat/recovery/request').send({ email: 'amina@example.com' }).expect(202); recoveryRecords.at(-1).expiresAt = new Date(0)
    await request(app).post('/api/chat/recovery/verify').send({ email: 'amina@example.com', code: delivered.at(-1).code }).expect(401)
  })
  it('deterministically recovers the most recently active conversation for an email', async () => {
    const { app, delivered, conversationRecords } = setup(); await request(app).post('/api/chat/session').send({ name: 'Older', email: 'shared@example.com' }).expect(201); await request(app).post('/api/chat/session').send({ name: 'Latest', email: 'shared@example.com' }).expect(201)
    conversationRecords[0].lastMessageAt = new Date('2026-01-01'); conversationRecords[1].lastMessageAt = new Date('2026-01-02')
    await request(app).post('/api/chat/recovery/request').send({ email: 'shared@example.com' }).expect(202)
    const result = await request(app).post('/api/chat/recovery/verify').send({ email: 'shared@example.com', code: delivered[0].code }).expect(200)
    assert.equal(result.body.conversation.name, 'Latest')
  })
  it('frames authenticated visitor events as SSE data', async () => {
    const { app, chatService } = setup(); const created = await request(app).post('/api/chat/session').send({ name: 'Amina', email: 'amina@example.com' }).expect(201)
    const cookie = created.headers['set-cookie'][0].split(';')[0]; const server = app.listen(0)
    try {
      const body = await new Promise((resolve, reject) => {
        let received = ''; const streamRequest = http.get({ hostname: '127.0.0.1', port: server.address().port, path: '/api/chat/stream', headers: { Cookie: cookie } }, (response) => {
          assert.equal(response.statusCode, 200); assert.match(response.headers['content-type'], /text\/event-stream/)
          response.setEncoding('utf8'); response.on('data', (chunk) => { received += chunk; if (received.includes(': connected')) chatService.hub.publish(`conversation:${conversationId}`, { type: 'status', conversationId, status: 'closed' }); if (received.includes('data:')) { streamRequest.destroy(); resolve(received) } }); response.on('error', reject)
        }); streamRequest.on('error', (error) => { if (error.code !== 'ECONNRESET') reject(error) })
      })
      assert.match(body, /data: \{"type":"status","conversationId":"507f1f77bcf86cd799439011","status":"closed"\}\n\n/)
    } finally { await new Promise((resolve) => server.close(resolve)) }
  })
})
