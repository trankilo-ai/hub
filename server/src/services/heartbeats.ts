import { getDb } from './firebase'
import type { HeartbeatEntry } from '../types'

export async function recordBeat(
  agentId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await getDb()
    .collection('heartbeats')
    .doc(agentId)
    .collection('beats')
    .add({ timestamp: new Date().toISOString(), metadata })
}

export async function getBeats(agentId: string): Promise<HeartbeatEntry[]> {
  const snap = await getDb()
    .collection('heartbeats')
    .doc(agentId)
    .collection('beats')
    .orderBy('timestamp', 'desc')
    .limit(500)
    .get()
  return snap.docs.map(d => d.data() as HeartbeatEntry)
}
