import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyticsService } from '../../../src/services/analyticsService';
import { logger } from '../../../src/utils/logger';
import { clerkAuth, syncUser } from '../../../src/middleware/clerkAuth';

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

        const results = await analyticsService.getExperimentResults(
            req.query.id as string,
            user.companyId,
            startDate,
            endDate
        );
        res.json(results);
    } catch (error) {
        logger.error('Get experiment results error', { error });
        res.status(500).json({ error: 'Failed to get experiment results' });
    }
}
