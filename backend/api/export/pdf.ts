import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pdfService } from '../../src/services/pdfService';
import { analyticsService } from '../../src/services/analyticsService';
import { logger } from '../../src/utils/logger';
import { authenticateSession, validate } from '../../src/middleware';
import { pdfExportSchema } from '../../src/utils/validation';

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
        const body = pdfExportSchema.parse(req.body);
        const session = (req as any).session;

        const pdfBuffer = await pdfService.generateSummaryPdf(body);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="benefits-summary.pdf"');
        res.send(pdfBuffer);

        await analyticsService.trackEvent({
            sessionId: session.id,
            companyId: session.companyId,
            eventType: 'pdf_exported',
            eventData: {},
        });
    } catch (error) {
        logger.error('PDF export error', { error });
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
}
