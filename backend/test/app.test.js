import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createConsultationService } from '../src/services/consultations.js'

const validPayload = { name: '  Amina   Kamau ', phone: '+254 700 000 000', email: ' AMINA@EXAMPLE.COM ', solution: 'Short-term loans', message: ' Working capital ', consent: true, website: '' }
function setup({ create = async () => 'opaque-id', rateLimitMax = 20 } = {}) {
  const records = []
  const repository = { create: async (record) => { records.push(record); return create(record) } }
  return { app: createApp({ service: createConsultationService(repository), rateLimitMax, rateLimitWindowMs: 60_000 }), records }
}

describe('consultation API', () => {
  it('reports health without database details', async () => { const response = await request(setup().app).get('/api/health').expect(200); assert.deepEqual(response.body, { status: 'ok' }) })
  it('allows the configured CORS origin and safely rejects another origin', async () => {
    const { app: baseApp } = setup()
    const service = createConsultationService({ create: async () => 'id' })
    const app = createApp({ service, corsOrigin: 'https://www.avlcapital.example' })
    const allowed = await request(app).get('/api/health').set('Origin', 'https://www.avlcapital.example').expect(200)
    assert.equal(allowed.headers['access-control-allow-origin'], 'https://www.avlcapital.example')
    const denied = await request(app).get('/api/health').set('Origin', 'https://attacker.example').expect(403)
    assert.deepEqual(denied.body, { error: 'origin_forbidden', message: 'This origin is not allowed.' })
    await request(baseApp).get('/api/health').expect(200)
  })
  it('normalizes and persists one valid enquiry', async () => {
    const { app, records } = setup(); const response = await request(app).post('/api/consultations').send(validPayload).expect(201)
    assert.equal(response.body.id, 'opaque-id'); assert.equal(response.body.status, 'received'); assert.equal(records.length, 1)
    assert.equal(records[0].name, 'Amina Kamau'); assert.equal(records[0].email, 'amina@example.com'); assert.ok(records[0].consentedAt instanceof Date)
    assert.deepEqual(Object.keys(records[0]).sort(), ['consentedAt', 'createdAt', 'email', 'message', 'name', 'phone', 'solution'])
  })
  it('rejects malformed, unknown, and missing data without storing', async () => {
    const { app, records } = setup(); const response = await request(app).post('/api/consultations').send({ ...validPayload, email: 'bad', solution: 'Mortgage', consent: false }).expect(400)
    assert.equal(response.body.error, 'validation_error'); assert.deepEqual(Object.keys(response.body.fields).sort(), ['consent', 'email', 'solution']); assert.equal(records.length, 0)
  })
  it('rejects oversized fields without storing', async () => {
    const { app, records } = setup(); const response = await request(app).post('/api/consultations').send({ ...validPayload, name: 'x'.repeat(101), message: 'x'.repeat(2001) }).expect(400)
    assert.deepEqual(Object.keys(response.body.fields).sort(), ['message', 'name']); assert.equal(records.length, 0)
  })
  it('accepts honeypot submissions without storing or revealing the rule', async () => {
    const { app, records } = setup(); const response = await request(app).post('/api/consultations').send({ ...validPayload, website: 'bot.example' }).expect(201)
    assert.equal(response.body.status, 'received'); assert.equal(records.length, 0); assert.doesNotMatch(JSON.stringify(response.body), /bot|honeypot|filter/i)
  })
  it('rate limits excess requests with a generic response', async () => {
    const { app } = setup({ rateLimitMax: 1 }); await request(app).post('/api/consultations').send(validPayload).expect(201)
    const response = await request(app).post('/api/consultations').send(validPayload).expect(429); assert.equal(response.body.error, 'rate_limited')
  })
  it('rejects malformed JSON safely', async () => {
    const response = await request(setup().app).post('/api/consultations').set('Content-Type', 'application/json').send('{').expect(400)
    assert.deepEqual(response.body, { error: 'invalid_json', message: 'The request body must contain valid JSON.' })
  })
  it('returns a generic response when persistence fails', async () => {
    const { app } = setup({ create: async () => { throw new Error('secret database failure') } }); const response = await request(app).post('/api/consultations').send(validPayload).expect(500)
    assert.equal(response.body.error, 'server_error'); assert.doesNotMatch(JSON.stringify(response.body), /secret|stack|database/i)
  })
})
