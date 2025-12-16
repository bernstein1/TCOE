import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companySlug: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companySlug: z.string().min(1),
});

// Profile schemas
export const coverageTypeSchema = z.enum(['employee', 'employee_spouse', 'employee_children', 'family']);
export const usageFrequencySchema = z.enum(['none', '1-2', '3-5', '6+', 'rarely', 'occasionally', 'regularly', 'frequently']);
export const healthStatusSchema = z.enum(['excellent', 'good', 'fair', 'managing_conditions']);
export const riskToleranceSchema = z.enum(['avoid_surprises', 'balanced', 'minimize_premium', 'predictable', 'saver']);
export const incomeRangeSchema = z.enum(['under_50k', '50k_75k', '75k_100k', '100k_150k', '150k_200k', 'over_200k']);

export const dependentSchema = z.object({
  relationship: z.enum(['spouse', 'child', 'domestic_partner']),
  age: z.number().min(0).max(120),
  name: z.string().optional(),
});

export const prescriptionSelectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  quantity: z.number().default(1),
  isSpouse: z.boolean().default(false),
});

export const userProfileSchema = z.object({
  coverageType: coverageTypeSchema,
  dependents: z.array(dependentSchema).default([]),
  healthStatus: healthStatusSchema.optional(),
  pcpVisits: usageFrequencySchema,
  specialistVisits: usageFrequencySchema.optional(),
  erUrgentCare: z.enum(['none', '1', '2+']).optional(),
  plannedProcedures: z.array(z.string()).default([]),
  prescriptions: z.array(prescriptionSelectionSchema).default([]),
  riskTolerance: riskToleranceSchema,
  maxSurpriseBill: z.number().min(0).max(50000),
  householdIncome: incomeRangeSchema,
  liquidityCheck: z.boolean().optional(),
  complexityTolerance: z.boolean().optional(),
});

// Session schemas
export const createSessionSchema = z.object({
  companySlug: z.string().min(1),
  mode: z.enum(['counselor', 'go']).default('go'),
  language: z.enum(['en', 'es']).default('en'),
  enrollmentType: z.enum(['open_enrollment', 'new_hire', 'life_event']).default('open_enrollment'),
  lifeEventType: z.string().optional(),
});

export const updateSessionSchema = z.object({
  mode: z.enum(['counselor', 'go']).optional(),
  currentStep: z.number().min(0).optional(),
  profileData: userProfileSchema.partial().optional(),
  selectedPlanId: z.string().uuid().nullable().optional(),
  comparisonPlanIds: z.array(z.string().uuid()).max(3).optional(),
});

// Plan query schemas
export const planQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  type: z.enum(['HDHP', 'PPO', 'HMO', 'EPO']).optional(),
  hsaEligible: z.coerce.boolean().optional(),
});

// Recommendation request schema
export const recommendationRequestSchema = z.object({
  profile: userProfileSchema,
});

// Chat message schema
export const chatMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  context: z.object({
    currentStep: z.number().optional(),
    selectedPlanId: z.string().uuid().optional(),
    comparisonPlanIds: z.array(z.string().uuid()).optional(),
  }).optional(),
});

// Analytics event schema
export const analyticsEventSchema = z.object({
  sessionId: z.string().uuid().optional(),
  eventType: z.string().min(1).max(100),
  eventData: z.record(z.any()).default({}),
  page: z.string().optional(),
  step: z.number().optional(),
  experimentId: z.string().optional(),
  variant: z.string().optional(),
});

// Enrollment schema
export const createEnrollmentSchema = z.object({
  sessionId: z.string().uuid(),
  planId: z.string().uuid(),
  enrollmentType: z.enum(['open_enrollment', 'new_hire', 'life_event']),
  lifeEventType: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
  coverageType: coverageTypeSchema,
  dependents: z.array(dependentSchema).default([]),
  voluntaryBenefits: z.array(z.string().uuid()).default([]),
  hsaContributionAnnual: z.number().min(0).optional(),
});

// PDF export schema
export const pdfExportSchema = z.object({
  sessionId: z.string().uuid(),
  includeComparison: z.boolean().default(true),
  includeGapAnalysis: z.boolean().default(true),
  includeHsaProjection: z.boolean().default(true),
});

// Admin schemas
export const createPlanSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['HDHP', 'PPO', 'HMO', 'EPO']),
  network: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  premiums: z.record(z.number()),
  deductibles: z.record(z.number()),
  oopMax: z.record(z.number()),
  copays: z.record(z.number()).default({}),
  coinsurance: z.number().min(0).max(100).default(20),
  hsaEligible: z.boolean().default(false),
  hsaEmployerContribution: z.record(z.number()).default({}),
  fsaEligible: z.boolean().default(false),
  fsaEmployerContribution: z.record(z.number()).default({}),
  rxTiers: z.record(z.number()).default({}),
  requiresReferral: z.boolean().default(false),
  requiresPcp: z.boolean().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type CreateSession = z.infer<typeof createSessionSchema>;
export type UpdateSession = z.infer<typeof updateSessionSchema>;
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type CreateEnrollment = z.infer<typeof createEnrollmentSchema>;
export type CreatePlan = z.infer<typeof createPlanSchema>;
