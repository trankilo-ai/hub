import './__mocks__/services'
import request from 'supertest'
import app from '../src/index'
import { getMemberRole } from '../src/services/workspaces'
import { HUMAN_TOKEN } from './helpers'

describe('RBAC — Viewer restrictions', () => {
  beforeEach(() => {
    ;(getMemberRole as jest.Mock).mockResolvedValue('Viewer')
  })

  it('Viewer cannot PUT agentfile (403)', async () => {
    const res = await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set({ Authorization: `Bearer ${HUMAN_TOKEN}` })
      .send({ content: 'agent "X" {\n  version = "1.0.0"\n}' })
    expect(res.status).toBe(403)
  })

  it('Viewer cannot DELETE agent (403)', async () => {
    const res = await request(app)
      .delete('/api/agent/agent-1')
      .set({ Authorization: `Bearer ${HUMAN_TOKEN}` })
    expect(res.status).toBe(403)
  })

  it('Viewer cannot change member roles (403)', async () => {
    const res = await request(app)
      .patch('/api/workspace/ws-1/member/viewer-uid/role')
      .set({ Authorization: `Bearer ${HUMAN_TOKEN}` })
      .send({ role: 'Editor' })
    expect(res.status).toBe(403)
  })
})

describe('RBAC — non-member access', () => {
  beforeEach(() => {
    ;(getMemberRole as jest.Mock).mockResolvedValue(null)
  })

  it('non-member gets 403 on agentfile PUT', async () => {
    const res = await request(app)
      .put('/api/agent/agent-1/agentfile')
      .set({ Authorization: `Bearer ${HUMAN_TOKEN}` })
      .send({ content: 'agent "X" {\n  version = "1.0.0"\n}' })
    expect(res.status).toBe(403)
  })

  it('non-member gets 403 on workspace GET', async () => {
    const { getWorkspace } = jest.requireMock('../src/services/workspaces') as {
      getWorkspace: jest.Mock
    }
    getWorkspace.mockResolvedValueOnce({
      id: 'ws-1',
      name: 'My Workspace',
      owner: 'other-user',
      members: { 'other-user': 'Admin' },
    })

    const res = await request(app)
      .get('/api/workspace/ws-1')
      .set({ Authorization: `Bearer ${HUMAN_TOKEN}` })
    expect(res.status).toBe(403)
  })
})
