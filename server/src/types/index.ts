import type { DecodedIdToken } from 'firebase-admin/auth'

export type Role = 'Admin' | 'Editor' | 'Viewer'

export interface Agent {
  id: string
  name: string
  platform: string
  description: string
  privacy: 'public' | 'private'
  workspaceId: string
  ownerId: string
  currentVersion: string
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
}

export interface AgentVersion {
  id: string
  version: string
  savedAt: FirebaseFirestore.Timestamp
  savedBy: string
}

export interface Workspace {
  id: string
  name: string
  owner: string
  members: Record<string, Role>
}

export interface WorkspaceInvite {
  id: string
  email: string
  role: Role
  invitedBy: string
  status: 'pending'
  invitedAt: FirebaseFirestore.Timestamp
}

export interface HeartbeatEntry {
  timestamp: string
  metadata: Record<string, unknown>
}

export interface LogEntry {
  timestamp: FirebaseFirestore.Timestamp
  user: string
  userId: string
  description: string
  comment?: string
}

export interface LogDoc {
  entries: LogEntry[]
}

export interface ApiKeyRecord {
  id: string
  hash: string
  isActive: boolean
  scopes: string[]
  ownerId: string
}

export interface ApiIdentity {
  userId: string
  keyId: string
  scopes: string[]
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken & { role?: string }
      identity?: ApiIdentity
    }
  }
}
