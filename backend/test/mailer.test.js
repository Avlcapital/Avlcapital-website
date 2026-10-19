import assert from 'node:assert/strict'
import { it } from 'node:test'
import { createMailer } from '../src/services/mailer.js'

it('maps SMTP configuration and password-reset email payload', async () => {
  let transportOptions
  let mail
  const mailer = createMailer({ host: 'smtp.example.com', port: 465, secure: true, user: 'smtp-user', password: 'smtp-password', from: 'AVL <admin@example.com>' }, (options) => {
    transportOptions = options
    return { sendMail: async (payload) => { mail = payload } }
  })
  await mailer.sendPasswordReset({ to: 'owner@example.com', code: '123456', expiresMinutes: 10 })
  assert.deepEqual(transportOptions, { host: 'smtp.example.com', port: 465, secure: true, auth: { user: 'smtp-user', pass: 'smtp-password' } })
  assert.equal(mail.from, 'AVL <admin@example.com>')
  assert.equal(mail.to, 'owner@example.com')
  assert.match(mail.subject, /password reset/i)
  assert.match(mail.text, /123456/)
  assert.match(mail.text, /10 minutes/)
  await mailer.sendChatRecovery({ to: 'client@example.com', code: '654321', expiresMinutes: 8 })
  assert.equal(mail.to, 'client@example.com')
  assert.match(mail.subject, /conversation/i)
  assert.match(mail.text, /654321/)
  assert.match(mail.text, /8 minutes/)
})
