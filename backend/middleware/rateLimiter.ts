import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Create rate limiter instance
const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
    analytics: true,
});

export async function withRateLimit(
    req: VercelRequest,
    res: VercelResponse,
    handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
    const identifier = (req.headers['x-forwarded-for'] as string) || 'anonymous';

    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', reset.toString());

    if (!success) {
        return res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.floor((reset - Date.now()) / 1000)
        });
    }

    return handler(req, res);
}
