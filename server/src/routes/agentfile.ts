import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requireAgentWorkspaceRole } from '../middleware/rbac'
import { autoLog } from '../middleware/logger'
import { getAgent, updateAgentVersion, updateAgentPlatform, updateAgentName, addAgentVersion, listAgentVersions } from '../services/agents'
import { uploadFile, downloadFile } from '../services/gcs'

const router = Router({ mergeParams: true })

function getPath(agentId: string, version: string): string {
  return `agents/${agentId}/Agentfile.${version}`
}

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
    const path = getPath(agent.id, agent.currentVersion)
    const content = await downloadFile(path)
    res.json({ content })
  } catch {
    res.status(404).json({ message: 'Agentfile not found in storage' })
  }
})

router.put(
  '/',
  authMiddleware,
  requireAgentWorkspaceRole('Editor'),
  autoLog((req) => {
    const body = req.body as { comment?: string }
    return body.comment ? `Agentfile pushed: ${body.comment}` : 'Agentfile pushed'
  }),
  async (req, res) => {
    const { content, comment: _comment } = req.body as { content?: string; comment?: string }
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

    const path = getPath(agent.id, version)
    await uploadFile(path, content)
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
    const path = getPath(id, version)
    const content = await downloadFile(path)
    res.json({ content })
  } catch {
    res.status(404).json({ message: `Version ${version} not found` })
  }
})

export default router
