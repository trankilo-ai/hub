import './__mocks__/services'
import request from 'supertest'
import app from '../src/index'
import { authHeader, HUMAN_TOKEN, AGENT_TOKEN, INVALID_TOKEN, FIREBASE_TOKEN } from './helpers'

describe('Auth middleware', () => {
  it('returns 401 when no Authorization header', async () => {
    const res = await request(app).post('/api/agent').send({ name: 'X', workspaceId: 'ws-1' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for invalid token', async () => {
    const res = await request(app)
      .post('/api/agent')
      .set(authHeader(INVALID_TOKEN))
      .send({ name: 'X', workspaceId: 'ws-1' })
    expect(res.status).toBe(401)
  })

  it('allows request with valid hub JWT', async () => {
    const res = await request(app)
      .post('/api/agent')
      .set(authHeader(HUMAN_TOKEN))
      .send({ name: 'Test Agent', workspaceId: 'ws-1', content: 'agent "Test Agent" {\n  version = "0.1.0"\n  instructions = ""\n}' })
    expect(res.status).toBe(201)
  })

  it('accepts hub JWT on GET agent endpoint', async () => {
    const res = await request(app)
      .get('/api/agent/agent-1')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/auth/login', () => {
  it('returns 400 when idToken missing', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
  })

  it('returns { token, user } for valid Firebase token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ idToken: FIREBASE_TOKEN })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('user')
    expect(res.body.user).toHaveProperty('uid')
    expect(res.body.user).toHaveProperty('email')
  })

  it('returns 401 for invalid idToken', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ idToken: INVALID_TOKEN })
    expect(res.status).toBe(401)
  })
})

describe('requireAgentRole', () => {
  it('returns 403 when human token hits heartbeat POST', async () => {
    const res = await request(app)
      .post('/api/agent/agent-1/heartbeat')
      .set(authHeader(HUMAN_TOKEN))
      .send({})
    expect(res.status).toBe(403)
  })

  it('allows agent token on heartbeat POST', async () => {
    const res = await request(app)
      .post('/api/agent/agent-1/heartbeat')
      .set(authHeader(AGENT_TOKEN))
      .send({})
    expect(res.status).toBe(200)
  })
})
