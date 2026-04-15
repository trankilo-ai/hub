import { generateId, getDb, isValidId, toObjectId } from '@services/mongodb'

type AgentDoc = {
  id: string
  createdAt: Date
  currentVersion: string
}

const COLLECTION = 'agents'

export async function getAgent(id: string): Promise<AgentDoc | null> {
  if (!isValidId(id)) return null
  const db = await getDb()
  const doc = await db.collection<AgentDoc>(COLLECTION).findOne({ _id: toObjectId(id) })
  return doc;
}

export async function createAgent(version: string): Promise<string> {
  const db = await getDb()
  const id = generateId()
  const doc = {
    _id: toObjectId(id),
    createdAt: new Date(),
    currentVersion: version,
  }
  await db.collection(COLLECTION).insertOne(doc)
  return id
}

export async function updateAgent(id: string, version: string): Promise<void> {
  if (!isValidId(id)) return
  const db = await getDb()
  await db.collection<AgentDoc>(COLLECTION).updateOne(
    { _id: toObjectId(id) },
    { $set: { currentVersion: version } },
  )
}
