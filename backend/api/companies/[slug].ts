import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/config/database';
import { logger } from '../../src/utils/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { slug } = req.query;

    try {
        const result = await query(
            `SELECT id, name, slug, logo_url, primary_color, secondary_color, settings
       FROM companies WHERE slug = $1`,
            [slug as string]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json({ company: result.rows[0] });
    } catch (error) {
        logger.error('Get company error', { error });
        res.status(500).json({ error: 'Failed to get company' });
    }
}
