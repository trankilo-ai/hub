import { auth } from './firebase'
import type { Agent, AgentVersion, Workspace, WorkspaceMember, WorkspaceInvite, HeartbeatEntry, LogEntry, UserProfile } from '../types'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function token(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = await token()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (t) headers['Authorization'] = `Bearer ${t}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    const err = new Error(body.message || `HTTP ${res.status}`) as Error & { status: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export const authApi = {
  login: (idToken: string) =>
    request<UserProfile>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
}

export const agentsApi = {
  list: () => request<Agent[]>('/agents'),
  search: (q: string, platform?: string) =>
    request<Agent[]>(`/agents/search?q=${encodeURIComponent(q)}${platform ? `&platform=${encodeURIComponent(platform)}` : ''}`),
  get: (id: string) => request<Agent>(`/agents/${id}`),
  create: (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'ownerId'>) =>
    request<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/agents/${id}`, { method: 'DELETE' }),
  publish: (id: string) => request<Agent>(`/agents/${id}/publish`, { method: 'POST' }),
  updatePrivacy: (id: string, privacy: 'public' | 'private') =>
    request<Agent>(`/agents/${id}/privacy`, {
      method: 'PATCH',
      body: JSON.stringify({ privacy }),
    }),
}

export const agentfileApi = {
  get: (id: string) => request<{ content: string }>(`/agents/${id}/agentfile`),
  save: (id: string, content: string) =>
    request<{ version: string }>(`/agents/${id}/agentfile`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  versions: (id: string) => request<AgentVersion[]>(`/agents/${id}/agentfile/versions`),
  getVersion: (id: string, version: string) =>
    request<{ content: string }>(`/agents/${id}/agentfile/versions/${encodeURIComponent(version)}`),
}

export const logsApi = {
  get: (agentId: string) => request<LogEntry[]>(`/agents/${agentId}/logs`),
}

export const workspacesApi = {
  list: () => request<Workspace[]>('/workspaces'),
  get: (id: string) => request<Workspace>(`/workspaces/${id}`),
  agents: (id: string) => request<Agent[]>(`/workspaces/${id}/agents`),
  members: (id: string) => request<WorkspaceMember[]>(`/workspaces/${id}/members`),
  invites: (id: string) => request<WorkspaceInvite[]>(`/workspaces/${id}/invites`),
  deleteInvite: (workspaceId: string, inviteId: string) =>
    request<void>(`/workspaces/${workspaceId}/invites/${inviteId}`, { method: 'DELETE' }),
  acceptInvite: (workspaceId: string, inviteId: string) =>
    request<Workspace>(`/workspaces/${workspaceId}/invites/${inviteId}/accept`, { method: 'POST' }),
  create: (name: string) =>
    request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  invite: (id: string, email: string, role: string) =>
    request<void>(`/workspaces/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  setRole: (workspaceId: string, userId: string, role: string) =>
    request<void>(`/workspaces/${workspaceId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
}

export const heartbeatApi = {
  get: (agentId: string) => request<HeartbeatEntry[]>(`/agents/${agentId}/heartbeat`),
}
