import { query } from '../config/database';
import { logger } from '../utils/logger';

interface AnalyticsEvent {
  sessionId?: string;
  userId?: string;
  companyId: string;
  eventType: string;
  eventData: Record<string, any>;
  page?: string;
  step?: number;
  experimentId?: string;
  variant?: string;
}

interface FunnelMetrics {
  step: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

interface PlanPopularity {
  planId: string;
  planName: string;
  selectionCount: number;
  percentage: number;
}

interface ExperimentResult {
  experimentId: string;
  variants: {
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
  }[];
  winner: string | null;
  isSignificant: boolean;
  pValue: number;
}

// Feature flags for A/B testing
interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  variants: {
    name: string;
    weight: number;
    config: Record<string, any>;
  }[];
  targetingRules?: {
    companyIds?: string[];
    userIds?: string[];
    percentage?: number;
  };
}

// In-memory feature flags (in production, store in database/Redis)
const FEATURE_FLAGS: Map<string, FeatureFlag> = new Map([
  ['landing_page_copy', {
    id: 'landing_page_copy',
    name: 'Landing Page Copy Test',
    description: 'Test different headlines on landing page',
    enabled: true,
    variants: [
      { name: 'control', weight: 50, config: { headline: 'Find Your Perfect Health Plan' } },
      { name: 'variant_a', weight: 50, config: { headline: 'Stop Overpaying for Health Insurance' } },
    ],
  }],
  ['question_order', {
    id: 'question_order',
    name: 'Profile Question Order',
    description: 'Test starting with coverage vs usage questions',
    enabled: true,
    variants: [
      { name: 'coverage_first', weight: 50, config: { startWith: 'coverage' } },
      { name: 'usage_first', weight: 50, config: { startWith: 'usage' } },
    ],
  }],
  ['cost_visualization', {
    id: 'cost_visualization',
    name: 'Cost Chart Style',
    description: 'Test bar chart vs pie chart for cost breakdown',
    enabled: false,
    variants: [
      { name: 'bar_chart', weight: 50, config: { chartType: 'bar' } },
      { name: 'pie_chart', weight: 50, config: { chartType: 'pie' } },
    ],
  }],
]);

export class AnalyticsService {
  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await query(
        `INSERT INTO analytics_events 
         (session_id, user_id, company_id, event_type, event_data, page, step, experiment_id, variant)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          event.sessionId || null,
          event.userId || null,
          event.companyId,
          event.eventType,
          JSON.stringify(event.eventData),
          event.page || null,
          event.step || null,
          event.experimentId || null,
          event.variant || null,
        ]
      );
      
      logger.debug('Event tracked', { eventType: event.eventType, sessionId: event.sessionId });
    } catch (error) {
      logger.error('Failed to track event', { error, event });
    }
  }

  /**
   * Track multiple events in batch
   */
  async trackEvents(events: AnalyticsEvent[]): Promise<void> {
    const values = events.map((e, i) => 
      `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`
    ).join(', ');

    const params = events.flatMap(e => [
      e.sessionId || null,
      e.userId || null,
      e.companyId,
      e.eventType,
      JSON.stringify(e.eventData),
      e.page || null,
      e.step || null,
      e.experimentId || null,
      e.variant || null,
    ]);

    await query(
      `INSERT INTO analytics_events 
       (session_id, user_id, company_id, event_type, event_data, page, step, experiment_id, variant)
       VALUES ${values}`,
      params
    );
  }

  /**
   * Get funnel metrics
   */
  async getFunnelMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FunnelMetrics[]> {
    const result = await query<any>(
      `WITH funnel_steps AS (
         SELECT 
           CASE 
             WHEN event_type = 'session_start' THEN 'Started'
             WHEN event_type = 'mode_selected' THEN 'Mode Selected'
             WHEN event_type = 'profile_step_completed' AND step = 1 THEN 'Coverage Selected'
             WHEN event_type = 'profile_completed' THEN 'Profile Completed'
             WHEN event_type = 'plan_selected' THEN 'Plan Selected'
             WHEN event_type = 'enrollment_submitted' THEN 'Enrolled'
           END as step_name,
           COUNT(DISTINCT session_id) as unique_sessions
         FROM analytics_events
         WHERE company_id = $1
           AND created_at >= $2
           AND created_at <= $3
           AND event_type IN ('session_start', 'mode_selected', 'profile_step_completed', 'profile_completed', 'plan_selected', 'enrollment_submitted')
         GROUP BY step_name
       )
       SELECT step_name, unique_sessions
       FROM funnel_steps
       WHERE step_name IS NOT NULL`,
      [companyId, startDate, endDate]
    );

    const steps = ['Started', 'Mode Selected', 'Coverage Selected', 'Profile Completed', 'Plan Selected', 'Enrolled'];
    const metrics: FunnelMetrics[] = [];
    let previousCount = 0;

    for (const stepName of steps) {
      const row = result.rows.find(r => r.step_name === stepName);
      const count = row ? parseInt(row.unique_sessions) : 0;
      
      const conversionRate = previousCount > 0 ? count / previousCount : (stepName === 'Started' ? 1 : 0);
      const dropOffRate = previousCount > 0 ? 1 - conversionRate : 0;
      
      metrics.push({
        step: stepName,
        count,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropOffRate: Math.round(dropOffRate * 100) / 100,
      });
      
      previousCount = count || previousCount;
    }

    return metrics;
  }

  /**
   * Get daily/weekly/monthly active users
   */
  async getActiveUsers(
    companyId: string,
    period: 'day' | 'week' | 'month',
    count: number = 30
  ): Promise<{ date: string; users: number }[]> {
    const interval = period === 'day' ? '1 day' : period === 'week' ? '1 week' : '1 month';
    const dateFormat = period === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

    const result = await query<any>(
      `SELECT 
         TO_CHAR(DATE_TRUNC($2, created_at), $3) as period_date,
         COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) as unique_users
       FROM analytics_events
       WHERE company_id = $1
         AND created_at >= NOW() - ($4 || ' ' || $2)::interval
       GROUP BY DATE_TRUNC($2, created_at)
       ORDER BY DATE_TRUNC($2, created_at)`,
      [companyId, period, dateFormat, count.toString()]
    );

    return result.rows.map(row => ({
      date: row.period_date,
      users: parseInt(row.unique_users),
    }));
  }

  /**
   * Get plan popularity metrics
   */
  async getPlanPopularity(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PlanPopularity[]> {
    const result = await query<any>(
      `SELECT 
         p.id as plan_id,
         p.name as plan_name,
         COUNT(e.id) as selection_count
       FROM analytics_events e
       JOIN plans p ON (e.event_data->>'planId')::uuid = p.id
       WHERE e.company_id = $1
         AND e.event_type = 'plan_selected'
         AND e.created_at >= $2
         AND e.created_at <= $3
       GROUP BY p.id, p.name
       ORDER BY selection_count DESC`,
      [companyId, startDate, endDate]
    );

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.selection_count), 0);

    return result.rows.map(row => ({
      planId: row.plan_id,
      planName: row.plan_name,
      selectionCount: parseInt(row.selection_count),
      percentage: total > 0 ? Math.round((parseInt(row.selection_count) / total) * 100) : 0,
    }));
  }

  /**
   * Get average session duration
   */
  async getAverageSessionDuration(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ averageSeconds: number; medianSeconds: number }> {
    const result = await query<any>(
      `SELECT 
         AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at))) as avg_duration,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (last_activity_at - started_at))) as median_duration
       FROM sessions
       WHERE company_id = $1
         AND started_at >= $2
         AND started_at <= $3
         AND completed_at IS NOT NULL`,
      [companyId, startDate, endDate]
    );

    return {
      averageSeconds: Math.round(parseFloat(result.rows[0]?.avg_duration) || 0),
      medianSeconds: Math.round(parseFloat(result.rows[0]?.median_duration) || 0),
    };
  }

  /**
   * Get feature usage heatmap
   */
  async getFeatureUsage(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ feature: string; usageCount: number; uniqueUsers: number }[]> {
    const result = await query<any>(
      `SELECT 
         event_type as feature,
         COUNT(*) as usage_count,
         COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) as unique_users
       FROM analytics_events
       WHERE company_id = $1
         AND created_at >= $2
         AND created_at <= $3
         AND event_type IN (
           'hsa_calculator_opened',
           'plan_comparison_opened',
           'plan_comparison_added',
           'cost_scenario_toggled',
           'prescription_searched',
           'gap_analysis_viewed',
           'pdf_exported',
           'chat_opened',
           'chat_message_sent'
         )
       GROUP BY event_type
       ORDER BY usage_count DESC`,
      [companyId, startDate, endDate]
    );

    return result.rows.map(row => ({
      feature: row.feature,
      usageCount: parseInt(row.usage_count),
      uniqueUsers: parseInt(row.unique_users),
    }));
  }

  /**
   * Get mode completion rates (Counselor vs Go)
   */
  async getModeCompletionRates(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ mode: string; started: number; completed: number; completionRate: number }[]> {
    const result = await query<any>(
      `SELECT 
         mode,
         COUNT(*) as started,
         COUNT(completed_at) as completed
       FROM sessions
       WHERE company_id = $1
         AND started_at >= $2
         AND started_at <= $3
       GROUP BY mode`,
      [companyId, startDate, endDate]
    );

    return result.rows.map(row => ({
      mode: row.mode,
      started: parseInt(row.started),
      completed: parseInt(row.completed),
      completionRate: parseInt(row.started) > 0 
        ? Math.round((parseInt(row.completed) / parseInt(row.started)) * 100) 
        : 0,
    }));
  }

  // ============ A/B TESTING ============

  /**
   * Get variant assignment for a user/session
   */
  getVariantAssignment(
    experimentId: string,
    userId: string | null,
    sessionId: string
  ): { variant: string; config: Record<string, any> } | null {
    const flag = FEATURE_FLAGS.get(experimentId);
    if (!flag || !flag.enabled) return null;

    // Use consistent hashing for assignment
    const hashInput = userId || sessionId;
    const hash = this.simpleHash(hashInput + experimentId);
    
    // Calculate cumulative weights
    let cumulative = 0;
    const normalizedHash = hash % 100;
    
    for (const variant of flag.variants) {
      cumulative += variant.weight;
      if (normalizedHash < cumulative) {
        return { variant: variant.name, config: variant.config };
      }
    }

    // Fallback to first variant
    return { variant: flag.variants[0].name, config: flag.variants[0].config };
  }

  /**
   * Simple hash function for consistent assignment
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(
    experimentId: string,
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExperimentResult> {
    // Get variant participation
    const participationResult = await query<any>(
      `SELECT 
         variant,
         COUNT(DISTINCT session_id) as participants
       FROM analytics_events
       WHERE company_id = $1
         AND experiment_id = $2
         AND created_at >= $3
         AND created_at <= $4
       GROUP BY variant`,
      [companyId, experimentId, startDate, endDate]
    );

    // Get conversions (plan selections) by variant
    const conversionResult = await query<any>(
      `WITH variant_sessions AS (
         SELECT DISTINCT session_id, variant
         FROM analytics_events
         WHERE company_id = $1
           AND experiment_id = $2
           AND created_at >= $3
           AND created_at <= $4
       )
       SELECT 
         vs.variant,
         COUNT(DISTINCT e.session_id) as conversions
       FROM variant_sessions vs
       JOIN analytics_events e ON vs.session_id = e.session_id
       WHERE e.event_type = 'enrollment_submitted'
       GROUP BY vs.variant`,
      [companyId, experimentId, startDate, endDate]
    );

    const variants = participationResult.rows.map((row: any) => {
      const conversion = conversionResult.rows.find((c: any) => c.variant === row.variant);
      const participants = parseInt(row.participants);
      const conversions = parseInt(conversion?.conversions || 0);
      
      return {
        name: row.variant,
        participants,
        conversions,
        conversionRate: participants > 0 ? Math.round((conversions / participants) * 10000) / 100 : 0,
      };
    });

    // Calculate statistical significance (simplified chi-square test)
    const { winner, isSignificant, pValue } = this.calculateSignificance(variants);

    return {
      experimentId,
      variants,
      winner,
      isSignificant,
      pValue,
    };
  }

  /**
   * Simplified statistical significance calculation
   */
  private calculateSignificance(
    variants: { name: string; participants: number; conversions: number; conversionRate: number }[]
  ): { winner: string | null; isSignificant: boolean; pValue: number } {
    if (variants.length < 2) {
      return { winner: null, isSignificant: false, pValue: 1 };
    }

    // Sort by conversion rate
    const sorted = [...variants].sort((a, b) => b.conversionRate - a.conversionRate);
    const best = sorted[0];
    const second = sorted[1];

    // Calculate pooled proportion
    const totalConversions = best.conversions + second.conversions;
    const totalParticipants = best.participants + second.participants;
    const pooledP = totalParticipants > 0 ? totalConversions / totalParticipants : 0;

    // Calculate standard error
    const se = Math.sqrt(
      pooledP * (1 - pooledP) * (1 / best.participants + 1 / second.participants)
    );

    // Calculate z-score
    const z = se > 0 ? Math.abs(best.conversionRate / 100 - second.conversionRate / 100) / se : 0;

    // Convert to p-value (simplified)
    const pValue = 2 * (1 - this.normalCDF(z));

    return {
      winner: pValue < 0.05 ? best.name : null,
      isSignificant: pValue < 0.05,
      pValue: Math.round(pValue * 1000) / 1000,
    };
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  /**
   * Get all feature flags
   */
  getFeatureFlags(): FeatureFlag[] {
    return Array.from(FEATURE_FLAGS.values());
  }

  /**
   * Update feature flag
   */
  updateFeatureFlag(flagId: string, updates: Partial<FeatureFlag>): FeatureFlag | null {
    const flag = FEATURE_FLAGS.get(flagId);
    if (!flag) return null;

    const updated = { ...flag, ...updates };
    FEATURE_FLAGS.set(flagId, updated);
    
    logger.info('Feature flag updated', { flagId, enabled: updated.enabled });
    return updated;
  }

  /**
   * Track recommendation accuracy (learning loop)
   */
  async trackRecommendationAccuracy(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRecommendations: number;
    bestFitSelected: number;
    goodFitSelected: number;
    notRecommendedSelected: number;
    accuracy: number;
  }> {
    const result = await query<any>(
      `SELECT 
         event_data->>'fitCategory' as fit_category,
         COUNT(*) as count
       FROM analytics_events
       WHERE company_id = $1
         AND event_type = 'plan_selected'
         AND created_at >= $2
         AND created_at <= $3
       GROUP BY event_data->>'fitCategory'`,
      [companyId, startDate, endDate]
    );

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.fit_category] = parseInt(row.count);
    }

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    const bestFit = counts['best'] || 0;
    const goodFit = counts['good'] || 0;
    const notRecommended = counts['not_recommended'] || 0;

    return {
      totalRecommendations: total,
      bestFitSelected: bestFit,
      goodFitSelected: goodFit,
      notRecommendedSelected: notRecommended,
      accuracy: total > 0 ? Math.round(((bestFit + goodFit) / total) * 100) : 0,
    };
  }
}

export const analyticsService = new AnalyticsService();
