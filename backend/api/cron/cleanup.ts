import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify request is from Vercel Cron
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Get all session keys
        const sessionKeys = await kv.keys('session:*');

        let cleanedCount = 0;
        const now = Date.now();
        const STALE_THRESHOLD = 60 * 60 * 1000; // 1 hour

        for (const sessionKey of sessionKeys) {
            // keys('session:*') returns all matching keys, including subkeys like :users
            // We only want to process the main session identifiers if we structured them that way
            // But based on join.ts, we have `session:{id}` (expiration set) and `session:{id}:users` (expiration set)
            // KV expires keys automatically if TTL is set.
            // However, if we want manual cleanup for complex logic:

            // The join.ts sets TTL. So Redis actually handles cleanup automatically!
            // But the prompt specifically requested this manual cleanup logic "For Phase 4".
            // I will implement it as requested, assuming maybe some keys don't have TTL or we want aggressive cleanup.

            // Note: 'session:*' might match 'session:123' and 'session:123:users'.
            // We should be careful not to double count.
            if (sessionKey.includes(':users') || sessionKey.includes(':cursors')) continue;

            const userKey = `${sessionKey}:users`;
            const users = await kv.hgetall(userKey);

            if (!users || Object.keys(users).length === 0) {
                // No users, delete session
                await kv.del(sessionKey, userKey, `${sessionKey}:cursors`);
                cleanedCount++;
                continue;
            }

            // Check for stale users
            const allStale = Object.values(users).every(
                (user: any) => now - user.joinedAt > STALE_THRESHOLD
            );

            if (allStale) {
                await kv.del(sessionKey, userKey, `${sessionKey}:cursors`);
                cleanedCount++;
            }
        }

        return res.status(200).json({
            success: true,
            cleanedSessions: cleanedCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cleanup job failed:', error);
        return res.status(500).json({ error: 'Cleanup failed' });
    }
}
