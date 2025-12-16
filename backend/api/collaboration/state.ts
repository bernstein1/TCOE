import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    const sessionKey = `session:${sessionId}`;
    const userKey = `${sessionKey}:users`;
    const cursorKey = `${sessionKey}:cursors`;

    const [users, cursors] = await Promise.all([
        kv.hgetall(userKey),
        kv.hgetall(cursorKey)
    ]);

    return res.status(200).json({
        users: users || {},
        cursors: cursors || {}
    });
}
