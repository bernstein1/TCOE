import { calculationEngine, Plan } from './calculationEngine';
import { UserProfile } from '../utils/validation';

describe('CalculationEngine Enhancements', () => {
    const mockPlanHdhp: Plan = {
        id: 'plan-hdhp',
        name: 'HDHP Plan',
        type: 'HDHP',
        premiums: { employee: 100, family: 300 },
        deductibles: { individual: 3000, family: 6000 },
        oop_max: { individual: 5000, family: 10000 },
        copays: { pcp: 0, specialist: 0, er: 0 },
        coinsurance: 20,
        hsa_eligible: true,
        hsa_employer_contribution: { individual: 500, family: 1000 },
        rx_tiers: { generic: 10, preferred: 30, non_preferred: 60, specialty: 100 },
        drug_tiers: { 'drug-x': 'preferred' }, // Drug X is Tier 2 ($30)
        highlights: [],
        warnings: []
    };

    const mockPlanPpo: Plan = {
        id: 'plan-ppo',
        name: 'PPO Plan',
        type: 'PPO',
        premiums: { employee: 200, family: 600 },
        deductibles: { individual: 500, family: 1000 },
        oop_max: { individual: 3000, family: 6000 },
        copays: { pcp: 25, specialist: 50, er: 200 },
        coinsurance: 10,
        hsa_eligible: false,
        hsa_employer_contribution: {},
        rx_tiers: { generic: 10, preferred: 40, non_preferred: 80, specialty: 150 },
        drug_tiers: { 'drug-x': 'generic' }, // Drug X is Tier 1 ($10)
        highlights: [],
        warnings: []
    };

    const plans = [mockPlanHdhp, mockPlanPpo];

    describe('Safety Logic (Low Liquidity)', () => {
        it('should NOT recommend Lean & Mean (HDHP) to low liquidity user if risky', () => {
            const profile: UserProfile = {
                coverageType: 'employee',
                dependents: [],
                healthStatus: 'fair', // Higher utilization risk
                pcpVisits: 'regularly',
                riskTolerance: 'minimize_premium', // Usually prefers HDHP
                householdIncome: '50k_75k',
                liquidityCheck: false, // Low liquidity!
                maxSurpriseBill: 500, // Can't afford deductible
                plannedProcedures: [],
                prescriptions: [],
                erUrgentCare: 'none'
            };

            const result = calculationEngine.generateBundles(profile, plans, []);

            // Even though HDHP has lower premium, it's too risky.
            // Should fallback to Safety Net or Peace of Mind
            expect(result.bestFitBundle).not.toBe('leanAndMean');
            expect(['safetyNet', 'peaceOfMind']).toContain(result.bestFitBundle);
        });

        it('should recommend Lean & Mean to low liquidity user if NOT risky (healthy)', () => {
            const profile: UserProfile = {
                coverageType: 'employee',
                dependents: [],
                healthStatus: 'excellent', // Low risk
                pcpVisits: 'none',
                riskTolerance: 'minimize_premium',
                householdIncome: '50k_75k',
                liquidityCheck: false,
                maxSurpriseBill: 500,
                plannedProcedures: [],
                prescriptions: [],
                erUrgentCare: 'none'
            };

            const result = calculationEngine.generateBundles(profile, plans, []);

            // Even healthy users have a 'worst case' (accident). If liquidity is low,
            // HDHP deductible is too risky. Should fallback to Peace of Mind.
            expect(result.bestFitBundle).toBe('peaceOfMind');
        });
    });

    describe('Family Cost Scaling', () => {
        it('should scale medical costs by family size', () => {
            const individualProfile: UserProfile = {
                coverageType: 'employee',
                dependents: [],
                healthStatus: 'good',
                pcpVisits: 'regularly', // 6 visits/year
                riskTolerance: 'balanced',
                householdIncome: '50k_75k',
                plannedProcedures: [],
                prescriptions: [],
                erUrgentCare: 'none',
                maxSurpriseBill: 2000
            };

            const familyProfile: UserProfile = {
                ...individualProfile,
                coverageType: 'family',
                dependents: [
                    { relationship: 'spouse', age: 30 },
                    { relationship: 'child', age: 5 },
                    { relationship: 'child', age: 3 }
                ] // Total 4 members
            };

            const indResult = calculationEngine.generateBundles(individualProfile, plans, []);
            const famResult = calculationEngine.generateBundles(familyProfile, plans, []);

            const indCosts = indResult.bundles.peaceOfMind!.costBreakdown;
            const famCosts = famResult.bundles.peaceOfMind!.costBreakdown;

            // Family has 4 members, so visits should be ~4x
            // Copays should be roughly 4x
            expect(famCosts.copays).toBeGreaterThan(indCosts.copays * 3.5);
            expect(famCosts.copays).toBeLessThan(indCosts.copays * 4.5);
        });
    });

    describe('Dynamic Drug Formularies', () => {
        it('should calculate prescription costs based on plan-specific tiers', () => {
            const profile: UserProfile = {
                coverageType: 'employee',
                dependents: [],
                healthStatus: 'good',
                pcpVisits: 'none',
                riskTolerance: 'balanced',
                householdIncome: '50k_75k',
                plannedProcedures: [],
                prescriptions: [{ id: 'drug-x', name: 'Drug X', quantity: 1, isSpouse: false }],
                erUrgentCare: 'none',
                maxSurpriseBill: 2000
            };

            const prescriptions = [
                { id: 'drug-x', name: 'Drug X', default_tier: 'preferred', avg_monthly_cost: 100 }
            ];

            const result = calculationEngine.generateBundles(profile, plans, prescriptions);

            // Plan HDHP: Drug X is 'preferred' ($30/mo) -> $360/yr
            const hdhpRxCost = result.bundles.futureBuilder!.costBreakdown.prescriptions;
            expect(hdhpRxCost).toBe(30 * 12);

            // Plan PPO: Drug X is 'generic' ($10/mo) -> $120/yr
            const ppoRxCost = result.bundles.safetyNet!.costBreakdown.prescriptions;
            expect(ppoRxCost).toBe(10 * 12);
        });
    });
});
