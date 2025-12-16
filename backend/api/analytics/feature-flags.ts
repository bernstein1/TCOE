import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyticsService } from '../../src/services/analyticsService';
import { logger } from '../../src/utils/logger';
import { clerkOptionalAuth, syncUserOptional } from '../../src/middleware/clerkAuth';
import { v4 as uuidv4 } from 'uuid';

const runMiddleware = (req: any, res: any, fn: Function) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await runMiddleware(req, res, clerkOptionalAuth);
        await runMiddleware(req, res, syncUserOptional);
        const user = (req as any).user;

        const flags = analyticsService.getFeatureFlags();

        if (!user || user.role !== 'admin') {
            const sessionId = req.query.sessionId as string || uuidv4();
            const assignments = flags
                .filter(f => f.enabled)
                .map(f => ({
                    id: f.id,
                    ...analyticsService.getVariantAssignment(f.id, user?.id || null, sessionId),
                }));
            return res.json({ flags: assignments });
        }

        res.json({ flags });
    } catch (error) {
        logger.error('Get feature flags error', { error });
        res.status(500).json({ error: 'Failed to get feature flags' });
    }
}
