import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, userId, userName } = req.body;

    // Store user in session
    const sessionKey = `session:${sessionId}`;
    const userKey = `${sessionKey}:users`;

    await kv.hset(userKey, {
        [userId]: {
            id: userId,
            name: userName,
            joinedAt: Date.now()
        }
    });

    // Set expiry (1 hour)
    await kv.expire(sessionKey, 3600);
    await kv.expire(userKey, 3600);

    return res.status(200).json({ success: true });
}
