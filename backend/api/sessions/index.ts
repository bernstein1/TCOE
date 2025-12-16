import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../src/config/database';
import { analyticsService } from '../../src/services/analyticsService';
import { logger } from '../../src/utils/logger';
import { validate } from '../../src/middleware'; // Using relative import might be tricky if not set up, assuming simple export
import { createSessionSchema } from '../../src/utils/validation';
import { ZodError } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Manually validate because middleware wrapping is tedious for Zod
        const body = createSessionSchema.parse(req.body);

        // logic
        const { companySlug, mode, language, enrollmentType, lifeEventType } = body;

        const companyResult = await query('SELECT id FROM companies WHERE slug = $1', [companySlug]);
        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const sessionToken = uuidv4();
        const result = await query(
            `INSERT INTO sessions (company_id, session_token, mode, profile_data)
       VALUES ($1, $2, $3, $4)
       RETURNING id, session_token, mode, current_step, created_at`,
            [companyResult.rows[0].id, sessionToken, mode, JSON.stringify({ language, enrollmentType, lifeEventType })]
        );

        await analyticsService.trackEvent({
            sessionId: result.rows[0].id,
            companyId: companyResult.rows[0].id,
            eventType: 'session_start',
            eventData: { mode, language, enrollmentType },
        });

        res.status(201).json({ session: result.rows[0] });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        logger.error('Create session error', { error });
        res.status(500).json({ error: 'Failed to create session' });
    }
}
