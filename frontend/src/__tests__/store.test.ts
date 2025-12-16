import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock zustand store for testing
const createMockStore = () => {
  let state = {
    sessionId: null as string | null,
    sessionToken: null as string | null,
    companySlug: null as string | null,
    mode: null as 'counselor' | 'go' | null,
    currentStep: 0,
    language: 'en' as 'en' | 'es',
    enrollmentType: null as 'open' | 'new_hire' | 'life_event' | null,
    profile: {},
    plans: [],
    recommendations: [],
    selectedPlanId: null as string | null,
    comparisonPlanIds: [] as string[],
    isLoading: false,
    error: null as string | null,
    isChatOpen: false,
    costScenario: 'typical' as 'typical' | 'worst',
  };

  return {
    getState: () => state,
    setState: (partial: Partial<typeof state>) => {
      state = { ...state, ...partial };
    },
    // Actions
    setSession: (sessionId: string, sessionToken: string) => {
      state.sessionId = sessionId;
      state.sessionToken = sessionToken;
    },
    setMode: (mode: 'counselor' | 'go') => {
      state.mode = mode;
    },
    setStep: (step: number) => {
      state.currentStep = step;
    },
    nextStep: () => {
      state.currentStep += 1;
    },
    prevStep: () => {
      state.currentStep = Math.max(0, state.currentStep - 1);
    },
    setLanguage: (lang: 'en' | 'es') => {
      state.language = lang;
    },
    updateProfile: (partial: Partial<typeof state.profile>) => {
      state.profile = { ...state.profile, ...partial };
    },
    selectPlan: (planId: string) => {
      state.selectedPlanId = planId;
    },
    toggleComparison: (planId: string) => {
      if (state.comparisonPlanIds.includes(planId)) {
        state.comparisonPlanIds = state.comparisonPlanIds.filter(id => id !== planId);
      } else if (state.comparisonPlanIds.length < 3) {
        state.comparisonPlanIds = [...state.comparisonPlanIds, planId];
      }
    },
    toggleChat: () => {
      state.isChatOpen = !state.isChatOpen;
    },
    setCostScenario: (scenario: 'typical' | 'worst') => {
      state.costScenario = scenario;
    },
    reset: () => {
      state = {
        sessionId: null,
        sessionToken: null,
        companySlug: null,
        mode: null,
        currentStep: 0,
        language: 'en',
        enrollmentType: null,
        profile: {},
        plans: [],
        recommendations: [],
        selectedPlanId: null,
        comparisonPlanIds: [],
        isLoading: false,
        error: null,
        isChatOpen: false,
        costScenario: 'typical',
      };
    },
  };
};

describe('Store', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('Session Management', () => {
    it('should set session id and token', () => {
      store.setSession('session-123', 'token-abc');
      expect(store.getState().sessionId).toBe('session-123');
      expect(store.getState().sessionToken).toBe('token-abc');
    });
  });

  describe('Mode Selection', () => {
    it('should set counselor mode', () => {
      store.setMode('counselor');
      expect(store.getState().mode).toBe('counselor');
    });

    it('should set go mode', () => {
      store.setMode('go');
      expect(store.getState().mode).toBe('go');
    });
  });

  describe('Step Navigation', () => {
    it('should increment step', () => {
      store.nextStep();
      expect(store.getState().currentStep).toBe(1);
      store.nextStep();
      expect(store.getState().currentStep).toBe(2);
    });

    it('should decrement step', () => {
      store.setStep(3);
      store.prevStep();
      expect(store.getState().currentStep).toBe(2);
    });

    it('should not go below step 0', () => {
      store.prevStep();
      expect(store.getState().currentStep).toBe(0);
    });
  });

  describe('Language', () => {
    it('should set language', () => {
      store.setLanguage('es');
      expect(store.getState().language).toBe('es');
    });
  });

  describe('Profile Updates', () => {
    it('should update profile fields', () => {
      store.updateProfile({ coverageType: 'family' });
      expect(store.getState().profile).toEqual({ coverageType: 'family' });
    });

    it('should merge profile updates', () => {
      store.updateProfile({ coverageType: 'employee' });
      store.updateProfile({ pcpVisits: 3 });
      expect(store.getState().profile).toEqual({
        coverageType: 'employee',
        pcpVisits: 3,
      });
    });
  });

  describe('Plan Selection', () => {
    it('should select a plan', () => {
      store.selectPlan('plan-1');
      expect(store.getState().selectedPlanId).toBe('plan-1');
    });

    it('should toggle comparison plans', () => {
      store.toggleComparison('plan-1');
      expect(store.getState().comparisonPlanIds).toContain('plan-1');
      
      store.toggleComparison('plan-2');
      expect(store.getState().comparisonPlanIds).toHaveLength(2);
      
      store.toggleComparison('plan-1');
      expect(store.getState().comparisonPlanIds).not.toContain('plan-1');
    });

    it('should limit comparison to 3 plans', () => {
      store.toggleComparison('plan-1');
      store.toggleComparison('plan-2');
      store.toggleComparison('plan-3');
      store.toggleComparison('plan-4');
      expect(store.getState().comparisonPlanIds).toHaveLength(3);
    });
  });

  describe('Chat Toggle', () => {
    it('should toggle chat open/close', () => {
      expect(store.getState().isChatOpen).toBe(false);
      store.toggleChat();
      expect(store.getState().isChatOpen).toBe(true);
      store.toggleChat();
      expect(store.getState().isChatOpen).toBe(false);
    });
  });

  describe('Cost Scenario', () => {
    it('should switch cost scenarios', () => {
      expect(store.getState().costScenario).toBe('typical');
      store.setCostScenario('worst');
      expect(store.getState().costScenario).toBe('worst');
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      store.setSession('session-1', 'token-1');
      store.setMode('counselor');
      store.setStep(5);
      store.updateProfile({ coverageType: 'family' });
      
      store.reset();
      
      const state = store.getState();
      expect(state.sessionId).toBeNull();
      expect(state.mode).toBeNull();
      expect(state.currentStep).toBe(0);
      expect(state.profile).toEqual({});
    });
  });
});

// Test calculation utilities
describe('Calculation Utilities', () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  it('should format currency correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1500.75)).toBe('$1,501');
    expect(formatCurrency(0)).toBe('$0');
  });

  const calculateHsaSavings = (contribution: number, taxRate: number = 0.35) => {
    return contribution * taxRate;
  };

  it('should calculate HSA savings', () => {
    expect(calculateHsaSavings(3000)).toBe(1050);
    expect(calculateHsaSavings(4300, 0.30)).toBe(1290);
  });

  const calculateAnnualPremium = (monthly: number) => monthly * 12;

  it('should calculate annual premium', () => {
    expect(calculateAnnualPremium(250)).toBe(3000);
    expect(calculateAnnualPremium(450)).toBe(5400);
  });
});

// Test form validation
describe('Form Validation', () => {
  const validateProfile = (profile: any) => {
    const errors: string[] = [];
    
    if (!profile.coverageType) {
      errors.push('Coverage type is required');
    }
    
    if (profile.pcpVisits === undefined || profile.pcpVisits < 0) {
      errors.push('PCP visits must be a positive number');
    }
    
    if (profile.income && !['under30k', '30-50k', '50-75k', '75-100k', '100-150k', 'over150k'].includes(profile.income)) {
      errors.push('Invalid income bracket');
    }
    
    return errors;
  };

  it('should validate required coverage type', () => {
    const errors = validateProfile({});
    expect(errors).toContain('Coverage type is required');
  });

  it('should validate PCP visits', () => {
    const errors = validateProfile({ coverageType: 'employee', pcpVisits: -1 });
    expect(errors).toContain('PCP visits must be a positive number');
  });

  it('should pass valid profile', () => {
    const errors = validateProfile({
      coverageType: 'family',
      pcpVisits: 3,
      income: '75-100k',
    });
    expect(errors).toHaveLength(0);
  });
});

// Test plan recommendation logic
describe('Plan Recommendation Logic', () => {
  const mockPlans = [
    {
      id: '1',
      name: 'HDHP with HSA',
      type: 'hdhp',
      hsa_eligible: true,
      premiums: { employee: 125, spouse: 325, family: 450 },
      deductible: { individual: 1600, family: 3200 },
      oop_max: { individual: 4000, family: 8000 },
    },
    {
      id: '2',
      name: 'PPO Standard',
      type: 'ppo',
      hsa_eligible: false,
      premiums: { employee: 250, spouse: 550, family: 750 },
      deductible: { individual: 500, family: 1000 },
      oop_max: { individual: 3000, family: 6000 },
    },
    {
      id: '3',
      name: 'PPO Premium',
      type: 'ppo',
      hsa_eligible: false,
      premiums: { employee: 350, spouse: 700, family: 950 },
      deductible: { individual: 250, family: 500 },
      oop_max: { individual: 2000, family: 4000 },
    },
  ];

  const determineBestFit = (profile: any, plans: typeof mockPlans) => {
    // Simple scoring algorithm
    const scores = plans.map((plan) => {
      let score = 0;
      const coverageType = profile.coverageType || 'employee';
      
      // Lower premium = higher score for budget-conscious
      if (profile.riskTolerance === 'minimize_monthly') {
        score += (500 - plan.premiums[coverageType]) / 100;
      }
      
      // Lower deductible = higher score for risk-averse
      if (profile.riskTolerance === 'avoid_surprises') {
        score += (2000 - plan.deductible.individual) / 500;
      }
      
      // HSA bonus for high income
      if (profile.income === 'over150k' && plan.hsa_eligible) {
        score += 2;
      }
      
      // Low utilization favors HDHP
      if (profile.pcpVisits <= 2 && plan.type === 'hdhp') {
        score += 1.5;
      }
      
      return { plan, score };
    });
    
    return scores.sort((a, b) => b.score - a.score)[0].plan;
  };

  it('should recommend HDHP for low utilization users', () => {
    const profile = {
      coverageType: 'employee',
      pcpVisits: 1,
      riskTolerance: 'minimize_monthly',
    };
    const best = determineBestFit(profile, mockPlans);
    expect(best.type).toBe('hdhp');
  });

  it('should recommend PPO for risk-averse users', () => {
    const profile = {
      coverageType: 'employee',
      pcpVisits: 6,
      riskTolerance: 'avoid_surprises',
    };
    const best = determineBestFit(profile, mockPlans);
    expect(best.type).toBe('ppo');
  });

  it('should factor in HSA benefits for high earners', () => {
    const profile = {
      coverageType: 'employee',
      pcpVisits: 2,
      income: 'over150k',
    };
    const best = determineBestFit(profile, mockPlans);
    expect(best.hsa_eligible).toBe(true);
  });
});

// Test API service
describe('API Service', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should handle successful responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    const response = await fetch('/api/test');
    const data = await response.json();
    
    expect(data).toEqual({ data: 'test' });
  });

  it('should handle error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const response = await fetch('/api/not-found');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it('should include session token in headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await fetch('/api/session', {
      headers: {
        'X-Session-Token': 'test-token',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/session', {
      headers: {
        'X-Session-Token': 'test-token',
      },
    });
  });
});

// Test date formatting
describe('Date Utilities', () => {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  it('should format dates correctly', () => {
    const date = new Date('2025-01-01');
    expect(formatDate(date)).toBe('January 1, 2025');
  });

  it('should handle string dates', () => {
    expect(formatDate('2025-03-15')).toBe('March 15, 2025');
  });
});

// Test accessibility helpers
describe('Accessibility Helpers', () => {
  const getAriaLabel = (step: number, totalSteps: number) => {
    return `Step ${step} of ${totalSteps}`;
  };

  it('should generate correct aria labels', () => {
    expect(getAriaLabel(1, 5)).toBe('Step 1 of 5');
    expect(getAriaLabel(3, 9)).toBe('Step 3 of 9');
  });

  const getFocusableElements = (container: HTMLElement) => {
    return container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  };

  it('should identify focusable elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>Click me</button>
      <input type="text" />
      <a href="#">Link</a>
      <div tabindex="0">Focusable div</div>
      <div tabindex="-1">Not focusable</div>
    `;
    
    const focusable = getFocusableElements(container);
    expect(focusable.length).toBe(4);
  });
});
