import './__mocks__/services'
import request from 'supertest'
import app from '../src/index'
import { authHeader, HUMAN_TOKEN } from './helpers'
import { uploadAgentfile, downloadAgentfile } from '../src/services/gcs'
import { addAgentVersion, updateAgentVersion } from '../src/services/agents'
import { appendLog } from '../src/services/logs'

const VALID_HCL = `agent "CRM Expert" {
  version      = "1.2.0"
  model        = "gpt-4o"
  instructions = "You are a CRM specialist."
}`

describe('GET /api/agent/:id/agentfile', () => {
  it('returns current Agentfile content from GCS', async () => {
    const res = await request(app)
      .get('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('content')
    expect(downloadAgentfile).toHaveBeenCalledWith('agent-1', '1.0.0')
  })
})

describe('PUT /api/agent/:id/agentfile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('uploads HCL to GCS with correct version', async () => {
    const res = await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
      .send({ content: VALID_HCL })
    expect(res.status).toBe(200)
    expect(res.body.version).toBe('1.2.0')
    expect(uploadAgentfile).toHaveBeenCalledWith('agent-1', '1.2.0', VALID_HCL)
  })

  it('creates version metadata in Firestore', async () => {
    await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
      .send({ content: VALID_HCL })
    expect(addAgentVersion).toHaveBeenCalledWith('agent-1', '1.2.0', expect.any(String))
  })

  it('syncs currentVersion on agent doc', async () => {
    await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
      .send({ content: VALID_HCL })
    expect(updateAgentVersion).toHaveBeenCalledWith('agent-1', '1.2.0')
  })

  it('logs the push action', async () => {
    await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
      .send({ content: VALID_HCL })
    expect(appendLog).toHaveBeenCalled()
  })

  it('includes comment in log description when provided', async () => {
    await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
      .send({ content: VALID_HCL, comment: 'add memory support' })
    expect(appendLog).toHaveBeenCalledWith(
      'agent-1',
      expect.objectContaining({ description: expect.stringContaining('add memory support') }),
    )
  })

  it('returns 400 when content missing', async () => {
    const res = await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
      .send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 when version field missing from HCL', async () => {
    const res = await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
      .send({ content: 'agent "X" { model = "gpt-4o" }' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/agent/:id/agentfile/versions', () => {
  it('returns version list', async () => {
    const res = await request(app)
      .get('/api/agent/agent-1/agentfile/versions')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toHaveProperty('version')
  })
})

describe('GET /api/agent/:id/agentfile/versions/:version', () => {
  it('returns historical Agentfile content from GCS', async () => {
    const res = await request(app)
      .get('/api/agent/agent-1/agentfile/versions/1.0.0')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('content')
    expect(downloadAgentfile).toHaveBeenCalledWith('agent-1', '1.0.0')
  })
})
