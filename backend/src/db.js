import { MongoClient } from 'mongodb'

export async function connectDatabase({ uri, databaseName }) {
  if (!uri) throw new Error('MONGODB_URI is required')
  if (!databaseName) throw new Error('MONGODB_DB_NAME is required')
  const client = new MongoClient(uri)
  await client.connect()
  const collection = client.db(databaseName).collection('consultations')
  await collection.createIndex({ createdAt: -1 }, { name: 'consultations_created_at' })
  return { repository: { async create(record) { const result = await collection.insertOne(record); return result.insertedId.toString() } }, close: () => client.close() }
}
