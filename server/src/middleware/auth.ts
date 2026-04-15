import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getAuth } from '../services/firebase'

function setUserFromToken(req: Request, token: string): boolean {
  const secret = process.env.JWT_SECRET
  if (secret) {
    try {
      const decoded = jwt.verify(token, secret) as { userId: string; email: string }
      req.user = { uid: decoded.userId, email: decoded.email, name: decoded.email } as unknown as typeof req.user
      return true
    } catch {
      // fall through to Firebase verification
    }
  }
  return false
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' })
    return
  }

  const token = header.slice(7)
  if (setUserFromToken(req, token)) {
    return next()
  }

  try {
    const decoded = await getAuth().verifyIdToken(token)
    req.user = decoded as typeof req.user
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export function requireAgentRole(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== 'agent') {
    res.status(403).json({ message: 'Agent role required' })
    return
  }
  next()
}
