import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, userId, x, y } = req.body;

    const cursorKey = `session:${sessionId}:cursors`;

    await kv.hset(cursorKey, {
        [userId]: { x, y, timestamp: Date.now() }
    });
    await kv.expire(cursorKey, 3600);

    return res.status(200).json({ success: true });
}
