import type { VercelRequest, VercelResponse } from '@vercel/node';
import { audioService } from '../../../src/services/audioService';
import { logger } from '../../../src/utils/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { step } = req.query;
        const language = (req.query.language as 'en' | 'es') || 'en';

        const audio = await audioService.generateStepAudio(parseInt(step as string), language);
        res.json(audio);
    } catch (error) {
        logger.error('Generate audio error', { error });
        res.status(500).json({ error: 'Failed to generate audio' });
    }
}
