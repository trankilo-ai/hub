import './__mocks__/services'
import request from 'supertest'
import app from '../src/index'
import { authHeader, HUMAN_TOKEN } from './helpers'

describe('GET /api/schema/agentfile', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/schema/agentfile')
    expect(res.status).toBe(401)
  })

  it('returns 200 with valid token', async () => {
    const res = await request(app)
      .get('/api/schema/agentfile')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.status).toBe(200)
  })

  it('response includes fields array and example string', async () => {
    const res = await request(app)
      .get('/api/schema/agentfile')
      .set(authHeader(HUMAN_TOKEN))
    expect(res.body).toHaveProperty('fields')
    expect(Array.isArray(res.body.fields)).toBe(true)
    expect(res.body).toHaveProperty('example')
    expect(typeof res.body.example).toBe('string')
  })

  it('fields array contains canonical field names', async () => {
    const res = await request(app)
      .get('/api/schema/agentfile')
      .set(authHeader(HUMAN_TOKEN))
    const fieldNames = (res.body.fields as { name: string }[]).map((f) => f.name)
    for (const name of ['id', 'name', 'version', 'platform', 'model', 'instructions']) {
      expect(fieldNames).toContain(name)
    }
  })
})
