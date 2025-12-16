import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chatbotService } from '../../src/services/chatbotService';
import { analyticsService } from '../../src/services/analyticsService';
import { logger } from '../../src/utils/logger';
import { authenticateSession } from '../../src/middleware';
import { withRateLimit } from '../../middleware/rateLimiter';

const runMiddleware = (req: any, res: any, fn: Function) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    return withRateLimit(req, res, async (req, res) => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        try {
            await runMiddleware(req, res, authenticateSession);

            const { message, context } = req.body;
            const session = (req as any).session;

            if (!session) {
                return res.status(401).json({ error: 'No session' });
            }

            const response = await chatbotService.processMessage(message, {
                sessionId: session.id,
                ...context,
            });

            await analyticsService.trackEvent({
                sessionId: session.id,
                companyId: session.companyId,
                eventType: 'chat_message_sent',
                eventData: { needsEscalation: response.needsEscalation },
            });

            res.json(response);
        } catch (error) {
            logger.error('Chat error', { error });
            res.status(500).json({ error: 'Failed to process message' });
        }
    });
}
