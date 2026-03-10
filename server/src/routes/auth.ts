import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getAuth } from '../services/firebase'

const router = Router()

function signHubToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  return jwt.sign({ userId, email }, secret, { expiresIn: '30d' })
}

router.post('/login', async (req, res) => {
  const { idToken } = req.body as { idToken?: string }
  if (!idToken) {
    res.status(400).json({ message: 'idToken required' })
    return
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken)
    const token = signHubToken(decoded.uid, decoded.email ?? '')
    res.json({
      token,
      user: {
        uid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        photoURL: decoded.picture ?? null,
      },
    })
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
})

export default router
