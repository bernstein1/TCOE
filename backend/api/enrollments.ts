import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyticsService } from '../../src/services/analyticsService';
import { logger } from '../../src/utils/logger';
import { authenticateSession, validate } from '../../src/middleware';
import { createEnrollmentSchema } from '../../src/utils/validation';
import { query } from '../../src/config/database';

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
        const session = (req as any).session;
        const user = (req as any).user; // May be null if only session

        const enrollment = createEnrollmentSchema.parse(req.body);

        const result = await query(
            `INSERT INTO enrollments (
        user_id, session_id, plan_id, enrollment_type, life_event_type,
        effective_date, coverage_type, dependents, voluntary_benefits, hsa_contribution_annual, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *`,
            [
                user?.id || null,
                enrollment.sessionId,
                enrollment.planId,
                enrollment.enrollmentType,
                enrollment.lifeEventType || null,
                enrollment.effectiveDate || null,
                enrollment.coverageType,
                JSON.stringify(enrollment.dependents),
                enrollment.voluntaryBenefits,
                enrollment.hsaContributionAnnual || null,
            ]
        );

        await query(
            'UPDATE sessions SET selected_plan_id = $1, completed_at = NOW() WHERE id = $2',
            [enrollment.planId, enrollment.sessionId]
        );

        await analyticsService.trackEvent({
            sessionId: enrollment.sessionId,
            companyId: session.companyId,
            eventType: 'enrollment_submitted',
            eventData: { planId: enrollment.planId, coverageType: enrollment.coverageType },
        });

        res.status(201).json({ enrollment: result.rows[0] });
    } catch (error) {
        logger.error('Create enrollment error', { error });
        res.status(500).json({ error: 'Failed to create enrollment' });
    }
}
