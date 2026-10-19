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
  await Promise.all([
    consultations.createIndex({ createdAt: -1 }, { name: 'consultations_created_at' }),
    partnerEnquiries.createIndex({ createdAt: -1 }, { name: 'partner_enquiries_created_at' }),
    admins.createIndex({ email: 1 }, { unique: true, name: 'admins_email' }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'sessions_expiry' }),
    resets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'resets_expiry' }),
  ])
  return {
    consultationRepository: {
      async create(record) { const result = await consultations.insertOne({ ...record, readAt: null }); return result.insertedId.toString() },
      async list({ page, pageSize }) { return consultations.find({}).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray() },
      count: () => consultations.countDocuments(),
      findById: (id) => ObjectId.isValid(id) ? consultations.findOne({ _id: new ObjectId(id) }) : null,
      setRead: (id, read, now) => ObjectId.isValid(id) ? consultations.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { readAt: read ? now : null } }, { returnDocument: 'after' }) : null,
    },
    partnerRepository: {
      async create(record) { const result = await partnerEnquiries.insertOne({ ...record, readAt: null }); return result.insertedId.toString() },
      async list({ page, pageSize }) { return partnerEnquiries.find({}).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray() },
      count: () => partnerEnquiries.countDocuments(),
      findById: (id) => ObjectId.isValid(id) ? partnerEnquiries.findOne({ _id: new ObjectId(id) }) : null,
      setRead: (id, read, now) => ObjectId.isValid(id) ? partnerEnquiries.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { readAt: read ? now : null } }, { returnDocument: 'after' }) : null,
    },
    adminRepository: {
      count: () => admins.countDocuments(),
      findByEmail: (email) => admins.findOne({ email }),
      findById: (id) => admins.findOne({ _id: id }),
      async create(record) { const result = await admins.insertOne(record); return result.insertedId.toString() },
      updatePassword: (id, passwordHash, sessionVersion) => admins.updateOne({ _id: id }, { $set: { passwordHash, sessionVersion, updatedAt: new Date() } }),
    },
    sessionRepository: { create: (record) => sessions.insertOne(record), find: (tokenHash) => sessions.findOne({ tokenHash }), delete: (tokenHash) => sessions.deleteOne({ tokenHash }), deleteForAdmin: (adminId) => sessions.deleteMany({ adminId }) },
    resetRepository: { create: (record) => resets.insertOne(record), findActive: (email, now) => resets.findOne({ email, expiresAt: { $gt: now }, usedAt: null }, { sort: { createdAt: -1 } }), markUsed: (id, now) => resets.updateOne({ _id: id, usedAt: null }, { $set: { usedAt: now } }), invalidate: (id) => resets.deleteOne({ _id: id }) },
    close: () => client.close(),
  }
}
