import { Router } from 'express'
import { apiKeyAuthMiddleware } from '../middleware/apiKeyAuth'
import { downloadFile, uploadFile } from '../services/gcs'
import { createAgent, getAgent, updateAgent } from '../DAL/agentDAL'
import { Agentfile } from '../types/agentfile'
import { isValidVersion, bumpVersion, isLower } from '../utils/versionHandler'

const DEFAULT_VERSION = '0.0.1'
const router = Router()

router.get('/', apiKeyAuthMiddleware, async (req, res, next) => {
  try {
    const id = req.query.id
    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ message: 'id query parameter is required' })
    }

    const agent = await getAgent(id)
    console.log('get agent:', agent);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' })
    }

    const content = await downloadFile(Agentfile.getPath(id, 'Agentfile'))
    const agentfile = Agentfile.parse(content)
    if (!agentfile) {
      return res.status(500).json({ message: 'Stored Agentfile YAML is invalid' })
    }

    res.json({
      id,
      ...agentfile,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/', apiKeyAuthMiddleware, async (req, res, next) => {
  try {
    const { content } = req.body as { content?: string }
    if (!content) {
      res.status(400).json({ message: 'content required' })
      return
    }

    const agentfile = Agentfile.parse(content)
    if (!agentfile) {
      res.status(400).json({ message: 'Invalid Agentfile YAML content' })
      return
    }

    const agentId = await createAgent(DEFAULT_VERSION)
    await uploadFile(Agentfile.getPath(agentId, 'Agentfile'), content)
    await uploadFile(Agentfile.getPath(agentId, `Agentfile_${DEFAULT_VERSION}`), content)
    res.status(201).json({ id: agentId })
  } catch (error) {
    next(error)
  }
})

router.put('/:id', apiKeyAuthMiddleware, async (req, res, next) => {
  try {
    const { content, version } = req.body as { content?: string; version?: string }
    if (!content) {
      res.status(400).json({ message: 'content required' })
      return
    }

    const agent = await getAgent(req.params.id)
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' })
      return
    }

    const agentfile = Agentfile.parse(content)
    if (!agentfile) {
      res.status(400).json({ message: 'Invalid Agentfile YAML content' })
      return
    }

    if (version) {
      if (!isValidVersion(version)) {
        res.status(400).json({ message: 'version must be a valid semantic version' })
        return
      }
      if (isLower(version, agent.currentVersion)) {
        res.status(400).json({ message: `version ${version} is behind current version ${agent.currentVersion}` })
        return
      }
    }

    const baseVersion = version ?? agent.currentVersion
    const targetVersion = bumpVersion(baseVersion)

    agentfile.version = targetVersion
    const updatedContent = Agentfile.stringify(agentfile)

    await uploadFile(Agentfile.getPath(req.params.id, 'Agentfile'), updatedContent)
    await uploadFile(Agentfile.getPath(req.params.id, `Agentfile_${targetVersion}`), updatedContent)
    await updateAgent(req.params.id, targetVersion)
    res.json({ id: req.params.id, version: targetVersion })
  } catch (error) {
    next(error)
  }
})

export default router

