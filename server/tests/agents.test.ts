import './__mocks__/services'
import request from 'supertest'
import app from '../src/index'
import { authHeader, HUMAN_TOKEN } from './helpers'
import { appendLog } from '../src/services/logs'

describe('GET /api/agent', () => {
  it('returns public agent list without auth', async () => {
    const res = await request(app).get('/api/agent')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toHaveProperty('id')
  })
})

describe('GET /api/agent/search', () => {
  it('returns array for search query', async () => {
    const res = await request(app).get('/api/agent/search?q=crm')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('GET /api/agent/:id', () => {
  it('returns public agent without auth', async () => {
    const res = await request(app).get('/api/agent/agent-1')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('agent-1')
  })

  it('returns 404 for unknown agent', async () => {
    const res = await request(app)
      .get('/api/agent/nonexistent')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/agent', () => {
  it('creates agent with content and returns 201', async () => {
    const res = await request(app)
      .post('/api/agent')
      .set(authHeader(HUMAN_TOKEN))
      .send({
        name: 'New Agent',
        workspaceId: 'ws-1',
        content: 'agent "New Agent" {\n  version = "0.1.0"\n  instructions = ""\n}',
      })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  it('logs the create action', async () => {
    await request(app)
      .post('/api/agent')
      .set(authHeader(HUMAN_TOKEN))
      .send({
        name: 'Logged Agent',
        workspaceId: 'ws-1',
        content: 'agent "Logged Agent" {\n  version = "0.1.0"\n  instructions = ""\n}',
      })
    expect(appendLog).toHaveBeenCalled()
  })

  it('returns 400 when name missing', async () => {
    const res = await request(app)
      .post('/api/agent')
      .set(authHeader(HUMAN_TOKEN))
      .send({ workspaceId: 'ws-1' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/agent/:id', () => {
  it('returns 204 for Admin', async () => {
    const res = await request(app)
      .delete('/api/agent/agent-1')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(204)
  })
})

describe('PATCH /api/agent/:id/privacy', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates privacy and returns 200', async () => {
    const res = await request(app)
      .patch('/api/agent/agent-1/privacy')
      .set(authHeader(HUMAN_TOKEN))
      .send({ privacy: 'public' })
    expect(res.status).toBe(200)
  })

  it('logs the privacy change', async () => {
    await request(app)
      .patch('/api/agent/agent-1/privacy')
      .set(authHeader(HUMAN_TOKEN))
      .send({ privacy: 'public' })
    expect(appendLog).toHaveBeenCalledWith(
      'agent-1',
      expect.objectContaining({ description: expect.stringMatching(/public|private/i) }),
    )
  })
})
