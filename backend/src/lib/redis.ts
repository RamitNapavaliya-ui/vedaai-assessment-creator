import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let _redis: Redis | null = null;
let _subscriber: Redis | null = null;

function makeMock(): Redis {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RedisMock = require('ioredis-mock');
  return new RedisMock() as Redis;
}

export async function initRedis(): Promise<void> {
  if (_redis) return;

  // Try real Redis with short timeout
  const probe = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 2000,
    lazyConnect: true,
  });

  try {
    await probe.connect();
    await probe.ping();
    _redis = probe;
    _subscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    console.log('✅ Redis connected');
  } catch {
    probe.disconnect();
    console.log('⚠️  Redis unavailable — using in-memory mock (pub/sub notifications disabled)');
    _redis = makeMock();
    _subscriber = makeMock();
  }
}

export function getRedis(): Redis {
  if (!_redis) throw new Error('Redis not initialised — call initRedis() first');
  return _redis;
}

export function getSubscriber(): Redis {
  if (!_subscriber) throw new Error('Redis subscriber not initialised');
  return _subscriber;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await getRedis().get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttl = 3600): Promise<void> {
  try { await getRedis().setex(key, ttl, JSON.stringify(value)); }
  catch (e) { console.error('cacheSet error:', e); }
}

export async function cacheDel(key: string): Promise<void> {
  try { await getRedis().del(key); }
  catch (e) { console.error('cacheDel error:', e); }
}
