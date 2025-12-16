import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyticsService } from '../../src/services/analyticsService';
import { logger } from '../../src/utils/logger';
import { clerkAuth, syncUser } from '../../src/middleware/clerkAuth';

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
        await runMiddleware(req, res, clerkAuth);
        await runMiddleware(req, res, syncUser);
        const user = (req as any).user;

        const startDate = new Date(req.query.startDate as string || Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date(req.query.endDate as string || Date.now());

        const metrics = await analyticsService.getFunnelMetrics(user.companyId, startDate, endDate);
        res.json({ funnel: metrics });
    } catch (error) {
        logger.error('Get funnel metrics error', { error });
        res.status(500).json({ error: 'Failed to get funnel metrics' });
    }
}
