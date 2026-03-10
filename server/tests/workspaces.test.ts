import './__mocks__/services'
import request from 'supertest'
import app from '../src/index'
import { authHeader, HUMAN_TOKEN } from './helpers'
import { createWorkspace, setMemberRole } from '../src/services/workspaces'

describe('GET /api/workspace/:workspaceId', () => {
  it('returns workspace for a member', async () => {
    const res = await request(app)
      .get('/api/workspace/ws-1')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('ws-1')
    expect(res.body).toHaveProperty('members')
  })

  it('returns 404 for unknown workspace', async () => {
    const res = await request(app)
      .get('/api/workspace/nonexistent')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/workspace', () => {
  it('creates workspace and returns 201', async () => {
    const res = await request(app)
      .post('/api/workspace')
      .set(authHeader(HUMAN_TOKEN))
      .send({ name: 'My Workspace' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(createWorkspace).toHaveBeenCalledWith('My Workspace', 'user-123')
  })

  it('returns 400 when name missing', async () => {
    const res = await request(app)
      .post('/api/workspace')
      .set(authHeader(HUMAN_TOKEN))
      .send({})
    expect(res.status).toBe(400)
  })
})

describe('POST /api/workspace/:workspaceId/invite', () => {
  it('creates invite and returns 201', async () => {
    const res = await request(app)
      .post('/api/workspace/ws-1/invite')
      .set(authHeader(HUMAN_TOKEN))
      .send({ email: 'new@example.com', role: 'Editor' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.email).toBe('new@example.com')
  })

  it('returns 400 when email missing', async () => {
    const res = await request(app)
      .post('/api/workspace/ws-1/invite')
      .set(authHeader(HUMAN_TOKEN))
      .send({ role: 'Editor' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/workspace/:workspaceId/member/:userId/role', () => {
  it('updates member role', async () => {
    const res = await request(app)
      .patch('/api/workspace/ws-1/member/viewer-uid/role')
      .set(authHeader(HUMAN_TOKEN))
      .send({ role: 'Editor' })
    expect(res.status).toBe(200)
    expect(setMemberRole).toHaveBeenCalledWith('ws-1', 'viewer-uid', 'Editor')
  })

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .patch('/api/workspace/ws-1/member/viewer-uid/role')
      .set(authHeader(HUMAN_TOKEN))
      .send({ role: 'SuperAdmin' })
    expect(res.status).toBe(400)
  })
})
