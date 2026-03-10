import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requireAgentRole } from '../middleware/auth'
import { recordBeat, getBeats, parsePeriod } from '../services/heartbeats'

const router = Router({ mergeParams: true })

router.post('/', authMiddleware, requireAgentRole, async (req, res) => {
  const { metadata = {} } = req.body as { metadata?: Record<string, unknown> }
  await recordBeat(req.params.id, metadata)
  res.json({ message: '🦥 heartbeat recorded' })
})

router.get('/', authMiddleware, async (req, res) => {
  const { period } = req.query as { period?: string }
  const since = parsePeriod(period)
  const beats = await getBeats(req.params.id, since)
  res.json(beats)
})

export default router
