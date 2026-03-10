import { getDb } from './firebase'
import type { HeartbeatEntry } from '../types'

const PERIOD_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

export function parsePeriod(period?: string): Date {
  const ms: number = (period ? PERIOD_MS[period] : undefined) ?? PERIOD_MS['1h']
  return new Date(Date.now() - ms)
}

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

export async function getBeats(agentId: string, since?: Date): Promise<HeartbeatEntry[]> {
  let query = getDb()
    .collection('heartbeats')
    .doc(agentId)
    .collection('beats')
    .orderBy('timestamp', 'desc')

  if (since) {
    query = query.where('timestamp', '>=', since.toISOString())
  }

  const snap = await query.limit(500).get()
  return snap.docs.map(d => d.data() as HeartbeatEntry)
}
