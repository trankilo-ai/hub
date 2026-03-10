import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'

const router = Router()

const AGENTFILE_SCHEMA = {
  fields: [
    { name: 'id', type: 'string', required: false, description: 'Unique agent identifier assigned by the Hub on init' },
    { name: 'name', type: 'string', required: true, description: 'Agent name, must match the block label' },
    { name: 'version', type: 'string', required: true, description: 'Semantic version (e.g. 0.0.1)' },
    { name: 'platform', type: 'string', required: false, description: 'Agent SDK or platform (e.g. langchain-ts, google-adk)' },
    { name: 'model', type: 'string', required: false, description: 'LLM model identifier (e.g. gpt-4o)' },
    { name: 'instructions', type: 'string', required: false, description: 'System prompt or instructions for the agent' },
  ],
  example: `agent "my-agent" {\n  id           = "abc123"\n  name         = "my-agent"\n  version      = "0.0.1"\n  platform     = "langchain-ts"\n  model        = "gpt-4o"\n  instructions = "You are a helpful assistant."\n}`,
}

router.get('/agentfile', authMiddleware, (_req, res) => {
  res.json(AGENTFILE_SCHEMA)
})

export default router
