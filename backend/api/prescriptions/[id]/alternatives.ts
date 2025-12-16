import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prescriptionService } from '../../../src/services/prescriptionService';
import { logger } from '../../../src/utils/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { id } = req.query;
        const alternatives = await prescriptionService.findAlternatives(
            id as string,
            req.query.companyId as string
        );
        res.json({ alternatives });
    } catch (error) {
        logger.error('Get alternatives error', { error });
        res.status(500).json({ error: 'Failed to get alternatives' });
    }
}
