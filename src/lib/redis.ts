import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn('Upstash Redis environment variables are missing. Caching will fail.');
}

export const redis = new Redis({
  url: redisUrl || 'https://placeholder.upstash.io',
  token: redisToken || 'placeholder-token',
});
