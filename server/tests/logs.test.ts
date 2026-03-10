import './__mocks__/services'
import request from 'supertest'
import app from '../src/index'
import { authHeader, HUMAN_TOKEN } from './helpers'
import { appendLog, getLogs } from '../src/services/logs'

describe('Auto-logging on agent mutations', () => {
  beforeEach(() => jest.clearAllMocks())

  it('POST /api/agent logs "Agent created"', async () => {
    await request(app)
      .post('/api/agent')
      .set(authHeader(HUMAN_TOKEN))
      .send({
        name: 'Test',
        workspaceId: 'ws-1',
        content: 'agent "Test" {\n  version = "0.1.0"\n  instructions = ""\n}',
      })
    expect(appendLog).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ description: 'Agent created' }),
    )
  })

  it('PUT /api/agent/:id/agentfile logs "Agentfile pushed"', async () => {
    await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set(authHeader(HUMAN_TOKEN))
      .send({ content: 'agent "X" {\n  version = "2.0.0"\n}' })
    expect(appendLog).toHaveBeenCalledWith(
      'agent-1',
      expect.objectContaining({ description: 'Agentfile pushed' }),
    )
  })

  it('PATCH /api/agent/:id/privacy logs privacy change', async () => {
    await request(app)
      .patch('/api/agent/agent-1/privacy')
      .set(authHeader(HUMAN_TOKEN))
      .send({ privacy: 'public' })
    expect(appendLog).toHaveBeenCalledWith(
      'agent-1',
      expect.objectContaining({ description: expect.stringMatching(/public|private/i) }),
    )
  })

  it('DELETE /api/agent/:id logs "Agent deleted"', async () => {
    await request(app)
      .delete('/api/agent/agent-1')
      .set(authHeader(HUMAN_TOKEN))
    expect(appendLog).toHaveBeenCalledWith(
      'agent-1',
      expect.objectContaining({ description: 'Agent deleted' }),
    )
  })
})

describe('GET /api/agent/:id/logs', () => {
  it('returns log entries for an agent', async () => {
    const res = await request(app)
      .get('/api/agent/agent-1/logs')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(getLogs).toHaveBeenCalledWith('agent-1')
  })

  it('entries have required fields', async () => {
    const res = await request(app)
      .get('/api/agent/agent-1/logs')
      .set(authHeader(HUMAN_TOKEN))
    const entry = res.body[0]
    expect(entry).toHaveProperty('timestamp')
    expect(entry).toHaveProperty('user')
    expect(entry).toHaveProperty('userId')
    expect(entry).toHaveProperty('description')
  })
})
