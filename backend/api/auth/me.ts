import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clerkAuth, syncUser } from '../../src/middleware/clerkAuth';
import { logger } from '../../src/utils/logger';

// Helper to wrap middleware
const runMiddleware = (req: any, res: any, fn: Function) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Run auth middleware
        await runMiddleware(req, res, clerkAuth);
        await runMiddleware(req, res, syncUser);

        const { userId } = (req as any).auth;
        res.json({ user: { id: userId, role: 'admin' } });
    } catch (error) {
        logger.error('Get user error', { error });
        res.status(500).json({ error: 'Failed to get user' });
    }
}
