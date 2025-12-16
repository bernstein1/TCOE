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
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const companyId = user.companyId;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const now = new Date();

        const [activeUsers, funnel, modeCompletion, planPopularity] = await Promise.all([
            analyticsService.getActiveUsers(companyId, 'day', 30),
            analyticsService.getFunnelMetrics(companyId, thirtyDaysAgo, now),
            analyticsService.getModeCompletionRates(companyId, thirtyDaysAgo, now),
            analyticsService.getPlanPopularity(companyId, thirtyDaysAgo, now),
        ]);

        res.json({ activeUsers, funnel, modeCompletion, planPopularity });
    } catch (error) {
        logger.error('Get admin dashboard error', { error });
        res.status(500).json({ error: 'Failed to get dashboard data' });
    }
}
