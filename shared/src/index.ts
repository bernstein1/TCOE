// ============ User & Auth Types ============

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
  role: 'admin' | 'employee';
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  companyId: string;
  role: string;
  exp: number;
}

// ============ Company Types ============

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  settings: CompanySettings;
  createdAt: Date;
}

export interface CompanySettings {
  enrollmentStartDate?: string;
  enrollmentEndDate?: string;
  allowLifeEventChanges: boolean;
  enableCounselorMode: boolean;
  enableGoMode: boolean;
  defaultLanguage: 'en' | 'es';
  supportedLanguages: string[];
}

// ============ Plan Types ============

export interface Plan {
  id: string;
  companyId: string;
  name: string;
  type: 'HDHP' | 'PPO' | 'HMO' | 'EPO';
  network: string;
  description?: string;
  highlights: string[];
  warnings: string[];
  premiums: PremiumTiers;
  deductibles: DeductibleTiers;
  oopMax: OopMaxTiers;
  copays: Copays;
  coinsurance: number;
  hsaEligible: boolean;
  hsaEmployerContribution?: HsaContribution;
  rxTiers: RxTiers;
  requiresReferral: boolean;
  requiresPcp: boolean;
  isActive: boolean;
  planYear: number;
}

export interface PremiumTiers {
  employee: number;
  employeeSpouse: number;
  employeeChildren: number;
  family: number;
}

export interface DeductibleTiers {
  individual: number;
  family: number;
}

export interface OopMaxTiers {
  individual: number;
  family: number;
}

export interface Copays {
  pcp: number;
  specialist: number;
  urgentCare: number;
  er: number;
}

export interface HsaContribution {
  employee: number;
  family: number;
}

export interface RxTiers {
  generic: number;
  preferred: number;
  nonPreferred: number;
  specialty: number;
}

// ============ Profile Types ============

export type CoverageType = 'employee' | 'employee_spouse' | 'employee_children' | 'family';
export type VisitFrequency = 'none' | '1-2' | '3-5' | '6+' | 'rarely' | 'occasionally' | 'regularly' | 'frequently';
export type ErFrequency = 'none' | '1' | '2+';
export type RiskTolerance = 'avoid_surprises' | 'balanced' | 'minimize_premium' | 'predictable' | 'saver';
export type HealthStatus = 'excellent' | 'good' | 'fair' | 'managing_conditions';

export interface Dependent {
  relationship: 'spouse' | 'child' | 'domestic_partner';
  age: number;
  name?: string;
}

export interface ProfilePrescription {
  id: string;
  name: string;
  quantity: number;
  isSpouse?: boolean;
}

export interface UserProfile {
  coverageType: CoverageType;
  dependents: Dependent[];
  healthStatus: HealthStatus;
  pcpVisits: VisitFrequency;
  specialistVisits: VisitFrequency;
  erUrgentCare: ErFrequency;
  plannedProcedures: string[];
  prescriptions: ProfilePrescription[];
  riskTolerance: RiskTolerance;
  maxSurpriseBill: number;
  householdIncome: string;
}

// ============ Session Types ============

export type SessionMode = 'counselor' | 'go';
export type EnrollmentType = 'open_enrollment' | 'new_hire' | 'life_event';
export type LifeEventType = 'marriage' | 'birth' | 'divorce' | 'loss_of_coverage' | 'other';

export interface Session {
  id: string;
  companyId: string;
  userId?: string;
  sessionToken: string;
  mode: SessionMode;
  currentStep: number;
  profileData: Partial<UserProfile>;
  selectedPlanId?: string;
  comparisonPlanIds: string[];
  isCollaborative: boolean;
  spouseSessionId?: string;
  spouseProfileData?: Partial<UserProfile>;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

// ============ Recommendation Types ============

export interface CostBreakdown {
  premium: number;
  deductible: number;
  copays: number;
  prescriptions: number;
  total: number;
  hsaSavings: number;
  hsaEmployerContribution: number;
  netCost: number;
}

export interface Recommendation {
  planId: string;
  plan: Plan;
  typicalYear: CostBreakdown;
  worstCase: CostBreakdown;
  weightedScore: number;
  fitCategory: 'best' | 'good' | 'not_recommended';
  financialRiskWarning: boolean;
  reasonsFor: string[];
  reasonsAgainst: string[];
}

export interface GapAnalysis {
  voluntaryBenefits: VoluntaryBenefitRecommendation[];
  hsaRecommendation?: HsaRecommendation;
}

export interface VoluntaryBenefitRecommendation {
  type: string;
  name: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  monthlyRange: { min: number; max: number };
}

export interface HsaRecommendation {
  recommendedContribution: number;
  maxContribution: number;
  employerContribution: number;
  projectedTaxSavings: number;
  coverageShortfall: number;
}

// ============ Prescription Types ============

export interface Prescription {
  id: string;
  name: string;
  genericName?: string;
  brandNames: string[];
  drugClass?: string;
  defaultTier: 'generic' | 'preferred' | 'non_preferred' | 'specialty';
  avgMonthlyCost?: number;
  avg90DayCost?: number;
  requiresPriorAuth: boolean;
  rxnormId?: string;
  ndcCodes: string[];
}

export interface DrugInfo {
  id: string;
  name: string;
  genericName?: string;
  brandNames: string[];
  drugClass?: string;
  tier: string;
  avgMonthlyCost?: number;
  avg90DayCost?: number;
  requiresPriorAuth: boolean;
  hasGeneric: boolean;
  isSpecialty: boolean;
  rxnormId?: string;
  therapeuticAlternatives: string[];
}

// ============ Enrollment Types ============

export type EnrollmentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Enrollment {
  id: string;
  userId?: string;
  sessionId: string;
  planId: string;
  enrollmentType: EnrollmentType;
  lifeEventType?: LifeEventType;
  effectiveDate?: Date;
  coverageType: CoverageType;
  dependents: Dependent[];
  voluntaryBenefits: string[];
  hsaContributionAnnual?: number;
  status: EnrollmentStatus;
  decisionJourney?: DecisionJourneyEvent[];
  submittedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecisionJourneyEvent {
  timestamp: Date;
  action: string;
  data?: Record<string, any>;
}

// ============ Analytics Types ============

export interface AnalyticsEvent {
  id?: string;
  sessionId?: string;
  userId?: string;
  companyId?: string;
  eventType: string;
  eventData: Record<string, any>;
  page?: string;
  step?: number;
  experimentId?: string;
  variant?: string;
  createdAt?: Date;
}

export interface FunnelStep {
  step: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  variants: FeatureVariant[];
  targetingRules?: TargetingRules;
}

export interface FeatureVariant {
  name: string;
  weight: number;
  config?: Record<string, any>;
}

export interface TargetingRules {
  companyIds?: string[];
  userIds?: string[];
  percentage?: number;
}

// ============ Chat Types ============

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  suggestedQuestions?: string[];
  needsEscalation?: boolean;
  escalationReason?: string;
  sources?: { title: string; excerpt: string }[];
}

export interface ChatContext {
  sessionId: string;
  currentStep?: number;
  selectedPlanId?: string;
  comparisonPlanIds?: string[];
  profileData?: Partial<UserProfile>;
  companyId?: string;
}

// ============ Audio Types ============

export interface AudioContent {
  narration?: {
    text: string;
    audioUrl: string;
    duration: number;
  };
  question?: {
    text: string;
    audioUrl: string;
    duration: number;
  };
}

// ============ API Response Types ============

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
