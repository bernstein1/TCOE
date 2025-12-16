import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyticsService } from '../../src/services/analyticsService';
import { logger } from '../../src/utils/logger';
import { validate } from '../../src/middleware';
import { analyticsEventSchema } from '../../src/utils/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // We can run validation middleware or manual parse. Manual parse for stronger types.
        const body = analyticsEventSchema.parse(req.body);

        // Note: session parsing is tricky if this endpoint is public/session-optional. 
        // The original code used req.session?.companyId fallback.
        // In serverless, we might not have session middleware running here unless we add it.
        // Assuming this is public/low-security or ID-based tracking.

        await analyticsService.trackEvent({
            ...body,
            companyId: body.companyId, // Should be in body or derived
        });
        res.status(201).json({ success: true });
    } catch (error) {
        logger.error('Track event error', { error });
        res.status(500).json({ error: 'Failed to track event' });
    }
}
