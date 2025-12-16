import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/config/database';
import { logger } from '../../src/utils/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { companyId, type, hsaEligible } = req.query;

        let queryStr = 'SELECT * FROM plans WHERE is_active = true';
        const params: any[] = [];

        if (companyId) { params.push(companyId); queryStr += ` AND company_id = $${params.length}`; }
        if (type) { params.push(type); queryStr += ` AND type = $${params.length}`; }
        if (hsaEligible !== undefined) {
            params.push(hsaEligible === 'true');
            queryStr += ` AND hsa_eligible = $${params.length}`;
        }

        queryStr += ' ORDER BY premiums->\'employee\' ASC';

        const result = await query(queryStr, params);
        res.json({ plans: result.rows });
    } catch (error) {
        logger.error('Get plans error', { error });
        res.status(500).json({ error: 'Failed to get plans' });
    }
}
