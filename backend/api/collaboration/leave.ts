import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, userId } = req.body;

    const sessionKey = `session:${sessionId}`;
    const userKey = `${sessionKey}:users`;
    const cursorKey = `${sessionKey}:cursors`;

    await Promise.all([
        kv.hdel(userKey, userId),
        kv.hdel(cursorKey, userId)
    ]);

    return res.status(200).json({ success: true });
}
