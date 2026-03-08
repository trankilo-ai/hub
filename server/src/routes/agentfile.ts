import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requireAgentWorkspaceRole } from '../middleware/rbac'
import { autoLog } from '../middleware/logger'
import { getAgent, updateAgentVersion, updateAgentPlatform, updateAgentName, addAgentVersion, listAgentVersions } from '../services/agents'
import { uploadAgentfile, downloadAgentfile } from '../services/gcs'

const router = Router({ mergeParams: true })

function parseVersion(hcl: string): string | null {
  const match = hcl.match(/version\s*=\s*"([^"]+)"/)
  return match ? match[1] : null
}

function parsePlatform(hcl: string): string {
  const match = hcl.match(/platform\s*=\s*"([^"]*)"/)
  return match ? match[1] : ''
}

function parseName(hcl: string): string | null {
  const match = hcl.match(/agent\s+"([^"]+)"/)
  return match ? match[1] : null
}

router.get('/', authMiddleware, async (req, res) => {
  const agent = await getAgent(req.params.id)
  if (!agent) {
    res.status(404).json({ message: 'Agent not found' })
    return
  }

  try {
    const content = await downloadAgentfile(agent.id, agent.currentVersion)
    res.json({ content })
  } catch {
    res.status(404).json({ message: 'Agentfile not found in storage' })
  }
})

router.put(
  '/',
  authMiddleware,
  requireAgentWorkspaceRole('Editor'),
  autoLog(() => 'Agentfile pushed'),
  async (req, res) => {
    const { content } = req.body as { content?: string }
    if (!content) {
      res.status(400).json({ message: 'content required' })
      return
    }

    const version = parseVersion(content)
    if (!version) {
      res.status(400).json({ message: 'Agentfile must contain a version field' })
      return
    }

    const agent = await getAgent(req.params.id)
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' })
      return
    }

    const platform = parsePlatform(content)
    const name = parseName(content)

    await uploadAgentfile(agent.id, version, content)
    await addAgentVersion(agent.id, version, req.user!.email ?? req.user!.uid)
    await updateAgentVersion(agent.id, version)
    await updateAgentPlatform(agent.id, platform)
    if (name) await updateAgentName(agent.id, name)

    res.json({ version })
  },
)

router.get('/versions', authMiddleware, async (req, res) => {
  const versions = await listAgentVersions(req.params.id)
  res.json(versions)
})

router.get('/versions/:version', authMiddleware, async (req, res) => {
  const { id, version } = req.params
  try {
    const content = await downloadAgentfile(id, version)
    res.json({ content })
  } catch {
    res.status(404).json({ message: `Version ${version} not found` })
  }
})

export default router
