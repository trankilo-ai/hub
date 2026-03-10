import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initFirebase } from './services/firebase'

import authRouter from './routes/auth'
import agentsRouter from './routes/agents'
import agentfileRouter from './routes/agentfile'
import workspacesRouter from './routes/workspaces'
import heartbeatRouter from './routes/heartbeat'
import logsRouter from './routes/logs'
import playgroundRouter from './routes/playground'
import schemaRouter from './routes/schema'

initFirebase()

const app = express()

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : /^http:\/\/localhost:\d+$/

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sloth: '🦥', ts: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/agent', agentsRouter)
app.use('/api/agent/:id/agentfile', agentfileRouter)
app.use('/api/agent/:id/heartbeat', heartbeatRouter)
app.use('/api/agent/:id/logs', logsRouter)
app.use('/api/workspace', workspacesRouter)
app.use('/api/playground', playgroundRouter)
app.use('/api/schema', schemaRouter)

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  },
)

export default app

if (require.main === module) {
  const PORT = Number(process.env.PORT ?? 3001)
  app.listen(PORT, () => {
    console.log(`🦥 trankilo-ai hub server running on :${PORT}`)
  })
}
