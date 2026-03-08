import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from './firebase'
import type { Agent, AgentVersion } from '../types'

const COLLECTION = 'agents'

export async function listWorkspaceAgents(workspaceId: string): Promise<Agent[]> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where('workspaceId', '==', workspaceId)
    .orderBy('updatedAt', 'desc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Agent))
}

export async function listPublicAgents(): Promise<Agent[]> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where('privacy', '==', 'public')
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Agent))
}

export async function searchPublicAgents(q: string, platform?: string): Promise<Agent[]> {
  let ref = getDb()
    .collection(COLLECTION)
    .where('privacy', '==', 'public') as FirebaseFirestore.Query

  if (platform) ref = ref.where('platform', '==', platform)

  const snap = await ref.orderBy('updatedAt', 'desc').limit(50).get()
  const lower = q.toLowerCase()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Agent))
    .filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower),
    )
}

export async function getAgent(id: string): Promise<Agent | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as Agent
}

export async function createAgent(
  data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion'>,
): Promise<Agent> {
  const now = FieldValue.serverTimestamp()
  const ref = await getDb()
    .collection(COLLECTION)
    .add({ ...data, currentVersion: '0.0.1', createdAt: now, updatedAt: now })
  const doc = await ref.get()
  return { id: doc.id, ...doc.data() } as Agent
}

export async function updateAgentVersion(id: string, version: string): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({ currentVersion: version, updatedAt: FieldValue.serverTimestamp() })
}

export async function updateAgentPlatform(id: string, platform: string): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({ platform, updatedAt: FieldValue.serverTimestamp() })
}

export async function updateAgentName(id: string, name: string): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({ name, updatedAt: FieldValue.serverTimestamp() })
}

export async function updateAgentPrivacy(
  id: string,
  privacy: 'public' | 'private',
): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({ privacy, updatedAt: FieldValue.serverTimestamp() })
}

export async function deleteAgent(id: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(id).delete()
}

export async function addAgentVersion(
  agentId: string,
  version: string,
  savedBy: string,
): Promise<AgentVersion> {
  const now = FieldValue.serverTimestamp()
  const ref = await getDb()
    .collection(COLLECTION)
    .doc(agentId)
    .collection('versions')
    .add({ version, savedAt: now, savedBy })
  const doc = await ref.get()
  return { id: doc.id, ...doc.data() } as AgentVersion
}

export async function listAgentVersions(agentId: string): Promise<AgentVersion[]> {
  const snap = await getDb()
    .collection(COLLECTION)
    .doc(agentId)
    .collection('versions')
    .orderBy('savedAt', 'desc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AgentVersion))
}
