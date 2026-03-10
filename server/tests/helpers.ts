import type { DecodedIdToken } from 'firebase-admin/auth'
import jwt from 'jsonwebtoken'

export const TEST_JWT_SECRET = 'test-secret'

export const FIREBASE_TOKEN = 'valid-firebase-token'
export const AGENT_TOKEN = 'valid-agent-token'
export const INVALID_TOKEN = 'bad-token'

export const HUMAN_USER: Partial<DecodedIdToken> = {
  uid: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
}

export const AGENT_USER: Partial<DecodedIdToken> & { role: string } = {
  uid: 'agent-abc',
  name: 'SDK Agent',
  role: 'agent',
}

export const HUMAN_TOKEN = jwt.sign(
  { userId: HUMAN_USER.uid, email: HUMAN_USER.email },
  TEST_JWT_SECRET,
)

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}
