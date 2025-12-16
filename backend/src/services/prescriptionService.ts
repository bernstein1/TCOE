import { query } from '../config/database';
import { logger } from '../utils/logger';

// RxNorm API base URL (free, from NIH)
const RXNORM_API_URL = 'https://rxnav.nlm.nih.gov/REST';

interface RxNormDrug {
  rxcui: string;
  name: string;
  synonym?: string;
  tty: string; // Term type (BN=Brand Name, IN=Ingredient, etc.)
}

interface DrugInfo {
  id: string;
  name: string;
  genericName: string | null;
  brandNames: string[];
  drugClass: string | null;
  tier: string;
  avgMonthlyCost: number;
  avg90DayCost: number;
  requiresPriorAuth: boolean;
  hasGeneric: boolean;
  isSpecialty: boolean;
  rxnormId: string | null;
  therapeuticAlternatives?: DrugInfo[];
}

interface FormularyEntry {
  prescriptionId: string;
  tier: string;
  copayOverride: number | null;
  requiresPriorAuth: boolean;
  notes: string | null;
}

export class PrescriptionService {
  /**
   * Search RxNorm API for drugs
   */
  async searchRxNorm(searchTerm: string): Promise<RxNormDrug[]> {
    try {
      // Search for approximate matches
      const response = await fetch(
        `${RXNORM_API_URL}/approximateTerm.json?term=${encodeURIComponent(searchTerm)}&maxEntries=20`
      );

      if (!response.ok) {
        throw new Error(`RxNorm API error: ${response.status}`);
      }

      const data = await response.json() as { approximateGroup?: { candidate?: unknown[] } };
      const candidates = data.approximateGroup?.candidate || [];

      return candidates.map((c: any) => ({
        rxcui: c.rxcui,
        name: c.name || searchTerm,
        tty: c.tty || 'IN',
      }));
    } catch (error) {
      logger.error('RxNorm search failed', { searchTerm, error });
      return [];
    }
  }

  /**
   * Get drug details from RxNorm
   */
  async getDrugDetails(rxcui: string): Promise<{
    name: string;
    brandNames: string[];
    genericName: string | null;
    drugClass: string | null;
  } | null> {
    try {
      // Get related drugs (brands, generics)
      const relatedResponse = await fetch(
        `${RXNORM_API_URL}/rxcui/${rxcui}/related.json?tty=BN+IN+SBD+SCD`
      );

      if (!relatedResponse.ok) return null;

      const relatedData = await relatedResponse.json() as { relatedGroup?: { conceptGroup?: unknown[] } };
      const relatedGroups = relatedData.relatedGroup?.conceptGroup || [];

      let brandNames: string[] = [];
      let genericName: string | null = null;
      let mainName = '';

      for (const group of relatedGroups as { tty?: string; conceptProperties?: { name?: string }[] }[]) {
        const concepts = group.conceptProperties || [];
        if (group.tty === 'BN') {
          brandNames = concepts.map((c) => c.name || '');
        } else if (group.tty === 'IN') {
          genericName = concepts[0]?.name || null;
        }
        if (!mainName && concepts.length > 0) {
          mainName = concepts[0]?.name || '';
        }
      }

      // Get drug class
      const classResponse = await fetch(
        `${RXNORM_API_URL}/rxcui/${rxcui}/class.json?classTypes=MESHPA`
      );

      let drugClass: string | null = null;
      if (classResponse.ok) {
        const classData = await classResponse.json() as { rxclassMinConceptList?: { rxclassMinConcept?: { className?: string }[] } };
        drugClass = classData.rxclassMinConceptList?.rxclassMinConcept?.[0]?.className || null;
      }

      return {
        name: mainName,
        brandNames,
        genericName,
        drugClass,
      };
    } catch (error) {
      logger.error('Failed to get drug details', { rxcui, error });
      return null;
    }
  }

  /**
   * Search prescriptions in our database
   */
  async searchPrescriptions(
    searchTerm: string,
    companyId?: string,
    limit: number = 20
  ): Promise<DrugInfo[]> {
    // First search our local database
    const localResults = await query<any>(
      `SELECT p.*, cf.tier as company_tier, cf.copay_override, cf.requires_prior_auth as company_prior_auth
       FROM prescriptions p
       LEFT JOIN company_formularies cf ON p.id = cf.prescription_id AND cf.company_id = $2
       WHERE p.name ILIKE $1 OR p.generic_name ILIKE $1 OR $1 = ANY(p.brand_names)
       ORDER BY 
         CASE WHEN p.name ILIKE $1 THEN 0 ELSE 1 END,
         p.name
       LIMIT $3`,
      [`%${searchTerm}%`, companyId || null, limit]
    );

    const results: DrugInfo[] = localResults.rows.map(row => ({
      id: row.id,
      name: row.name,
      genericName: row.generic_name,
      brandNames: row.brand_names || [],
      drugClass: row.drug_class,
      tier: row.company_tier || row.default_tier || 'generic',
      avgMonthlyCost: parseFloat(row.avg_monthly_cost) || 0,
      avg90DayCost: parseFloat(row.avg_90_day_cost) || parseFloat(row.avg_monthly_cost) * 2.5 || 0,
      requiresPriorAuth: row.company_prior_auth ?? row.requires_prior_auth ?? false,
      hasGeneric: row.has_generic || false,
      isSpecialty: row.is_specialty || false,
      rxnormId: row.rxnorm_id,
    }));

    // If we have few results, supplement with RxNorm
    if (results.length < 5) {
      const rxnormResults = await this.searchRxNorm(searchTerm);
      
      for (const rxDrug of rxnormResults) {
        // Skip if already in our results
        if (results.some(r => r.rxnormId === rxDrug.rxcui)) continue;
        
        // Add as unverified result
        results.push({
          id: `rxnorm_${rxDrug.rxcui}`,
          name: rxDrug.name,
          genericName: null,
          brandNames: [],
          drugClass: null,
          tier: this.classifyTier(rxDrug.name),
          avgMonthlyCost: 0, // Unknown
          avg90DayCost: 0,
          requiresPriorAuth: false,
          hasGeneric: false,
          isSpecialty: false,
          rxnormId: rxDrug.rxcui,
        });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Get prescription by ID
   */
  async getPrescription(id: string, companyId?: string): Promise<DrugInfo | null> {
    const result = await query<any>(
      `SELECT p.*, cf.tier as company_tier, cf.copay_override, cf.requires_prior_auth as company_prior_auth
       FROM prescriptions p
       LEFT JOIN company_formularies cf ON p.id = cf.prescription_id AND cf.company_id = $2
       WHERE p.id = $1`,
      [id, companyId || null]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      genericName: row.generic_name,
      brandNames: row.brand_names || [],
      drugClass: row.drug_class,
      tier: row.company_tier || row.default_tier || 'generic',
      avgMonthlyCost: parseFloat(row.avg_monthly_cost) || 0,
      avg90DayCost: parseFloat(row.avg_90_day_cost) || 0,
      requiresPriorAuth: row.company_prior_auth ?? row.requires_prior_auth ?? false,
      hasGeneric: row.has_generic || false,
      isSpecialty: row.is_specialty || false,
      rxnormId: row.rxnorm_id,
    };
  }

  /**
   * Find therapeutic alternatives for a drug
   */
  async findAlternatives(prescriptionId: string, companyId?: string): Promise<DrugInfo[]> {
    const drug = await this.getPrescription(prescriptionId, companyId);
    if (!drug || !drug.drugClass) return [];

    // Find drugs in the same class with lower tiers
    const result = await query<any>(
      `SELECT p.*, cf.tier as company_tier
       FROM prescriptions p
       LEFT JOIN company_formularies cf ON p.id = cf.prescription_id AND cf.company_id = $2
       WHERE p.drug_class = $3 AND p.id != $1
       ORDER BY 
         CASE COALESCE(cf.tier, p.default_tier)
           WHEN 'generic' THEN 0
           WHEN 'preferred' THEN 1
           WHEN 'non_preferred' THEN 2
           WHEN 'specialty' THEN 3
           ELSE 4
         END
       LIMIT 5`,
      [prescriptionId, companyId || null, drug.drugClass]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      genericName: row.generic_name,
      brandNames: row.brand_names || [],
      drugClass: row.drug_class,
      tier: row.company_tier || row.default_tier || 'generic',
      avgMonthlyCost: parseFloat(row.avg_monthly_cost) || 0,
      avg90DayCost: parseFloat(row.avg_90_day_cost) || 0,
      requiresPriorAuth: row.requires_prior_auth || false,
      hasGeneric: row.has_generic || false,
      isSpecialty: row.is_specialty || false,
      rxnormId: row.rxnorm_id,
    }));
  }

  /**
   * Calculate prescription cost for a plan
   */
  calculatePrescriptionCost(
    prescriptions: { id: string; quantity: number }[],
    drugs: DrugInfo[],
    planRxTiers: Record<string, number>,
    months: number = 12
  ): {
    totalCost: number;
    breakdown: { drug: string; tier: string; monthlyCost: number; annualCost: number }[];
    savingsOpportunities: { drug: string; currentCost: number; alternativeCost: number; savings: number }[];
  } {
    const breakdown: { drug: string; tier: string; monthlyCost: number; annualCost: number }[] = [];
    let totalCost = 0;
    const savingsOpportunities: any[] = [];

    for (const selection of prescriptions) {
      const drug = drugs.find(d => d.id === selection.id);
      if (!drug) continue;

      const tierCost = planRxTiers[drug.tier] || planRxTiers.generic || 10;
      const monthlyCost = tierCost * selection.quantity;
      const annualCost = monthlyCost * months;

      breakdown.push({
        drug: drug.name,
        tier: drug.tier,
        monthlyCost,
        annualCost,
      });

      totalCost += annualCost;

      // Check for savings with 90-day supply
      if (drug.avg90DayCost > 0 && drug.avg90DayCost < tierCost * 3) {
        savingsOpportunities.push({
          drug: drug.name,
          currentCost: monthlyCost * 3,
          alternativeCost: drug.avg90DayCost,
          savings: (monthlyCost * 3) - drug.avg90DayCost,
          type: '90-day supply',
        });
      }
    }

    return { totalCost, breakdown, savingsOpportunities };
  }

  /**
   * Classify a drug into a tier based on name heuristics
   */
  private classifyTier(drugName: string): string {
    const name = drugName.toLowerCase();
    
    // Specialty indicators
    if (
      name.includes('humira') ||
      name.includes('enbrel') ||
      name.includes('remicade') ||
      name.includes('keytruda') ||
      name.includes('opdivo')
    ) {
      return 'specialty';
    }

    // Brand name indicators (capitalized, trademarked names)
    if (
      name.includes('®') ||
      name.includes('ozempic') ||
      name.includes('eliquis') ||
      name.includes('jardiance')
    ) {
      return 'non_preferred';
    }

    // Generic indicators (chemical names)
    if (
      name.includes('hcl') ||
      name.includes('sodium') ||
      name.includes('hydrochloride') ||
      name.includes('metformin') ||
      name.includes('lisinopril') ||
      name.includes('atorvastatin')
    ) {
      return 'generic';
    }

    return 'preferred'; // Default
  }

  /**
   * Import formulary from CSV
   */
  async importFormulary(
    companyId: string,
    formularyData: { drugName: string; tier: string; priorAuth?: boolean; notes?: string }[]
  ): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    for (const entry of formularyData) {
      try {
        // Find the prescription
        const results = await this.searchPrescriptions(entry.drugName, undefined, 1);
        if (results.length === 0) {
          errors.push(`Drug not found: ${entry.drugName}`);
          continue;
        }

        const drug = results[0];

        // Upsert into company formulary
        await query(
          `INSERT INTO company_formularies (company_id, prescription_id, tier, requires_prior_auth, notes)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (company_id, prescription_id) DO UPDATE SET
             tier = EXCLUDED.tier,
             requires_prior_auth = EXCLUDED.requires_prior_auth,
             notes = EXCLUDED.notes`,
          [companyId, drug.id, entry.tier, entry.priorAuth || false, entry.notes || null]
        );

        imported++;
      } catch (error) {
        errors.push(`Error importing ${entry.drugName}: ${error}`);
      }
    }

    logger.info('Formulary import complete', { companyId, imported, errorCount: errors.length });
    return { imported, errors };
  }

  /**
   * Get formulary for a company
   */
  async getCompanyFormulary(companyId: string): Promise<FormularyEntry[]> {
    const result = await query<any>(
      `SELECT cf.*, p.name as drug_name
       FROM company_formularies cf
       JOIN prescriptions p ON cf.prescription_id = p.id
       WHERE cf.company_id = $1
       ORDER BY p.name`,
      [companyId]
    );

    return result.rows.map(row => ({
      prescriptionId: row.prescription_id,
      tier: row.tier,
      copayOverride: row.copay_override ? parseFloat(row.copay_override) : null,
      requiresPriorAuth: row.requires_prior_auth,
      notes: row.notes,
    }));
  }
}

export const prescriptionService = new PrescriptionService();
