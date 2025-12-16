import { UserProfile } from '../utils/validation';
import { logger } from '../utils/logger';
import {
  VISIT_COUNTS,
  HEALTH_STATUS_MULTIPLIERS,
  ER_COUNTS,
  COSTS,
  TAX_BRACKETS,
  INCOME_MIDPOINTS,
  HSA_LIMITS
} from '../config/financialConstants';

// Types
export interface Plan {
  id: string;
  name: string;
  type: string;
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
  requires_referral?: boolean;
  drug_tiers?: Record<string, string>; // Map of drugId -> tier (e.g. "generic", "preferred")
}

interface Prescription {
  id: string;
  name: string;
  default_tier: string;
  avg_monthly_cost: number;
}

interface CostBreakdown {
  premium: number;
  deductible: number;
  copays: number;
  coinsurance: number;
  prescriptions: number;
  total: number;
  hsaSavings: number;
  hsaEmployerContribution: number;
  fsaEmployerContribution?: number;
  netCost: number;
}





export class CalculationEngine {
  /**
   * Calculate estimated annual medical costs for a given profile
   */
  private estimateMedicalCosts(
    profile: UserProfile,
    plan: Plan,
    scenario: 'typical' | 'worst'
  ): { preCoverage: number; postCoverage: number; copays: number; coinsurance: number } {
    const isFamily = profile.coverageType === 'family' || profile.coverageType === 'employee_spouse';
    const deductible = isFamily ? plan.deductibles.family : plan.deductibles.individual;
    const oopMax = isFamily ? plan.oop_max.family : plan.oop_max.individual;

    // Get health status multiplier (defaults to 1 if not set)
    const healthMultiplier = HEALTH_STATUS_MULTIPLIERS[profile.healthStatus || 'good'] || 1;

    // Scale by family size
    const memberCount = profile.dependents.length + 1;

    // Calculate visit costs with health status adjustment
    const pcpVisitCount = VISIT_COUNTS[profile.pcpVisits] || VISIT_COUNTS['occasionally'];
    const pcpVisits = (scenario === 'typical'
      ? pcpVisitCount.typical
      : pcpVisitCount.max) * healthMultiplier * memberCount;

    const specialistVisitCount = VISIT_COUNTS[profile.specialistVisits || 'none'] || VISIT_COUNTS['none'];
    const specialistVisits = (scenario === 'typical'
      ? specialistVisitCount.typical
      : specialistVisitCount.max) * healthMultiplier * memberCount;

    const erProb = ER_COUNTS[profile.erUrgentCare || 'none'] || ER_COUNTS['none'];
    const erVisits = (scenario === 'typical' ? erProb.typical : erProb.worst) * memberCount;

    // Calculate copays (only for plans with copays)
    let totalCopays = 0;
    if (plan.copays.pcp) {
      totalCopays += pcpVisits * plan.copays.pcp;
      totalCopays += specialistVisits * plan.copays.specialist;
      totalCopays += erVisits * (plan.copays.er || plan.copays.urgent_care || 0);
    }

    // Calculate pre-coverage costs (what would be charged without insurance)
    let preCoverageCosts = 0;
    preCoverageCosts += pcpVisits * COSTS.PCP_VISIT;
    preCoverageCosts += specialistVisits * COSTS.SPECIALIST_VISIT;
    preCoverageCosts += erVisits * COSTS.ER_VISIT;

    // Add planned procedures
    for (const procedure of profile.plannedProcedures) {
      if (procedure === 'pregnancy') {
        preCoverageCosts += scenario === 'typical' ? COSTS.PREGNANCY.min : COSTS.PREGNANCY.max;
      } else if (procedure === 'surgery_minor') {
        preCoverageCosts += scenario === 'typical' ? COSTS.SURGERY_MINOR.min : COSTS.SURGERY_MINOR.max;
      } else if (procedure === 'surgery_major') {
        preCoverageCosts += scenario === 'typical' ? COSTS.SURGERY_MAJOR.min : COSTS.SURGERY_MAJOR.max;
      }
    }

    // Calculate coinsurance (costs after deductible but before OOP max)
    const costsAfterDeductible = Math.max(0, preCoverageCosts - deductible);
    const coinsuranceAmount = costsAfterDeductible * (plan.coinsurance / 100);

    // Cap at OOP max
    const totalOutOfPocket = Math.min(deductible + coinsuranceAmount + totalCopays, oopMax);

    return {
      preCoverage: preCoverageCosts,
      postCoverage: totalOutOfPocket - totalCopays,
      copays: totalCopays,
      coinsurance: coinsuranceAmount,
    };
  }

  /**
   * Calculate prescription costs
   */
  private estimatePrescriptionCosts(
    profile: UserProfile,
    plan: Plan,
    prescriptions: Prescription[]
  ): number {
    let totalCost = 0;

    for (const selection of profile.prescriptions) {
      const rx = prescriptions.find(p => p.id === selection.id);
      if (!rx) continue;

      // Check for plan-specific tier, otherwise fallback to drug default
      const tier = plan.drug_tiers?.[rx.id] || rx.default_tier;
      const tierCost = plan.rx_tiers[tier] || plan.rx_tiers.generic || 10;

      // Monthly cost * 12 months
      totalCost += tierCost * 12 * selection.quantity;
    }

    return totalCost;
  }

  /**
   * Calculate HSA tax savings
   */
  private calculateHsaTaxSavings(
    contribution: number,
    householdIncome: string
  ): number {
    const income = INCOME_MIDPOINTS[householdIncome] || 75000;

    // Find marginal tax bracket
    const bracket = TAX_BRACKETS.find(b => income >= b.min && income < b.max) || TAX_BRACKETS[0];
    const federalRate = bracket.rate;

    // State tax (average estimate)
    const stateRate = 0.05;

    // FICA (only if contributing pre-tax through payroll)
    const ficaRate = 0.0765;

    const totalRate = federalRate + stateRate + ficaRate;
    return contribution * totalRate;
  }

  /**
   * Calculate full cost breakdown for a plan
   */
  private calculateCostBreakdown(
    profile: UserProfile,
    plan: Plan,
    prescriptions: Prescription[],
    scenario: 'typical' | 'worst'
  ): CostBreakdown {
    const isFamily = profile.coverageType === 'family' || profile.coverageType === 'employee_spouse';

    // Annual premium
    const premium = (plan.premiums[profile.coverageType] || plan.premiums.employee) * 12;

    // Medical costs
    const medical = this.estimateMedicalCosts(profile, plan, scenario);

    // Prescription costs
    const rxCosts = this.estimatePrescriptionCosts(profile, plan, prescriptions);

    // HSA benefits
    let hsaEmployerContribution = 0;
    let hsaTaxSavings = 0;

    if (plan.hsa_eligible) {
      hsaEmployerContribution = isFamily
        ? (plan.hsa_employer_contribution.family || 0)
        : (plan.hsa_employer_contribution.individual || 0);

      // Assume max contribution for savings calculation
      const maxContribution = isFamily ? HSA_LIMITS.family : HSA_LIMITS.individual;
      hsaTaxSavings = this.calculateHsaTaxSavings(maxContribution, profile.householdIncome);
    }

    // FSA benefits
    let fsaEmployerContribution = 0;
    if (plan.fsa_eligible) {
      fsaEmployerContribution = isFamily
        ? (plan.fsa_employer_contribution?.family || 0)
        : (plan.fsa_employer_contribution?.individual || 0);
    }

    const total = premium + medical.postCoverage + medical.copays + rxCosts;
    const netCost = total - hsaEmployerContribution - hsaTaxSavings - fsaEmployerContribution;

    return {
      premium,
      deductible: medical.postCoverage,
      copays: medical.copays,
      coinsurance: medical.coinsurance,
      prescriptions: rxCosts,
      total,
      hsaSavings: hsaTaxSavings,
      hsaEmployerContribution,
      fsaEmployerContribution,
      netCost,
    };
  }



  /**
   * Main recommendation method
   */
  /**
   * Generate lifestyle bundles (Plan + Account)
   */
  public generateBundles(
    profile: UserProfile,
    plans: Plan[],
    prescriptions: Prescription[]
  ): BundleResponse {
    logger.info('Generating bundles', { profile: profile.coverageType, planCount: plans.length });

    // 1. Calculate costs for all plans
    const analyzedPlans = plans.map(plan => {
      const typical = this.calculateCostBreakdown(profile, plan, prescriptions, 'typical');
      const worstCase = this.calculateCostBreakdown(profile, plan, prescriptions, 'worst');
      return { plan, typical, worstCase };
    });

    // 2. Identify Best Candidates
    const hdhpPlans = analyzedPlans.filter(p => p.plan.type === 'HDHP');
    const ppoPlans = analyzedPlans.filter(p => p.plan.type === 'PPO' || p.plan.type === 'HMO' || p.plan.type === 'EPO');

    // Sort by net cost (typical year) to find the "best" of each type financially
    const bestHdhp = hdhpPlans.sort((a, b) => a.typical.netCost - b.typical.netCost)[0];
    const bestPpo = ppoPlans.sort((a, b) => a.typical.netCost - b.typical.netCost)[0];

    if (!bestHdhp || !bestPpo) {
      // Fallback if we don't have both types (shouldn't happen with seed data)
      logger.warn('Insufficient plans to generate all bundles');
      // In a real app we'd handle this gracefully, for now we'll throw or return partial
    }

    // 3. Construct Bundles
    const bundles: BundleResponse['bundles'] = {};

    // Bundle 1: Future Builder (HDHP + HSA)
    if (bestHdhp && bestHdhp.plan.hsa_eligible) {
      bundles.futureBuilder = {
        id: 'future_builder',
        title: 'The Future Builder',
        description: 'Maximize tax savings and build long-term wealth.',
        plan: bestHdhp.plan,
        accountType: 'HSA',
        contribution: 3000, // Simplified default, could be optimized
        costBreakdown: bestHdhp.typical,
        reasons: ['Lowest monthly premiums', 'Tax-free growth potential', 'Employer contribution included'],
      };
    }

    // Bundle 2: Safety Net (PPO + FSA)
    if (bestPpo) {
      // Only recommend if they have predictable costs
      const predictableCosts = bestPpo.typical.prescriptions + bestPpo.typical.copays;
      bundles.safetyNet = {
        id: 'safety_net',
        title: 'The Safety Net',
        description: 'Predictable costs with a discount on known bills.',
        plan: bestPpo.plan,
        accountType: 'FSA',
        contribution: predictableCosts,
        costBreakdown: bestPpo.typical,
        reasons: ['Predictable copays', `Cover $${Math.round(predictableCosts)} of known costs tax-free`, 'No surprise bills'],
      };
    }

    // Bundle 3: Lean & Mean (HDHP + Nothing)
    if (bestHdhp) {
      bundles.leanAndMean = {
        id: 'lean_mean',
        title: 'The Lean & Mean',
        description: 'Lowest possible monthly cost. Pay only when you go.',
        plan: bestHdhp.plan,
        accountType: 'None',
        contribution: 0,
        costBreakdown: {
          ...bestHdhp.typical,
          hsaSavings: 0,
          hsaEmployerContribution: 0,
          netCost: bestHdhp.typical.total // Recalculate net cost without HSA benefits
        },
        reasons: ['Maximum cash in pocket now', 'Pay for care only if needed', 'No "use it or lose it" risk'],
      };
    }

    // Bundle 4: Peace of Mind (PPO + Nothing)
    if (bestPpo) {
      bundles.peaceOfMind = {
        id: 'peace_mind',
        title: 'The Peace of Mind',
        description: 'Maximum coverage without the complexity of accounts.',
        plan: bestPpo.plan,
        accountType: 'None',
        contribution: 0,
        costBreakdown: {
          ...bestPpo.typical,
          fsaEmployerContribution: 0,
          netCost: bestPpo.typical.total
        },
        reasons: ['See any doctor', 'No tax forms to manage', 'Simple and stress-free'],
      };
    }

    // 4. Scoring / Best Fit Logic
    let bestFit: BundleResponse['bestFitBundle'] = 'peaceOfMind'; // Default safe option

    const predictableCosts = bestPpo ? (bestPpo.typical.prescriptions + bestPpo.typical.copays) : 0;

    // Logic:
    // 1. If low liquidity -> Lean & Mean (if healthy) or Peace of Mind (if sick)
    // 2. If high liquidity + Saver -> Future Builder
    // 3. If high liquidity + Predictable Costs -> Safety Net

    const isLowLiquidity = profile.liquidityCheck === false;
    const maxSurpriseBill = profile.maxSurpriseBill || 2000;

    // Safety Check: If low liquidity AND worst-case costs exceed their buffer,
    // do NOT recommend 'Lean & Mean' (HDHP + No HSA), as it's too risky.
    const isLeanMeanRisky = bestHdhp && bestHdhp.worstCase.deductible > maxSurpriseBill;

    if (isLowLiquidity) {
      if (isLeanMeanRisky) {
        // Too risky for HDHP, recommend PPO (Safety Net or Peace of Mind)
        bestFit = predictableCosts > 500 ? 'safetyNet' : 'peaceOfMind';
      } else {
        // Safe enough for HDHP
        bestFit = 'leanAndMean';
      }
    } else if (profile.riskTolerance === 'saver' || profile.riskTolerance === 'minimize_premium') {
      bestFit = 'futureBuilder';
    } else if (predictableCosts > 500 && profile.complexityTolerance !== false) {
      bestFit = 'safetyNet';
    } else {
      bestFit = 'peaceOfMind';
    }

    return {
      bundles,
      bestFitBundle: bestFit,
    };
  }
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

export const calculationEngine = new CalculationEngine();
