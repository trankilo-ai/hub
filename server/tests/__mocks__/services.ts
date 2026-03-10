import { HUMAN_USER, AGENT_USER, FIREBASE_TOKEN, AGENT_TOKEN, TEST_JWT_SECRET } from '../helpers'

process.env.JWT_SECRET = TEST_JWT_SECRET

jest.mock('../../src/services/firebase', () => ({
  initFirebase: jest.fn(),
  getDb: jest.fn(),
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(async (token: string) => {
      if (token === FIREBASE_TOKEN) return HUMAN_USER
      if (token === AGENT_TOKEN) return AGENT_USER
      throw new Error('Invalid token')
    }),
  })),
}))

jest.mock('../../src/services/agents', () => ({
  listPublicAgents: jest.fn(async () => [
    {
      id: 'agent-1',
      name: 'CRM Expert',
      platform: 'LangChain',
      privacy: 'public',
      workspaceId: 'ws-1',
      ownerId: 'user-123',
      currentVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
  searchPublicAgents: jest.fn(async () => []),
  getAgent: jest.fn(async (id: string) => {
    if (id === 'agent-1')
      return {
        id: 'agent-1',
        name: 'CRM Expert',
        platform: 'LangChain',
        privacy: 'public',
        workspaceId: 'ws-1',
        ownerId: 'user-123',
        currentVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    return null
  }),
  createAgent: jest.fn(async (data: Record<string, unknown>) => ({
    id: 'new-agent',
    ...data,
    currentVersion: '0.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  deleteAgent: jest.fn(async () => {}),
  updateAgentVersion: jest.fn(async () => {}),
  updateAgentPrivacy: jest.fn(async () => {}),
  updateAgentName: jest.fn(async () => {}),
  updateAgentPlatform: jest.fn(async () => {}),
  addAgentVersion: jest.fn(async () => ({
    id: 'v1',
    version: '1.0.0',
    savedAt: new Date().toISOString(),
    savedBy: 'user-123',
  })),
  listAgentVersions: jest.fn(async () => [
    { id: 'v1', version: '1.0.0', savedAt: new Date().toISOString(), savedBy: 'user-123' },
  ]),
}))

jest.mock('../../src/services/workspaces', () => ({
  getWorkspace: jest.fn(async (id: string) => {
    if (id === 'ws-1')
      return {
        id: 'ws-1',
        name: 'My Workspace',
        owner: 'user-123',
        members: { 'user-123': 'Admin', 'viewer-uid': 'Viewer' },
      }
    return null
  }),
  createWorkspace: jest.fn(async (name: string, ownerId: string) => ({
    id: 'new-ws',
    name,
    owner: ownerId,
    members: { [ownerId]: 'Admin' },
  })),
  getMemberRole: jest.fn(async (_wsId: string, userId: string) => {
    if (userId === 'user-123') return 'Admin'
    if (userId === 'viewer-uid') return 'Viewer'
    return null
  }),
  setMemberRole: jest.fn(async () => {}),
  createInvite: jest.fn(async (_wsId: string, email: string, role: string, invitedBy: string) => ({
    id: 'inv-1',
    email,
    role,
    invitedBy,
    status: 'pending',
    invitedAt: new Date().toISOString(),
  })),
  listInvites: jest.fn(async () => []),
  deleteInvite: jest.fn(async () => {}),
  acceptInvite: jest.fn(async () => {}),
  listWorkspaceAgents: jest.fn(async () => []),
}))

jest.mock('../../src/services/heartbeats', () => ({
  recordBeat: jest.fn(async () => {}),
  getBeats: jest.fn(async (_agentId: string, since?: Date) => {
    const beats = [{ timestamp: new Date().toISOString(), metadata: { version: '1.0.0' } }]
    if (since) {
      return beats.filter((b) => new Date(b.timestamp) >= since)
    }
    return beats
  }),
  parsePeriod: jest.fn((period?: string) => {
    if (!period) return undefined
    const map: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    }
    const ms = map[period] ?? map['1h']
    return new Date(Date.now() - ms)
  }),
}))

jest.mock('../../src/services/logs', () => ({
  appendLog: jest.fn(async () => {}),
  getLogs: jest.fn(async () => [
    {
      timestamp: new Date().toISOString(),
      user: 'Test User',
      userId: 'user-123',
      description: 'Agent created',
    },
  ]),
}))

jest.mock('../../src/services/gcs', () => ({
  uploadAgentfile: jest.fn(async () => {}),
  downloadAgentfile: jest.fn(async () => `agent "CRM Expert" {\n  version = "1.0.0"\n}`),
  agentfileExists: jest.fn(async () => true),
}))

jest.mock('../../src/services/email', () => ({
  sendInviteEmail: jest.fn(async () => {}),
}))
