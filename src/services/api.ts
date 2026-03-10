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

interface LoginResponse {
  token: string
  user: UserProfile
}

export const authApi = {
  login: (idToken: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
}

export const agentsApi = {
  list: () => request<Agent[]>('/agent'),
  search: (q: string, platform?: string) =>
    request<Agent[]>(`/agent/search?q=${encodeURIComponent(q)}${platform ? `&platform=${encodeURIComponent(platform)}` : ''}`),
  get: (id: string) => request<Agent>(`/agent/${id}`),
  create: (data: { name: string; platform?: string; workspaceId: string; content?: string }) =>
    request<Agent>('/agent', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/agent/${id}`, { method: 'DELETE' }),
  updatePrivacy: (id: string, privacy: 'public' | 'private') =>
    request<Agent>(`/agent/${id}/privacy`, {
      method: 'PATCH',
      body: JSON.stringify({ privacy }),
    }),
}

export const agentfileApi = {
  get: (id: string) => request<{ content: string }>(`/agent/${id}/agentfile`),
  save: (id: string, content: string, comment?: string) =>
    request<{ version: string }>(`/agent/${id}/agentfile`, {
      method: 'PUT',
      body: JSON.stringify({ content, ...(comment ? { comment } : {}) }),
    }),
  versions: (id: string) => request<AgentVersion[]>(`/agent/${id}/agentfile/versions`),
  getVersion: (id: string, version: string) =>
    request<{ content: string }>(`/agent/${id}/agentfile/versions/${encodeURIComponent(version)}`),
}

export const logsApi = {
  get: (agentId: string) => request<LogEntry[]>(`/agent/${agentId}/logs`),
}

export const workspacesApi = {
  list: () => request<Workspace[]>('/workspace'),
  get: (id: string) => request<Workspace>(`/workspace/${id}`),
  agents: (id: string) => request<Agent[]>(`/workspace/${id}/agent`),
  members: (id: string) => request<WorkspaceMember[]>(`/workspace/${id}/member`),
  invites: (id: string) => request<WorkspaceInvite[]>(`/workspace/${id}/invite`),
  deleteInvite: (workspaceId: string, inviteId: string) =>
    request<void>(`/workspace/${workspaceId}/invite/${inviteId}`, { method: 'DELETE' }),
  acceptInvite: (workspaceId: string, inviteId: string) =>
    request<Workspace>(`/workspace/${workspaceId}/invite/${inviteId}/accept`, { method: 'POST' }),
  create: (name: string) =>
    request<Workspace>('/workspace', { method: 'POST', body: JSON.stringify({ name }) }),
  invite: (id: string, email: string, role: string) =>
    request<void>(`/workspace/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  setRole: (workspaceId: string, userId: string, role: string) =>
    request<void>(`/workspace/${workspaceId}/member/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
}

export const heartbeatApi = {
  get: (agentId: string, period?: string) =>
    request<HeartbeatEntry[]>(`/agent/${agentId}/heartbeat${period ? `?period=${encodeURIComponent(period)}` : ''}`),
}
