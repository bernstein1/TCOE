import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from '../../src/utils/logger';
import { clerkAuth, syncUser } from '../../src/middleware/clerkAuth';
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
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await runMiddleware(req, res, clerkAuth);
        await runMiddleware(req, res, syncUser);
        const user = (req as any).user;

        const result = await query(
            `SELECT 
        u.id, u.first_name || ' ' || u.last_name as name, u.email,
        e.status as enrollment_status,
        p.name as selected_plan,
        GREATEST(u.last_login_at, e.created_at) as last_activity
       FROM users u
       LEFT JOIN enrollments e ON u.id = e.user_id AND e.id = (
         SELECT id FROM enrollments WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
       )
       LEFT JOIN plans p ON e.plan_id = p.id
       WHERE u.company_id = $1 AND u.role != 'admin'
       ORDER BY u.last_name ASC`,
            [user.companyId]
        );

        res.json({ employees: result.rows });
    } catch (error) {
        logger.error('Get employees error', { error });
        res.status(500).json({ error: 'Failed to get employees' });
    }
}
