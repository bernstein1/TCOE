import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from '../../src/utils/logger';
import { clerkAuth, syncUser } from '../../src/middleware/clerkAuth';
import { createPlanSchema } from '../../src/utils/validation';
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
        await runMiddleware(req, res, clerkAuth);
        await runMiddleware(req, res, syncUser);
        const user = (req as any).user;

        const plan = createPlanSchema.parse(req.body);

        const result = await query(
            `INSERT INTO plans (
        company_id, name, type, network, description, highlights, warnings,
        premiums, deductibles, oop_max, copays, coinsurance,
        hsa_eligible, hsa_employer_contribution, fsa_eligible, fsa_employer_contribution, rx_tiers, requires_referral, requires_pcp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
            [
                user.companyId,
                plan.name,
                plan.type,
                plan.network,
                plan.description,
                plan.highlights,
                plan.warnings,
                JSON.stringify(plan.premiums),
                JSON.stringify(plan.deductibles),
                JSON.stringify(plan.oopMax),
                JSON.stringify(plan.copays),
                plan.coinsurance,
                plan.hsaEligible,
                JSON.stringify(plan.hsaEmployerContribution),
                plan.fsaEligible,
                JSON.stringify(plan.fsaEmployerContribution),
                JSON.stringify(plan.rxTiers),
                plan.requiresReferral,
                plan.requiresPcp,
            ]
        );

        res.status(201).json({ plan: result.rows[0] });
    } catch (error) {
        logger.error('Create plan error', { error });
        res.status(500).json({ error: 'Failed to create plan' });
    }
}
