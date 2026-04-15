import type { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'
import type { ApiKeyRecord } from '../types'
import redis from '../services/redis'

const pepper = process.env.API_KEY_PEPPER

export async function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.get('X-TRANKILO-API-KEY')
  if (!apiKey) {
    res.status(401).json({ message: 'Missing API key' })
    return
  }

  if (!pepper) {
    res.status(500).json({ message: 'API_KEY_PEPPER is not configured' })
    return
  }

  try {
    const providedHash = crypto.createHmac('sha256', pepper).update(apiKey).digest('hex')
    const payload = await redis.get(`api_key:${providedHash}`)
    const keyRecord = payload ? (JSON.parse(payload) as ApiKeyRecord) : null
    if (!keyRecord || !keyRecord.isActive) {
      res.status(401).json({ message: 'Invalid or revoked API key' })
      return
    }

    const expectedBuffer = Buffer.from(keyRecord.hash)
    const actualBuffer = Buffer.from(providedHash)
    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      res.status(401).json({ message: 'Invalid or revoked API key' })
      return
    }

    req.identity = {
      userId: keyRecord.ownerId,
      keyId: keyRecord.id,
      scopes: keyRecord.scopes,
    }
    next()
  } catch (error) {
    console.error('[api key auth error]', {
      method: req.method,
      path: req.originalUrl,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    res.status(500).json({ message: 'Internal authentication error' })
  }
}
