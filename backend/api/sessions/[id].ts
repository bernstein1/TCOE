import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/config/database';
import { logger } from '../../src/utils/logger';
import { authenticateSession, validate } from '../../src/middleware';
import { updateSessionSchema } from '../../src/utils/validation';

// Helper to wrap middleware
const runMiddleware = (req: any, res: any, fn: Function) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    // Run Auth Middleware
    try {
        await runMiddleware(req, res, authenticateSession);
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const result = await query(
                `SELECT s.*, p.name as selected_plan_name
         FROM sessions s
         LEFT JOIN plans p ON s.selected_plan_id = p.id
         WHERE s.id = $1`,
                [id as string]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Session not found' });
            }

            return res.json({ session: result.rows[0] });
        } catch (error) {
            logger.error('Get session error', { error });
            return res.status(500).json({ error: 'Failed to get session' });
        }
    }

    if (req.method === 'PUT') {
        try {
            // Validate body
            // We can use validate middleware explicitly or just parse Zod
            // To strictly follow pattern, let's use Zod parse directly for simplicity in serverless
            const body = updateSessionSchema.parse(req.body);

            const { mode, currentStep, profileData, selectedPlanId, comparisonPlanIds } = body;
            const updates: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (mode !== undefined) { params.push(mode); updates.push(`mode = $${paramIndex++}`); }
            if (currentStep !== undefined) { params.push(currentStep); updates.push(`current_step = $${paramIndex++}`); }
            if (profileData !== undefined) { params.push(JSON.stringify(profileData)); updates.push(`profile_data = profile_data || $${paramIndex++}::jsonb`); }
            if (selectedPlanId !== undefined) { params.push(selectedPlanId); updates.push(`selected_plan_id = $${paramIndex++}`); }
            if (comparisonPlanIds !== undefined) { params.push(comparisonPlanIds); updates.push(`comparison_plan_ids = $${paramIndex++}`); }

            params.push(new Date()); updates.push(`last_activity_at = $${paramIndex++}`);
            params.push(id);

            const result = await query(
                `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                params
            );

            return res.json({ session: result.rows[0] });
        } catch (error) {
            logger.error('Update session error', { error });
            return res.status(500).json({ error: 'Failed to update session' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
