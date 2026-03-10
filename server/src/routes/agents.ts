import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requireAgentWorkspaceRole } from '../middleware/rbac'
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

function parseHclField(hcl: string, field: string): string | null {
  const match = hcl.match(new RegExp(`^\\s*${field}\\s*=\\s*"([^"]*)"`, 'm'))
  return match ? match[1] : null
}

router.get('/', async (_req, res) => {
  const agents = await listPublicAgents()
  res.json(agents)
})

router.get('/search', async (req, res) => {
  const { q = '', platform } = req.query as { q?: string; platform?: string }
  const agents = await searchPublicAgents(q, platform)
  res.json(agents)
})

router.get('/:id', authMiddleware, async (req, res) => {
  const agent = await getAgent(req.params.id)
  if (!agent) {
    res.status(404).json({ message: 'Agent not found' })
    return
  }
  res.json(agent)
})

router.post(
  '/',
  authMiddleware,
  async (req, res) => {
    const { name, platform, workspaceId, content } = req.body as {
      name: string
      platform?: string
      workspaceId: string
      content?: string
    }

    if (!name || !workspaceId) {
      res.status(400).json({ message: 'name and workspaceId required' })
      return
    }

    const resolvedPlatform = platform ?? (content ? (parseHclField(content, 'platform') ?? '') : '')
    const initialVersion = content ? (parseHclField(content, 'version') ?? '0.0.1') : '0.0.1'

    const agent = await createAgent({
      name,
      platform: resolvedPlatform,
      description: '',
      privacy: 'private',
      workspaceId,
      ownerId: req.user!.uid,
    })

    const agentfileContent = content ?? `agent "${name}" {\n  version      = "${initialVersion}"\n  platform     = "${resolvedPlatform}"\n  model        = "gpt-4o"\n  instructions = ""\n}\n`

    try {
      await uploadAgentfile(agent.id, initialVersion, agentfileContent)
      await addAgentVersion(agent.id, initialVersion, req.user!.email ?? req.user!.uid)
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
    await appendLog(req.params.id, {
      user: req.user!.name ?? req.user!.email ?? req.user!.uid,
      userId: req.user!.uid,
      description: privacy === 'public' ? 'Agent made public' : 'Agent made private',
    })
    const agent = await getAgent(req.params.id)
    res.json(agent)
  },
)

export default router
