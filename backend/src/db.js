import { ObjectId, MongoClient } from 'mongodb'

export async function connectDatabase({ uri, databaseName }) {
  if (!uri) throw new Error('MONGODB_URI is required')
  if (!databaseName) throw new Error('MONGODB_DB_NAME is required')
  const client = new MongoClient(uri)
  await client.connect()
  const database = client.db(databaseName)
  const consultations = database.collection('consultations')
  const partnerEnquiries = database.collection('partnerEnquiries')
  const admins = database.collection('admins')
  const sessions = database.collection('adminSessions')
  const resets = database.collection('passwordResets')
  const chatConversations = database.collection('chatConversations')
  const chatMessages = database.collection('chatMessages')
  const chatRecoveryCodes = database.collection('chatRecoveryCodes')
  await Promise.all([
    consultations.createIndex({ createdAt: -1 }, { name: 'consultations_created_at' }),
    consultations.createIndex({ readAt: 1, createdAt: -1 }, { name: 'consultations_read_created' }),
    partnerEnquiries.createIndex({ createdAt: -1 }, { name: 'partner_enquiries_created_at' }),
    partnerEnquiries.createIndex({ readAt: 1, createdAt: -1 }, { name: 'partner_read_created' }),
    admins.createIndex({ email: 1 }, { unique: true, name: 'admins_email' }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'sessions_expiry' }),
    resets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'resets_expiry' }),
    chatConversations.createIndex({ visitorTokenHash: 1 }, { unique: true, name: 'chat_visitor_token' }),
    chatConversations.createIndex({ lastMessageAt: -1 }, { name: 'chat_last_message' }),
    chatConversations.createIndex({ status: 1, lastMessageAt: -1 }, { name: 'chat_status_last_message' }),
    chatConversations.createIndex({ email: 1, lastMessageAt: -1, createdAt: -1 }, { name: 'chat_email_latest' }),
    chatMessages.createIndex({ conversationId: 1, createdAt: 1, _id: 1 }, { name: 'chat_messages_order' }),
    chatRecoveryCodes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'chat_recovery_expiry' }),
    chatRecoveryCodes.createIndex({ email: 1, createdAt: -1 }, { name: 'chat_recovery_email' }),
  ])
  return {
    consultationRepository: {
      async create(record) { const result = await consultations.insertOne({ ...record, readAt: null }); return result.insertedId.toString() },
      async list({ page, pageSize, q, read }) { const filter = enquiryFilter(q, read, ['name', 'email', 'phone', 'solution', 'message']); return consultations.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray() },
      count: (query = {}) => consultations.countDocuments(enquiryFilter(query.q, query.read, ['name', 'email', 'phone', 'solution', 'message'])),
      recent: (limit = 5) => consultations.find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
      findById: (id) => ObjectId.isValid(id) ? consultations.findOne({ _id: new ObjectId(id) }) : null,
      setRead: (id, read, now) => ObjectId.isValid(id) ? consultations.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { readAt: read ? now : null } }, { returnDocument: 'after' }) : null,
    },
    partnerRepository: {
      async create(record) { const result = await partnerEnquiries.insertOne({ ...record, readAt: null }); return result.insertedId.toString() },
      async list({ page, pageSize, q, read }) { const filter = enquiryFilter(q, read, ['organization', 'contactName', 'email', 'phone', 'partnerType', 'location', 'interest']); return partnerEnquiries.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray() },
      count: (query = {}) => partnerEnquiries.countDocuments(enquiryFilter(query.q, query.read, ['organization', 'contactName', 'email', 'phone', 'partnerType', 'location', 'interest'])),
      recent: (limit = 5) => partnerEnquiries.find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
      findById: (id) => ObjectId.isValid(id) ? partnerEnquiries.findOne({ _id: new ObjectId(id) }) : null,
      setRead: (id, read, now) => ObjectId.isValid(id) ? partnerEnquiries.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { readAt: read ? now : null } }, { returnDocument: 'after' }) : null,
    },
    adminRepository: {
      count: () => admins.countDocuments(),
      findByEmail: (email) => admins.findOne({ email }),
      findById: (id) => admins.findOne({ _id: id }),
      async create(record) { const result = await admins.insertOne(record); return result.insertedId.toString() },
      list: ({ page, pageSize }) => admins.find({}, { projection: { email: 1, createdAt: 1 } }).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
      updatePassword: (id, passwordHash, sessionVersion) => admins.updateOne({ _id: id }, { $set: { passwordHash, sessionVersion, updatedAt: new Date() } }),
    },
    sessionRepository: { create: (record) => sessions.insertOne(record), find: (tokenHash) => sessions.findOne({ tokenHash }), delete: (tokenHash) => sessions.deleteOne({ tokenHash }), deleteForAdmin: (adminId) => sessions.deleteMany({ adminId }) },
    resetRepository: { create: (record) => resets.insertOne(record), findActive: (email, now) => resets.findOne({ email, expiresAt: { $gt: now }, usedAt: null }, { sort: { createdAt: -1 } }), markUsed: (id, now) => resets.updateOne({ _id: id, usedAt: null }, { $set: { usedAt: now } }), invalidate: (id) => resets.deleteOne({ _id: id }) },
    chatConversationRepository: {
      async create(record) { const result = await chatConversations.insertOne(record); return result.insertedId.toString() },
      findByVisitorHash: (visitorTokenHash) => chatConversations.findOne({ visitorTokenHash }),
      findLatestByEmail: (email) => chatConversations.findOne({ email }, { sort: { lastMessageAt: -1, createdAt: -1, _id: -1 } }),
      findById: (id) => ObjectId.isValid(id) ? chatConversations.findOne({ _id: new ObjectId(id) }) : null,
      list: ({ page, pageSize, q, status }) => { const filter = chatFilter(q, status); return chatConversations.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray() },
      count: (query = {}) => chatConversations.countDocuments(chatFilter(query.q, query.status)),
      recent: (limit = 5) => chatConversations.find({}).sort({ lastMessageAt: -1 }).limit(limit).toArray(),
      touch: (id, timestamp) => ObjectId.isValid(id) ? chatConversations.updateOne({ _id: new ObjectId(id) }, { $set: { lastMessageAt: timestamp, updatedAt: timestamp } }) : null,
      setStatus: (id, status, timestamp) => ObjectId.isValid(id) ? chatConversations.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { status, updatedAt: timestamp } }, { returnDocument: 'after' }) : null,
      rotateVisitorToken: (id, currentHash, nextHash, timestamp) => ObjectId.isValid(id) ? chatConversations.findOneAndUpdate({ _id: new ObjectId(id), visitorTokenHash: currentHash }, { $set: { visitorTokenHash: nextHash, updatedAt: timestamp } }, { returnDocument: 'after' }) : null,
    },
    chatMessageRepository: {
      async create(record) { const result = await chatMessages.insertOne(record); return result.insertedId.toString() },
      findById: (id) => ObjectId.isValid(id) ? chatMessages.findOne({ _id: new ObjectId(id) }) : null,
      list: (conversationId, after) => chatMessages.find({ conversationId, ...(after && ObjectId.isValid(after) ? { _id: { $gt: new ObjectId(after) } } : {}) }).sort({ createdAt: 1, _id: 1 }).limit(500).toArray(),
    },
    chatRecoveryRepository: {
      create: (record) => chatRecoveryCodes.insertOne(record),
      findActive: (email, timestamp, maxAttempts) => chatRecoveryCodes.findOne({ email, expiresAt: { $gt: timestamp }, usedAt: null, attempts: { $lt: maxAttempts } }, { sort: { createdAt: -1 } }),
      consume: (id, timestamp, maxAttempts) => chatRecoveryCodes.updateOne({ _id: id, expiresAt: { $gt: timestamp }, usedAt: null, attempts: { $lt: maxAttempts } }, { $set: { usedAt: timestamp } }),
      failAttempt: (id, maxAttempts) => chatRecoveryCodes.updateOne({ _id: id, usedAt: null, attempts: { $lt: maxAttempts } }, { $inc: { attempts: 1 } }),
      invalidate: (id) => chatRecoveryCodes.deleteOne({ _id: id }),
      invalidateForEmail: (email) => chatRecoveryCodes.deleteMany({ email, usedAt: null }),
    },
    close: () => client.close(),
  }
}

function safePattern(value) { return String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100) }
function enquiryFilter(q, read, fields) { const filter = {}; if (read === 'unread') filter.readAt = null; if (read === 'read') filter.readAt = { $ne: null }; const pattern = safePattern(q); if (pattern) filter.$or = fields.map((field) => ({ [field]: { $regex: pattern, $options: 'i' } })); return filter }
function chatFilter(q, status) { const filter = {}; if (status) filter.status = status; const pattern = safePattern(q); if (pattern) filter.$or = ['name', 'email', 'phone'].map((field) => ({ [field]: { $regex: pattern, $options: 'i' } })); return filter }
