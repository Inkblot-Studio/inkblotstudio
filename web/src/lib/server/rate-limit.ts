type Entry = { count: number; resetAt: number };

const bucket = new Map<string, Entry>();

const WINDOW_MS = 60_000;
const LIMIT = 20;

async function isRateLimitedInMemory(key: string): Promise<boolean> {
	const now = Date.now();
	const current = bucket.get(key);

	if (!current || current.resetAt < now) {
		bucket.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}

	current.count += 1;
	bucket.set(key, current);
	return current.count > LIMIT;
}

async function isRateLimitedInRedis(key: string): Promise<boolean> {
	const redisUrl = import.meta.env.REDIS_URL;
	if (!redisUrl) return isRateLimitedInMemory(key);

	const redis = await import('ioredis');
	const client = new redis.default(redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
	try {
		const count = await client.incr(`ratelimit:${key}`);
		if (count === 1) {
			await client.pexpire(`ratelimit:${key}`, WINDOW_MS);
		}
		return count > LIMIT;
	} catch {
		return isRateLimitedInMemory(key);
	} finally {
		client.disconnect();
	}
}

export async function isRateLimited(key: string): Promise<boolean> {
	return isRateLimitedInRedis(key);
}
