import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requireAgentWorkspaceRole } from '../middleware/rbac'
import { autoLog } from '../middleware/logger'
import {
  listPublicAgents,
  searchPublicAgents,
  getAgent,
  createAgent,
  deleteAgent,
  updateAgentPrivacy,
  addAgentVersion,
} from '../services/agents'

import { uploadAgentfile } from '../services/gcs'
import { appendLog } from '../services/logs'

const router = Router()

router.get('/', async (_req, res) => {
  const agents = await listPublicAgents()
  res.json(agents)
})

router.get('/search', async (req, res) => {
  const { q = '', platform } = req.query as { q?: string; platform?: string }
  const agents = await searchPublicAgents(q, platform)
  res.json(agents)
})

router.get('/:id', async (req, res) => {
  const agent = await getAgent(req.params.id)
  if (!agent) {
    res.status(404).json({ message: 'Agent not found' })
    return
  }

  if (agent.privacy === 'private') {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }
  }

  res.json(agent)
})

router.post(
  '/',
  authMiddleware,
  async (req, res) => {
    const { name, platform, description, privacy, workspaceId } = req.body as {
      name: string
      platform: string
      description: string
      privacy: 'public' | 'private'
      workspaceId: string
    }

    if (!name || !workspaceId) {
      res.status(400).json({ message: 'name and workspaceId required' })
      return
    }

    const agent = await createAgent({
      name,
      platform: platform ?? '',
      description: description ?? '',
      privacy: privacy ?? 'private',
      workspaceId,
      ownerId: req.user!.uid,
    })

    const initialContent = `agent "${name}" {\n  version      = "0.0.1"\n  platform     = "${platform ?? ''}"\n  model        = "gpt-4o"\n  instructions = ""\n  tools        = []\n  skills       = []\n}\n`
    try {
      await uploadAgentfile(agent.id, '0.0.1', initialContent)
      await addAgentVersion(agent.id, '0.0.1', req.user!.email ?? req.user!.uid)
    } catch (storageErr) {
      await deleteAgent(agent.id)
      throw storageErr
    }

    await appendLog(agent.id, {
      user: req.user!.name ?? req.user!.email ?? req.user!.uid,
      userId: req.user!.uid,
      description: 'Agent created',
    })

    res.status(201).json(agent)
  },
)

router.delete(
  '/:id',
  authMiddleware,
  requireAgentWorkspaceRole('Admin'),
  async (req, res) => {
    await appendLog(req.params.id, {
      user: req.user!.name ?? req.user!.email ?? req.user!.uid,
      userId: req.user!.uid,
      description: 'Agent deleted',
    })
    await deleteAgent(req.params.id)
    res.status(204).send()
  },
)

router.patch(
  '/:id/privacy',
  authMiddleware,
  requireAgentWorkspaceRole('Editor'),
  async (req, res) => {
    const { privacy } = req.body as { privacy?: 'public' | 'private' }
    if (privacy !== 'public' && privacy !== 'private') {
      res.status(400).json({ message: 'privacy must be public or private' })
      return
    }
    await updateAgentPrivacy(req.params.id, privacy)
    const agent = await getAgent(req.params.id)
    res.json(agent)
  },
)

router.post(
  '/:id/publish',
  authMiddleware,
  requireAgentWorkspaceRole('Editor'),
  autoLog(() => 'Agent published'),
  async (req, res) => {
    const agent = await getAgent(req.params.id)
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' })
      return
    }
    await updateAgentPrivacy(req.params.id, 'public')
    res.json({ ...agent, privacy: 'public' })
  },
)

export default router
