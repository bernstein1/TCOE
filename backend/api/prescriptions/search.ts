import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prescriptionService } from '../../src/services/prescriptionService';
import { logger } from '../../src/utils/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const searchTerm = req.query.q as string;
        if (!searchTerm || searchTerm.length < 2) {
            return res.status(400).json({ error: 'Search term must be at least 2 characters' });
        }

        const results = await prescriptionService.searchPrescriptions(
            searchTerm,
            req.query.companyId as string
        );

        res.json({ prescriptions: results });
    } catch (error) {
        logger.error('Prescription search error', { error });
        res.status(500).json({ error: 'Failed to search prescriptions' });
    }
}
