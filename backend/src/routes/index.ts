import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { query, transaction } from '../config/database';
import { logger } from '../utils/logger';
import {
  authenticateSession,
  authorize,
  validate,
  authLimiter,
  chatLimiter,
} from '../middleware';
import { clerkAuth, syncUser, clerkOptionalAuth, syncUserOptional } from '../middleware/clerkAuth';
import {
  registerSchema,
  loginSchema,
  createSessionSchema,
  updateSessionSchema,
  userProfileSchema,
  recommendationRequestSchema,
  chatMessageSchema,
  analyticsEventSchema,
  createEnrollmentSchema,
  pdfExportSchema,
  createPlanSchema,
} from '../utils/validation';
import { calculationEngine } from '../services/calculationEngine';
import { audioService } from '../services/audioService';
import { prescriptionService } from '../services/prescriptionService';
import { pdfService } from '../services/pdfService';
import { analyticsService } from '../services/analyticsService';
import { chatbotService } from '../services/chatbotService';

const router = Router();

// ============ HEALTH CHECK ============
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ AUTH ROUTES ============
// Note: Login/Register is now handled by Clerk on the frontend.
// These endpoints are replaced by Clerk's frontend components.

router.get('/auth/me', clerkAuth, syncUser, async (req: Request, res: Response) => {
  try {
    // In a real app, we would fetch the user from our DB using the Clerk ID
    // For now, we'll return the Clerk user info or sync it
    const { userId } = req.auth;
    res.json({ user: { id: userId, role: 'admin' } }); // Mocking admin role for now until we sync roles
  } catch (error) {
    logger.error('Get user error', { error });
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============ COMPANY ROUTES ============
router.get('/companies/:slug', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, slug, logo_url, primary_color, secondary_color, settings
       FROM companies WHERE slug = $1`,
      [req.params.slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company: result.rows[0] });
  } catch (error) {
    logger.error('Get company error', { error });
    res.status(500).json({ error: 'Failed to get company' });
  }
});

// ============ PLANS ROUTES ============
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const { companyId, type, hsaEligible } = req.query;

    let queryStr = 'SELECT * FROM plans WHERE is_active = true';
    const params: any[] = [];

    if (companyId) {
      params.push(companyId);
      queryStr += ` AND company_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      queryStr += ` AND type = $${params.length}`;
    }
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
});

router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM plans WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ plan: result.rows[0] });
  } catch (error) {
    logger.error('Get plan error', { error });
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// ============ SESSION ROUTES ============
router.post('/sessions', validate(createSessionSchema), async (req: Request, res: Response) => {
  try {
    const { companySlug, mode, language, enrollmentType, lifeEventType } = req.body;

    // Find company
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

    // Track analytics event
    await analyticsService.trackEvent({
      sessionId: result.rows[0].id,
      companyId: companyResult.rows[0].id,
      eventType: 'session_start',
      eventData: { mode, language, enrollmentType },
    });

    res.status(201).json({ session: result.rows[0] });
  } catch (error) {
    logger.error('Create session error', { error });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/sessions/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT s.*, p.name as selected_plan_name
       FROM sessions s
       LEFT JOIN plans p ON s.selected_plan_id = p.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session: result.rows[0] });
  } catch (error) {
    logger.error('Get session error', { error });
    res.status(500).json({ error: 'Failed to get session' });
  }
});

router.put('/sessions/:id', authenticateSession, validate(updateSessionSchema), async (req: Request, res: Response) => {
  try {
    const { mode, currentStep, profileData, selectedPlanId, comparisonPlanIds } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (mode !== undefined) {
      params.push(mode);
      updates.push(`mode = $${paramIndex++}`);
    }
    if (currentStep !== undefined) {
      params.push(currentStep);
      updates.push(`current_step = $${paramIndex++}`);
    }
    if (profileData !== undefined) {
      params.push(JSON.stringify(profileData));
      updates.push(`profile_data = profile_data || $${paramIndex++}::jsonb`);
    }
    if (selectedPlanId !== undefined) {
      params.push(selectedPlanId);
      updates.push(`selected_plan_id = $${paramIndex++}`);
    }
    if (comparisonPlanIds !== undefined) {
      params.push(comparisonPlanIds);
      updates.push(`comparison_plan_ids = $${paramIndex++}`);
    }

    params.push(new Date());
    updates.push(`last_activity_at = $${paramIndex++}`);

    params.push(req.params.id);

    const result = await query(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json({ session: result.rows[0] });
  } catch (error) {
    logger.error('Update session error', { error });
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// ============ RECOMMENDATIONS ROUTES ============
router.post('/recommendations', authenticateSession, validate(recommendationRequestSchema), async (req: Request, res: Response) => {
  try {
    console.log('Recommendations Request:', JSON.stringify(req.body, null, 2));
    const { profile } = req.body;

    // Get plans for the session's company
    const plansResult = await query(
      'SELECT * FROM plans WHERE company_id = $1 AND is_active = true',
      [req.session!.companyId]
    );

    // Get prescriptions
    const prescriptionsResult = await query('SELECT * FROM prescriptions');

    // Cast to expected types (database rows match the expected interfaces)
    const plans = plansResult.rows as any[];
    const prescriptions = prescriptionsResult.rows as any[];

    const bundles = calculationEngine.generateBundles(
      profile,
      plans,
      prescriptions
    );

    // Track analytics
    await analyticsService.trackEvent({
      sessionId: req.session!.id,
      companyId: req.session!.companyId,
      eventType: 'recommendations_generated',
      eventData: { bestFitBundle: bundles.bestFitBundle },
    });

    res.json(bundles);
  } catch (error) {
    logger.error('Generate recommendations error', { error });
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// ============ PRESCRIPTIONS ROUTES ============
router.get('/prescriptions/search', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;
    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({ error: 'Search term must be at least 2 characters' });
    }

    const results = await prescriptionService.searchPrescriptions(
      searchTerm,
      req.query.companyId as string
    );

    res.json({ prescriptions: results });
  } catch (error) {
    logger.error('Prescription search error', { error });
    res.status(500).json({ error: 'Failed to search prescriptions' });
  }
});

router.get('/prescriptions/:id/alternatives', async (req: Request, res: Response) => {
  try {
    const alternatives = await prescriptionService.findAlternatives(
      req.params.id,
      req.query.companyId as string
    );
    res.json({ alternatives });
  } catch (error) {
    logger.error('Get alternatives error', { error });
    res.status(500).json({ error: 'Failed to get alternatives' });
  }
});

// ============ AUDIO ROUTES ============
router.get('/audio/step/:step', async (req: Request, res: Response) => {
  try {
    const step = parseInt(req.params.step);
    const language = (req.query.language as 'en' | 'es') || 'en';

    const audio = await audioService.generateStepAudio(step, language);
    res.json(audio);
  } catch (error) {
    logger.error('Generate audio error', { error });
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

// ============ PDF EXPORT ROUTES ============
router.post('/export/pdf', authenticateSession, validate(pdfExportSchema), async (req: Request, res: Response) => {
  try {
    const pdfBuffer = await pdfService.generateSummaryPdf(req.body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="benefits-summary.pdf"');
    res.send(pdfBuffer);

    // Track analytics
    await analyticsService.trackEvent({
      sessionId: req.session!.id,
      companyId: req.session!.companyId,
      eventType: 'pdf_exported',
      eventData: {},
    });
  } catch (error) {
    logger.error('PDF export error', { error });
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ============ CHAT ROUTES ============
router.post('/chat', chatLimiter, authenticateSession, validate(chatMessageSchema), async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;

    const response = await chatbotService.processMessage(message, {
      sessionId: req.session!.id,
      ...context,
    });

    // Track analytics
    await analyticsService.trackEvent({
      sessionId: req.session!.id,
      companyId: req.session!.companyId,
      eventType: 'chat_message_sent',
      eventData: { needsEscalation: response.needsEscalation },
    });

    res.json(response);
  } catch (error) {
    logger.error('Chat error', { error });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// ============ ANALYTICS ROUTES ============
router.post('/analytics/events', validate(analyticsEventSchema), async (req: Request, res: Response) => {
  try {
    await analyticsService.trackEvent({
      ...req.body,
      companyId: req.body.companyId || req.session?.companyId,
    });
    res.status(201).json({ success: true });
  } catch (error) {
    logger.error('Track event error', { error });
    res.status(500).json({ error: 'Failed to track event' });
  }
});

router.get('/analytics/funnel', clerkAuth, syncUser, async (req: Request, res: Response) => {
  try {
    const startDate = new Date(req.query.startDate as string || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(req.query.endDate as string || Date.now());

    const metrics = await analyticsService.getFunnelMetrics(req.user!.companyId, startDate, endDate);
    res.json({ funnel: metrics });
  } catch (error) {
    logger.error('Get funnel metrics error', { error });
    res.status(500).json({ error: 'Failed to get funnel metrics' });
  }
});

router.get('/analytics/experiments/:id', clerkAuth, syncUser, async (req: Request, res: Response) => {
  try {
    const startDate = new Date(req.query.startDate as string || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(req.query.endDate as string || Date.now());

    const results = await analyticsService.getExperimentResults(
      req.params.id,
      req.user!.companyId,
      startDate,
      endDate
    );
    res.json(results);
  } catch (error) {
    logger.error('Get experiment results error', { error });
    res.status(500).json({ error: 'Failed to get experiment results' });
  }
});

router.get('/analytics/feature-flags', clerkOptionalAuth, syncUserOptional, async (req: Request, res: Response) => {
  try {
    const flags = analyticsService.getFeatureFlags();

    // For non-admins, only return enabled flags with their assigned variant
    if (!req.user || req.user.role !== 'admin') {
      const sessionId = req.query.sessionId as string || uuidv4();
      const assignments = flags
        .filter(f => f.enabled)
        .map(f => ({
          id: f.id,
          ...analyticsService.getVariantAssignment(f.id, req.user?.id || null, sessionId),
        }));
      return res.json({ flags: assignments });
    }

    res.json({ flags });
  } catch (error) {
    logger.error('Get feature flags error', { error });
    res.status(500).json({ error: 'Failed to get feature flags' });
  }
});

// ============ ENROLLMENT ROUTES ============
router.post('/enrollments', authenticateSession, validate(createEnrollmentSchema), async (req: Request, res: Response) => {
  try {
    const enrollment = req.body;

    const result = await query(
      `INSERT INTO enrollments (
        user_id, session_id, plan_id, enrollment_type, life_event_type,
        effective_date, coverage_type, dependents, voluntary_benefits, hsa_contribution_annual, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *`,
      [
        req.user?.id || null,
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

    // Update session
    await query(
      'UPDATE sessions SET selected_plan_id = $1, completed_at = NOW() WHERE id = $2',
      [enrollment.planId, enrollment.sessionId]
    );

    // Track analytics
    await analyticsService.trackEvent({
      sessionId: enrollment.sessionId,
      companyId: req.session!.companyId,
      eventType: 'enrollment_submitted',
      eventData: { planId: enrollment.planId, coverageType: enrollment.coverageType },
    });

    res.status(201).json({ enrollment: result.rows[0] });
  } catch (error) {
    logger.error('Create enrollment error', { error });
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

// ============ ADMIN ROUTES ============
router.post('/admin/plans', clerkAuth, syncUser, validate(createPlanSchema), async (req: Request, res: Response) => {
  try {
    const plan = req.body;

    const result = await query(
      `INSERT INTO plans (
        company_id, name, type, network, description, highlights, warnings,
        premiums, deductibles, oop_max, copays, coinsurance,
        hsa_eligible, hsa_employer_contribution, fsa_eligible, fsa_employer_contribution, rx_tiers, requires_referral, requires_pcp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        req.user!.companyId,
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
});

router.get('/admin/dashboard', clerkAuth, syncUser, async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [activeUsers, funnel, modeCompletion, planPopularity] = await Promise.all([
      analyticsService.getActiveUsers(companyId, 'day', 30),
      analyticsService.getFunnelMetrics(companyId, thirtyDaysAgo, now),
      analyticsService.getModeCompletionRates(companyId, thirtyDaysAgo, now),
      analyticsService.getPlanPopularity(companyId, thirtyDaysAgo, now),
    ]);

    res.json({
      activeUsers,
      funnel,
      modeCompletion,
      planPopularity,
    });
  } catch (error) {
    logger.error('Get admin dashboard error', { error });
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

router.get('/admin/employees', clerkAuth, syncUser, async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    // Fetch users and their latest enrollment
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
      [companyId]
    );

    res.json({ employees: result.rows });
  } catch (error) {
    logger.error('Get employees error', { error });
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

export default router;
