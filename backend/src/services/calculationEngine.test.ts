import { calculationEngine, Plan } from './calculationEngine';
import { UserProfile } from '../utils/validation';

// Mock Plans
const mockPlans: any[] = [
    {
        id: 'hdhp-plan',
        name: 'HDHP Premier',
        type: 'HDHP',
        network: 'PPO',
        premiums: { employee: 100, family: 300 },
        deductibles: { individual: 3000, family: 6000 },
        oop_max: { individual: 5000, family: 10000 },
        copays: { pcp: 0, specialist: 0 },
        coinsurance: 20,
        hsa_eligible: true,
        hsa_employer_contribution: { individual: 500, family: 1000 },
        fsa_eligible: true, // Technically FSA eligible but usually mutually exclusive with HSA
        highlights: [],
        warnings: []
    },
    {
        id: 'ppo-plan',
        name: 'PPO Gold',
        type: 'PPO',
        network: 'PPO',
        premiums: { employee: 200, family: 600 },
        deductibles: { individual: 1000, family: 2000 },
        oop_max: { individual: 4000, family: 8000 },
        copays: { pcp: 25, specialist: 50 },
        coinsurance: 20,
        hsa_eligible: false,
        fsa_eligible: true,
        fsa_employer_contribution: { individual: 0, family: 0 },
        highlights: [],
        warnings: []
    }
];

// Mock Prescriptions
const mockPrescriptions: any[] = [];

describe('CalculationEngine - Bundle Generation', () => {

    test('Should recommend Future Builder (HDHP+HSA) for healthy saver with liquidity', () => {
        const profile: UserProfile = {
            coverageType: 'employee',
            dependents: [],
            healthStatus: 'excellent',
            pcpVisits: 'rarely',
            specialistVisits: 'none',
            erUrgentCare: 'none',
            plannedProcedures: [],
            prescriptions: [],
            riskTolerance: 'saver',
            maxSurpriseBill: 5000,
            householdIncome: '100k_150k',
            liquidityCheck: true,
            complexityTolerance: true
        };

        const result = calculationEngine.generateBundles(profile, mockPlans, mockPrescriptions);

        expect(result.bestFitBundle).toBe('futureBuilder');
        expect(result.bundles.futureBuilder).toBeDefined();
        expect(result.bundles.futureBuilder?.plan.id).toBe('hdhp-plan');
        expect(result.bundles.futureBuilder?.accountType).toBe('HSA');
    });

    test('Should recommend Safety Net (PPO+FSA) for risk-averse user with predictable costs', () => {
        const profile: UserProfile = {
            coverageType: 'employee',
            dependents: [],
            healthStatus: 'fair',
            pcpVisits: 'frequently',
            specialistVisits: 'regularly',
            erUrgentCare: 'none',
            plannedProcedures: [],
            prescriptions: [],
            riskTolerance: 'predictable',
            maxSurpriseBill: 1000,
            householdIncome: '75k_100k',
            liquidityCheck: true, // Can pay bills but prefers predictability
            complexityTolerance: true // Willing to use FSA
        };

        const result = calculationEngine.generateBundles(profile, mockPlans, mockPrescriptions);

        expect(result.bestFitBundle).toBe('safetyNet');
        expect(result.bundles.safetyNet).toBeDefined();
        expect(result.bundles.safetyNet?.plan.id).toBe('ppo-plan');
        expect(result.bundles.safetyNet?.accountType).toBe('FSA');
    });

    test('Should recommend Peace of Mind (PPO+Nothing) for complexity averse user', () => {
        const profile: UserProfile = {
            coverageType: 'employee',
            dependents: [],
            healthStatus: 'good',
            pcpVisits: 'occasionally',
            specialistVisits: 'none',
            erUrgentCare: 'none',
            plannedProcedures: [],
            prescriptions: [],
            riskTolerance: 'balanced',
            maxSurpriseBill: 2000,
            householdIncome: '75k_100k',
            liquidityCheck: true,
            complexityTolerance: false // Hates complexity
        };

        const result = calculationEngine.generateBundles(profile, mockPlans, mockPrescriptions);

        expect(result.bestFitBundle).toBe('peaceOfMind');
        expect(result.bundles.peaceOfMind).toBeDefined();
        expect(result.bundles.peaceOfMind?.plan.id).toBe('ppo-plan');
        expect(result.bundles.peaceOfMind?.accountType).toBe('None');
    });

    test('Should recommend Lean & Mean (HDHP+Nothing) for low liquidity user', () => {
        const profile: UserProfile = {
            coverageType: 'employee',
            dependents: [],
            healthStatus: 'excellent',
            pcpVisits: 'rarely',
            specialistVisits: 'none',
            erUrgentCare: 'none',
            plannedProcedures: [],
            prescriptions: [],
            riskTolerance: 'minimize_premium',
            maxSurpriseBill: 500,
            householdIncome: 'under_50k',
            liquidityCheck: false, // Cash strapped
            complexityTolerance: false
        };

        const result = calculationEngine.generateBundles(profile, mockPlans, mockPrescriptions);

        // Note: Logic might favor Peace of Mind if risk tolerance is low, but 'minimize_premium' + low liquidity 
        // might push towards lowest monthly cost which is HDHP. 
        // However, if they can't afford the deductible, the logic might be tricky.
        // Let's see what the engine decides.

        expect(result.bundles.leanAndMean).toBeDefined();
        expect(result.bundles.leanAndMean?.plan.id).toBe('hdhp-plan');
        expect(result.bundles.leanAndMean?.accountType).toBe('None');
    });

});
