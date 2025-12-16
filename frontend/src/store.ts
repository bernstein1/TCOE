import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Dependent {
  relationship: 'spouse' | 'child' | 'domestic_partner';
  age: number;
  name?: string;
}

export interface Prescription {
  id: string;
  name: string;
  quantity: number;
  isSpouse?: boolean;
}

export interface UserProfile {
  coverageType: 'employee' | 'employee_spouse' | 'employee_children' | 'family';
  dependents: Dependent[];
  healthStatus: 'excellent' | 'good' | 'fair' | 'managing_conditions';
  pcpVisits: 'rarely' | 'occasionally' | 'regularly' | 'frequently';
  specialistVisits: 'none' | '1-2' | '3-5' | '6+';
  erUrgentCare: 'none' | '1' | '2+';
  plannedProcedures: string[];
  prescriptions: Prescription[];
  riskTolerance: 'predictable' | 'balanced' | 'saver';
  maxSurpriseBill: number;
  householdIncome: string;
  liquidityCheck?: boolean;
  complexityTolerance?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  type: string;
  network: string;
  premiums: Record<string, number>;
  deductibles: Record<string, number>;
  oop_max: Record<string, number>;
  copays: Record<string, number>;
  coinsurance: number;
  hsa_eligible: boolean;
  hsa_employer_contribution: Record<string, number>;
  fsa_eligible?: boolean;
  fsa_employer_contribution?: Record<string, number>;
  rx_tiers: Record<string, number>;
  highlights: string[];
  warnings: string[];
}

export interface CostBreakdown {
  premium: number;
  deductible: number;
  copays: number;
  prescriptions: number;
  total: number;
  hsaSavings: number;
  hsaEmployerContribution: number;
  fsaEmployerContribution?: number;
  netCost: number;
}

export interface BundleRecommendation {
  id: string;
  title: string;
  description: string;
  plan: Plan;
  accountType: 'HSA' | 'FSA' | 'None';
  contribution: number;
  costBreakdown: CostBreakdown;
  reasons: string[];
}

export interface BundleResponse {
  bundles: {
    futureBuilder?: BundleRecommendation;
    safetyNet?: BundleRecommendation;
    leanAndMean?: BundleRecommendation;
    peaceOfMind?: BundleRecommendation;
  };
  bestFitBundle: 'futureBuilder' | 'safetyNet' | 'leanAndMean' | 'peaceOfMind';
}

interface AppState {
  // Session
  sessionId: string | null;
  sessionToken: string | null;
  companySlug: string;
  theme: 'light' | 'dark';

  // Mode and progress
  mode: 'counselor' | 'go';
  currentStep: number;
  language: 'en' | 'es';
  enrollmentType: 'open_enrollment' | 'new_hire' | 'life_event';

  // Profile
  profile: Partial<UserProfile>;

  // Plans and recommendations
  plans: Plan[];
  bundles: BundleResponse | null;
  selectedBundleId: string | null;
  comparisonPlanIds: string[];

  // UI state
  isLoading: boolean;
  error: string | null;
  isChatOpen: boolean;
  costScenario: 'typical' | 'worst';

  // Actions
  setSession: (sessionId: string, sessionToken: string) => void;
  setCompanySlug: (slug: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setMode: (mode: 'counselor' | 'go') => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setLanguage: (language: 'en' | 'es') => void;
  setEnrollmentType: (type: 'open_enrollment' | 'new_hire' | 'life_event') => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setPlans: (plans: Plan[]) => void;
  setBundles: (bundles: BundleResponse) => void;
  selectBundle: (bundleId: string) => void;
  toggleComparison: (planId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  toggleChat: () => void;
  setCostScenario: (scenario: 'typical' | 'worst') => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  sessionToken: null,
  companySlug: 'acme',
  theme: 'dark' as const,
  mode: 'go' as const,
  currentStep: 1,
  language: 'en' as const,
  enrollmentType: 'open_enrollment' as const,
  profile: {},
  plans: [],
  bundles: null,
  selectedBundleId: null,
  comparisonPlanIds: [],
  isLoading: false,
  error: null,
  isChatOpen: false,
  costScenario: 'typical' as const,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setSession: (sessionId, sessionToken) => set({ sessionId, sessionToken }),

      setCompanySlug: (slug) => set({ companySlug: slug }),

      setTheme: (theme) => set({ theme }),

      setMode: (mode) => set({ mode }),

      setStep: (step) => set({ currentStep: step }),

      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),

      prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

      setLanguage: (language) => set({ language }),

      setEnrollmentType: (enrollmentType) => set({ enrollmentType }),

      updateProfile: (updates) => set((state) => ({
        profile: { ...state.profile, ...updates },
      })),

      setPlans: (plans) => set({ plans }),

      setBundles: (bundles) => set({ bundles }),

      selectBundle: (bundleId) => set({ selectedBundleId: bundleId }),

      toggleComparison: (planId) => set((state) => {
        const ids = state.comparisonPlanIds;
        if (ids.includes(planId)) {
          return { comparisonPlanIds: ids.filter((id) => id !== planId) };
        }
        if (ids.length >= 3) return state; // Max 3 plans
        return { comparisonPlanIds: [...ids, planId] };
      }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

      setCostScenario: (costScenario) => set({ costScenario }),

      reset: () => set(initialState),
    }),
    {
      name: 'touchcare-benefits',
      partialize: (state) => ({
        sessionId: state.sessionId,
        sessionToken: state.sessionToken,
        companySlug: state.companySlug,
        theme: state.theme,
        mode: state.mode,
        language: state.language,
        profile: state.profile,
      }),
    }
  )
);
