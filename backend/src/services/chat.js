import { createHash, randomBytes, randomInt } from 'node:crypto'
import { hashSecret, verifySecret } from './auth.js'

const digest = (token) => createHash('sha256').update(token).digest('hex')

export function createChatHub() {
  const listeners = new Map()
  return {
    publish(channel, event) { for (const listener of listeners.get(channel) || []) listener(event) },
    subscribe(channel, listener) { const group = listeners.get(channel) || new Set(); group.add(listener); listeners.set(channel, group); return () => { group.delete(listener); if (!group.size) listeners.delete(channel) } },
    close() { listeners.clear() },
  }
}

export function createChatService({ conversations, messages, recoveryCodes, mailer, hub = createChatHub(), now = () => new Date(), recoveryMinutes = 10, recoveryMaxAttempts = 5, logger = console }) {
  if (!conversations || !messages) throw new TypeError('Chat repositories are required')
  const emit = (conversationId, event) => { hub.publish(`conversation:${conversationId}`, event); hub.publish('admins', event) }
  return {
    hub,
    async start(profile) {
      const token = randomBytes(32).toString('base64url')
      const timestamp = now()
      const id = await conversations.create({ ...profile, visitorTokenHash: digest(token), status: 'open', createdAt: timestamp, updatedAt: timestamp, lastMessageAt: timestamp })
      emit(id, { type: 'conversation', conversationId: id })
      return { token, conversation: await conversations.findById(id) }
    },
    async restore(token) { return token ? conversations.findByVisitorHash(digest(token)) : null },
    async requestRecovery(email) {
      if (!recoveryCodes || !mailer) return
      const conversation = await conversations.findLatestByEmail(email)
      if (!conversation) return
      const code = String(randomInt(100000, 1000000)); const timestamp = now()
      await recoveryCodes.invalidateForEmail(email)
      const result = await recoveryCodes.create({ email, conversationId: conversation._id.toString(), codeHash: await hashSecret(code), attempts: 0, createdAt: timestamp, expiresAt: new Date(timestamp.getTime() + recoveryMinutes * 60_000), usedAt: null })
      try { await mailer.sendChatRecovery({ to: email, code, expiresMinutes: recoveryMinutes }) } catch (error) { await recoveryCodes.invalidate(result.insertedId).catch((cleanupError) => logger.error('Failed to invalidate undelivered chat recovery', cleanupError)); logger.error('Failed to deliver chat recovery email', error) }
    },
    async verifyRecovery(email, code) {
      if (!recoveryCodes) return null
      const timestamp = now(); const record = await recoveryCodes.findActive(email, timestamp, recoveryMaxAttempts)
      if (!record || !await verifySecret(code, record.codeHash)) { if (record) await recoveryCodes.failAttempt(record._id, recoveryMaxAttempts); return null }
      const claimed = await recoveryCodes.consume(record._id, timestamp, recoveryMaxAttempts)
      if (claimed?.modifiedCount !== 1) return null
      await recoveryCodes.invalidateForEmail(email)
      const conversation = await conversations.findById(record.conversationId)
      if (!conversation || conversation.email !== email) return null
      const token = randomBytes(32).toString('base64url')
      const rotated = await conversations.rotateVisitorToken(record.conversationId, conversation.visitorTokenHash, digest(token), timestamp)
      return rotated ? { token, conversation: rotated } : null
    },
    async visitorMessages(token, after) { const conversation = await this.restore(token); if (!conversation) return null; return { conversation, messages: await messages.list(conversation._id.toString(), after) } },
    async sendVisitor(token, body) {
      const conversation = await this.restore(token)
      if (!conversation) return { error: 'not_found' }
      if (conversation.status !== 'open') return { error: 'closed' }
      const timestamp = now(); const conversationId = conversation._id.toString()
      const id = await messages.create({ conversationId, senderType: 'visitor', body, createdAt: timestamp })
      await conversations.touch(conversationId, timestamp)
      const message = await messages.findById(id); emit(conversationId, { type: 'message', conversationId, message })
      return { message }
    },
    async list(query) { const [items, total] = await Promise.all([conversations.list(query), conversations.count(query)]); return { items, total, page: query.page, pageSize: query.pageSize, pages: Math.ceil(total / query.pageSize) } },
    async detail(id) { const conversation = await conversations.findById(id); if (!conversation) return null; return { conversation, messages: await messages.list(id) } },
    async sendAdmin(id, body, adminId) {
      const conversation = await conversations.findById(id); if (!conversation) return null
      if (conversation.status !== 'open') return { error: 'closed' }
      const timestamp = now(); const messageId = await messages.create({ conversationId: id, senderType: 'admin', senderAdminId: adminId, body, createdAt: timestamp })
      await conversations.touch(id, timestamp); const message = await messages.findById(messageId); emit(id, { type: 'message', conversationId: id, message }); return { message }
    },
    async setStatus(id, status) { const conversation = await conversations.setStatus(id, status, now()); if (conversation) emit(id, { type: 'status', conversationId: id, status }); return conversation },
  }
}
