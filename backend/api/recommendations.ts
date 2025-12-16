import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calculationEngine } from '../../src/services/calculationEngine';
import { analyticsService } from '../../src/services/analyticsService';
import { query } from '../../src/config/database';
import { logger } from '../../src/utils/logger';
import { authenticateSession, validate } from '../../src/middleware';
import { recommendationRequestSchema } from '../../src/utils/validation';

const runMiddleware = (req: any, res: any, fn: Function) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await runMiddleware(req, res, authenticateSession);

        const body = recommendationRequestSchema.parse(req.body); // Validate manually or via middleware pattern
        const { profile } = body;
        const session = (req as any).session;

        const plansResult = await query(
            'SELECT * FROM plans WHERE company_id = $1 AND is_active = true',
            [session.companyId]
        );
        const prescriptionsResult = await query('SELECT * FROM prescriptions');

        const bundles = calculationEngine.generateBundles(
            profile,
            plansResult.rows as any[],
            prescriptionsResult.rows as any[]
        );

        await analyticsService.trackEvent({
            sessionId: session.id,
            companyId: session.companyId,
            eventType: 'recommendations_generated',
            eventData: { bestFitBundle: bundles.bestFitBundle },
        });

        res.json(bundles);
    } catch (error) {
        logger.error('Generate recommendations error', { error });
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
}
