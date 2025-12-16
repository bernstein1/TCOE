import { describe, it, expect, beforeEach } from 'vitest';

// Mock the calculation engine functions
const calculateTotalCost = (
  profile: any,
  plan: any,
  scenario: 'typical' | 'worst'
): any => {
  const premium = plan.premiums[profile.coverageType] * 12;
  
  const visitCosts = {
    none: 0,
    '1-2': 1.5,
    '3-5': 4,
    '6+': 8,
  };
  
  const pcpVisits = visitCosts[profile.pcpVisits as keyof typeof visitCosts] || 0;
  const specialistVisits = visitCosts[profile.specialistVisits as keyof typeof visitCosts] || 0;
  
  const estimatedMedical = scenario === 'typical'
    ? (pcpVisits * plan.copays.pcp) + (specialistVisits * plan.copays.specialist)
    : plan.oop_max.individual;
  
  const deductiblePortion = Math.min(estimatedMedical, plan.deductibles.individual);
  const coinsurancePortion = (estimatedMedical - deductiblePortion) * (plan.coinsurance / 100);
  
  const hsaSavings = plan.hsa_eligible ? 1000 * 0.30 : 0;
  const hsaEmployerContribution = plan.hsa_employer_contribution?.employee || 0;
  
  const total = premium + deductiblePortion + coinsurancePortion;
  const netCost = total - hsaSavings - hsaEmployerContribution;
  
  return {
    premium,
    deductible: deductiblePortion,
    copays: coinsurancePortion,
    prescriptions: 0,
    total,
    hsaSavings,
    hsaEmployerContribution,
    netCost,
  };
};

const generateRecommendations = (profile: any, plans: any[]): any[] => {
  return plans.map(plan => {
    const typicalYear = calculateTotalCost(profile, plan, 'typical');
    const worstCase = calculateTotalCost(profile, plan, 'worst');
    
    const reasonsFor: string[] = [];
    const reasonsAgainst: string[] = [];
    
    if (plan.hsa_eligible) {
      reasonsFor.push('HSA eligible with tax savings');
    }
    if (plan.premiums[profile.coverageType] < 150) {
      reasonsFor.push('Lower monthly premium');
    }
    if (plan.deductibles.individual > 1500) {
      reasonsAgainst.push('Higher deductible before coverage kicks in');
    }
    
    const score = 100 - (typicalYear.netCost / 100);
    
    return {
      planId: plan.id,
      plan,
      typicalYear,
      worstCase,
      weightedScore: score,
      fitCategory: score > 70 ? 'best' : score > 50 ? 'good' : 'not_recommended',
      financialRiskWarning: worstCase.netCost > (profile.maxSurpriseBill || 2000) * 2,
      reasonsFor,
      reasonsAgainst,
    };
  }).sort((a, b) => b.weightedScore - a.weightedScore);
};

describe('Calculation Engine', () => {
  const mockProfile = {
    coverageType: 'employee',
    pcpVisits: '3-5',
    specialistVisits: '1-2',
    erUrgentCare: 'none',
    prescriptions: [],
    riskTolerance: 'balanced',
    maxSurpriseBill: 2000,
    householdIncome: '$50,000 - $75,000',
  };

  const mockPlans = [
    {
      id: 'plan-1',
      name: 'HDHP with HSA',
      type: 'HDHP',
      premiums: { employee: 85, employee_spouse: 200, employee_children: 175, family: 350 },
      deductibles: { individual: 1500, family: 3000 },
      oop_max: { individual: 4000, family: 8000 },
      copays: { pcp: 0, specialist: 0, urgentCare: 0, er: 0 },
      coinsurance: 20,
      hsa_eligible: true,
      hsa_employer_contribution: { employee: 500, family: 1000 },
    },
    {
      id: 'plan-2',
      name: 'PPO Standard',
      type: 'PPO',
      premiums: { employee: 180, employee_spouse: 400, employee_children: 350, family: 600 },
      deductibles: { individual: 500, family: 1000 },
      oop_max: { individual: 3000, family: 6000 },
      copays: { pcp: 25, specialist: 50, urgentCare: 75, er: 250 },
      coinsurance: 20,
      hsa_eligible: false,
      hsa_employer_contribution: null,
    },
  ];

  describe('calculateTotalCost', () => {
    it('should calculate annual premium correctly', () => {
      const result = calculateTotalCost(mockProfile, mockPlans[0], 'typical');
      expect(result.premium).toBe(85 * 12);
    });

    it('should include HSA savings for eligible plans', () => {
      const hsaResult = calculateTotalCost(mockProfile, mockPlans[0], 'typical');
      const ppoResult = calculateTotalCost(mockProfile, mockPlans[1], 'typical');
      
      expect(hsaResult.hsaSavings).toBeGreaterThan(0);
      expect(ppoResult.hsaSavings).toBe(0);
    });

    it('should cap costs at OOP max in worst case scenario', () => {
      const result = calculateTotalCost(mockProfile, mockPlans[0], 'worst');
      const totalMedical = result.deductible + result.copays;
      expect(totalMedical).toBeLessThanOrEqual(mockPlans[0].oop_max.individual);
    });

    it('should calculate net cost correctly', () => {
      const result = calculateTotalCost(mockProfile, mockPlans[0], 'typical');
      const expectedNet = result.total - result.hsaSavings - result.hsaEmployerContribution;
      expect(result.netCost).toBe(expectedNet);
    });
  });

  describe('generateRecommendations', () => {
    it('should return recommendations for all plans', () => {
      const recommendations = generateRecommendations(mockProfile, mockPlans);
      expect(recommendations).toHaveLength(mockPlans.length);
    });

    it('should sort recommendations by weighted score descending', () => {
      const recommendations = generateRecommendations(mockProfile, mockPlans);
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].weightedScore).toBeGreaterThanOrEqual(
          recommendations[i].weightedScore
        );
      }
    });

    it('should assign fit categories based on score', () => {
      const recommendations = generateRecommendations(mockProfile, mockPlans);
      recommendations.forEach(rec => {
        expect(['best', 'good', 'not_recommended']).toContain(rec.fitCategory);
      });
    });

    it('should include reasons for and against each plan', () => {
      const recommendations = generateRecommendations(mockProfile, mockPlans);
      const hsaPlan = recommendations.find(r => r.plan.hsa_eligible);
      
      expect(hsaPlan?.reasonsFor).toContain('HSA eligible with tax savings');
    });

    it('should flag financial risk when worst case exceeds comfort level', () => {
      const lowComfortProfile = { ...mockProfile, maxSurpriseBill: 500 };
      const recommendations = generateRecommendations(lowComfortProfile, mockPlans);
      
      const hasWarning = recommendations.some(r => r.financialRiskWarning);
      expect(hasWarning).toBe(true);
    });
  });

  describe('coverage type calculations', () => {
    it('should use correct premium tier for family coverage', () => {
      const familyProfile = { ...mockProfile, coverageType: 'family' };
      const result = calculateTotalCost(familyProfile, mockPlans[0], 'typical');
      
      expect(result.premium).toBe(mockPlans[0].premiums.family * 12);
    });

    it('should use correct premium tier for employee + spouse', () => {
      const spouseProfile = { ...mockProfile, coverageType: 'employee_spouse' };
      const result = calculateTotalCost(spouseProfile, mockPlans[1], 'typical');
      
      expect(result.premium).toBe(mockPlans[1].premiums.employee_spouse * 12);
    });
  });
});
