import { createClient, type RedisClientType } from 'redis'

let client: RedisClientType | null = null

const redisUrl = (): string => {
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error('REDIS_URL is required')
  }
  return url
}

const getRedis = async (): Promise<RedisClientType> => {
  if (!client) {
    client = createClient({ url: redisUrl() })
    client.on('error', (error) => {
      console.error('[redis error]', error)
    })
    await client.connect()
  }
  return client
}

export const get = async (key: string): Promise<string | null> => {
  const client = await getRedis()
  return client.get(key)
}

const redis = { get }
export default redis
