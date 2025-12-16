import PDFDocument from 'pdfkit';
import { query } from '../config/database';
import { logger } from '../utils/logger';

interface PdfExportOptions {
  sessionId: string;
  includeComparison: boolean;
  includeGapAnalysis: boolean;
  includeHsaProjection: boolean;
}

interface CompanyBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface SessionData {
  id: string;
  mode: string;
  profileData: any;
  selectedPlanId: string | null;
  comparisonPlanIds: string[];
}

interface PlanData {
  id: string;
  name: string;
  type: string;
  network: string;
  premiums: Record<string, number>;
  deductibles: Record<string, number>;
  oopMax: Record<string, number>;
  copays: Record<string, number>;
  coinsurance: number;
  hsaEligible: boolean;
  hsaEmployerContribution: Record<string, number>;
  highlights: string[];
}

interface RecommendationData {
  planId: string;
  planName: string;
  fitCategory: string;
  typicalYearCost: number;
  worstCaseCost: number;
  reasonsFor: string[];
  reasonsAgainst: string[];
}

export class PdfService {
  /**
   * Generate benefits summary PDF
   */
  async generateSummaryPdf(options: PdfExportOptions): Promise<Buffer> {
    // Fetch session data
    const sessionResult = await query<any>(
      `SELECT s.*, c.name as company_name, c.logo_url, c.primary_color, c.secondary_color
       FROM sessions s
       JOIN companies c ON s.company_id = c.id
       WHERE s.id = $1`,
      [options.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionResult.rows[0];
    const branding: CompanyBranding = {
      name: session.company_name,
      logoUrl: session.logo_url,
      primaryColor: session.primary_color || '#0D9488',
      secondaryColor: session.secondary_color || '#6366F1',
    };

    // Fetch selected plan
    let selectedPlan: PlanData | null = null;
    if (session.selected_plan_id) {
      const planResult = await query<any>(
        `SELECT * FROM plans WHERE id = $1`,
        [session.selected_plan_id]
      );
      if (planResult.rows.length > 0) {
        const p = planResult.rows[0];
        selectedPlan = {
          id: p.id,
          name: p.name,
          type: p.type,
          network: p.network,
          premiums: p.premiums,
          deductibles: p.deductibles,
          oopMax: p.oop_max,
          copays: p.copays,
          coinsurance: p.coinsurance,
          hsaEligible: p.hsa_eligible,
          hsaEmployerContribution: p.hsa_employer_contribution,
          highlights: p.highlights,
        };
      }
    }

    // Fetch comparison plans
    let comparisonPlans: PlanData[] = [];
    if (options.includeComparison && session.comparison_plan_ids?.length > 0) {
      const compResult = await query<any>(
        `SELECT * FROM plans WHERE id = ANY($1)`,
        [session.comparison_plan_ids]
      );
      comparisonPlans = compResult.rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        network: p.network,
        premiums: p.premiums,
        deductibles: p.deductibles,
        oopMax: p.oop_max,
        copays: p.copays,
        coinsurance: p.coinsurance,
        hsaEligible: p.hsa_eligible,
        hsaEmployerContribution: p.hsa_employer_contribution,
        highlights: p.highlights,
      }));
    }

    // Create PDF
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `${branding.name} Benefits Summary`,
          Author: 'TouchCare Benefits Platform',
          Subject: 'Health Plan Recommendation',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate content
      this.addHeader(doc, branding);
      this.addPersonalSummary(doc, session.profile_data);
      
      if (selectedPlan) {
        this.addSelectedPlan(doc, selectedPlan, session.profile_data);
      }
      
      if (comparisonPlans.length > 0) {
        doc.addPage();
        this.addComparison(doc, selectedPlan, comparisonPlans, session.profile_data);
      }
      
      if (options.includeGapAnalysis) {
        this.addGapAnalysis(doc, session.profile_data, selectedPlan);
      }
      
      if (options.includeHsaProjection && selectedPlan?.hsaEligible) {
        this.addHsaProjection(doc, session.profile_data, selectedPlan);
      }
      
      this.addFooter(doc);
      this.addEnrollmentQrCode(doc, session.id);
      
      doc.end();
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, branding: CompanyBranding): void {
    // Company name
    doc.fontSize(24)
       .fillColor(branding.primaryColor)
       .text(branding.name, { align: 'left' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(16)
       .fillColor('#374151')
       .text('Benefits Decision Summary', { align: 'left' });
    
    doc.moveDown(0.25);
    
    doc.fontSize(10)
       .fillColor('#6B7280')
       .text(`Generated ${new Date().toLocaleDateString('en-US', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric' 
       })}`, { align: 'left' });
    
    doc.moveDown(1);
    
    // Divider
    doc.strokeColor(branding.primaryColor)
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(562, doc.y)
       .stroke();
    
    doc.moveDown(1);
  }

  private addPersonalSummary(doc: PDFKit.PDFDocument, profile: any): void {
    doc.fontSize(14)
       .fillColor('#111827')
       .text('Your Profile Summary', { underline: true });
    
    doc.moveDown(0.5);
    
    const coverageLabels: Record<string, string> = {
      employee: 'Employee Only',
      employee_spouse: 'Employee + Spouse',
      employee_children: 'Employee + Children',
      family: 'Family',
    };
    
    const riskLabels: Record<string, string> = {
      avoid_surprises: 'Prefer predictable costs',
      balanced: 'Balanced approach',
      minimize_premium: 'Minimize monthly costs',
    };
    
    doc.fontSize(11)
       .fillColor('#374151');
    
    doc.text(`Coverage Type: ${coverageLabels[profile?.coverageType] || 'Not specified'}`);
    doc.text(`Healthcare Usage: ${profile?.pcpVisits || 'N/A'} PCP visits, ${profile?.specialistVisits || 'N/A'} specialist visits`);
    doc.text(`Risk Preference: ${riskLabels[profile?.riskTolerance] || 'Not specified'}`);
    doc.text(`Max Comfortable Surprise Bill: $${(profile?.maxSurpriseBill || 0).toLocaleString()}`);
    
    if (profile?.prescriptions?.length > 0) {
      doc.text(`Prescriptions: ${profile.prescriptions.length} medication(s)`);
    }
    
    doc.moveDown(1);
  }

  private addSelectedPlan(doc: PDFKit.PDFDocument, plan: PlanData, profile: any): void {
    const isFamily = profile?.coverageType === 'family' || profile?.coverageType === 'employee_spouse';
    
    doc.fontSize(14)
       .fillColor('#059669')
       .text('★ Your Recommended Plan', { continued: false });
    
    doc.moveDown(0.5);
    
    doc.fontSize(18)
       .fillColor('#111827')
       .text(plan.name);
    
    doc.fontSize(11)
       .fillColor('#6B7280')
       .text(`${plan.type} • ${plan.network}`);
    
    doc.moveDown(0.75);
    
    // Key numbers box
    const boxY = doc.y;
    doc.rect(50, boxY, 512, 100)
       .fillColor('#F3F4F6')
       .fill();
    
    doc.y = boxY + 15;
    
    // Three columns
    const colWidth = 170;
    const startX = 60;
    
    // Monthly Premium
    doc.fontSize(10)
       .fillColor('#6B7280')
       .text('Monthly Premium', startX, doc.y);
    doc.fontSize(20)
       .fillColor('#111827')
       .text(`$${plan.premiums[profile?.coverageType] || plan.premiums.employee}`, startX, doc.y + 2);
    
    // Deductible
    doc.fontSize(10)
       .fillColor('#6B7280')
       .text('Annual Deductible', startX + colWidth, boxY + 15);
    doc.fontSize(20)
       .fillColor('#111827')
       .text(`$${(isFamily ? plan.deductibles.family : plan.deductibles.individual).toLocaleString()}`, startX + colWidth, boxY + 15 + 12);
    
    // Out-of-Pocket Max
    doc.fontSize(10)
       .fillColor('#6B7280')
       .text('Out-of-Pocket Max', startX + colWidth * 2, boxY + 15);
    doc.fontSize(20)
       .fillColor('#111827')
       .text(`$${(isFamily ? plan.oopMax.family : plan.oopMax.individual).toLocaleString()}`, startX + colWidth * 2, boxY + 15 + 12);
    
    doc.y = boxY + 110;
    
    // Highlights
    if (plan.highlights.length > 0) {
      doc.fontSize(11)
         .fillColor('#374151');
      
      for (const highlight of plan.highlights.slice(0, 4)) {
        doc.text(`✓ ${highlight}`, { indent: 10 });
      }
    }
    
    // HSA info
    if (plan.hsaEligible) {
      doc.moveDown(0.5);
      doc.fontSize(11)
         .fillColor('#059669')
         .text(`HSA Eligible with $${(isFamily ? plan.hsaEmployerContribution.family : plan.hsaEmployerContribution.individual) || 0} employer contribution`);
    }
    
    doc.moveDown(1);
  }

  private addComparison(
    doc: PDFKit.PDFDocument, 
    selectedPlan: PlanData | null, 
    comparisonPlans: PlanData[],
    profile: any
  ): void {
    doc.fontSize(14)
       .fillColor('#111827')
       .text('Plan Comparison', { underline: true });
    
    doc.moveDown(0.5);
    
    const allPlans = selectedPlan ? [selectedPlan, ...comparisonPlans] : comparisonPlans;
    const isFamily = profile?.coverageType === 'family' || profile?.coverageType === 'employee_spouse';
    
    // Table header
    const tableTop = doc.y;
    const colWidth = 512 / (allPlans.length + 1);
    
    doc.fontSize(9)
       .fillColor('#6B7280');
    
    // Header row
    doc.text('', 50, tableTop);
    allPlans.forEach((plan, i) => {
      doc.text(plan.name, 50 + colWidth * (i + 1), tableTop, { width: colWidth - 5, align: 'center' });
    });
    
    doc.moveDown(1);
    
    // Data rows
    const rows = [
      { label: 'Type', getValue: (p: PlanData) => p.type },
      { label: 'Monthly Premium', getValue: (p: PlanData) => `$${p.premiums[profile?.coverageType] || p.premiums.employee}` },
      { label: 'Deductible', getValue: (p: PlanData) => `$${(isFamily ? p.deductibles.family : p.deductibles.individual).toLocaleString()}` },
      { label: 'OOP Max', getValue: (p: PlanData) => `$${(isFamily ? p.oopMax.family : p.oopMax.individual).toLocaleString()}` },
      { label: 'PCP Copay', getValue: (p: PlanData) => p.copays.pcp ? `$${p.copays.pcp}` : 'Ded. applies' },
      { label: 'Specialist Copay', getValue: (p: PlanData) => p.copays.specialist ? `$${p.copays.specialist}` : 'Ded. applies' },
      { label: 'Coinsurance', getValue: (p: PlanData) => `${p.coinsurance}%` },
      { label: 'HSA Eligible', getValue: (p: PlanData) => p.hsaEligible ? 'Yes' : 'No' },
    ];
    
    rows.forEach((row, rowIndex) => {
      const rowY = doc.y;
      
      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.rect(50, rowY - 3, 512, 18)
           .fillColor('#F9FAFB')
           .fill();
      }
      
      doc.fillColor('#374151')
         .text(row.label, 50, rowY);
      
      allPlans.forEach((plan, i) => {
        const isSelected = selectedPlan && plan.id === selectedPlan.id;
        doc.fillColor(isSelected ? '#059669' : '#111827')
           .text(row.getValue(plan), 50 + colWidth * (i + 1), rowY, { width: colWidth - 5, align: 'center' });
      });
      
      doc.moveDown(0.75);
    });
  }

  private addGapAnalysis(doc: PDFKit.PDFDocument, profile: any, plan: PlanData | null): void {
    doc.moveDown(1);
    
    doc.fontSize(14)
       .fillColor('#111827')
       .text('Voluntary Benefits Recommendations', { underline: true });
    
    doc.moveDown(0.5);
    
    doc.fontSize(11)
       .fillColor('#374151')
       .text('Based on your profile, you may want to consider these additional coverages:');
    
    doc.moveDown(0.5);
    
    // Simple recommendations based on profile
    const recommendations: { name: string; reason: string }[] = [];
    
    if (plan?.type === 'HDHP' && (profile?.maxSurpriseBill || 0) < 2000) {
      recommendations.push({
        name: 'Accident Insurance',
        reason: 'Helps cover deductible costs from unexpected injuries',
      });
    }
    
    if (profile?.coverageType === 'family') {
      recommendations.push({
        name: 'Critical Illness Insurance',
        reason: 'Provides lump-sum payment for serious diagnoses',
      });
    }
    
    if (profile?.dependents?.length > 0) {
      recommendations.push({
        name: 'Supplemental Life Insurance',
        reason: 'Additional financial protection for your family',
      });
    }
    
    for (const rec of recommendations) {
      doc.fontSize(11)
         .fillColor('#7C3AED')
         .text(`• ${rec.name}`, { continued: false });
      doc.fontSize(10)
         .fillColor('#6B7280')
         .text(`  ${rec.reason}`);
      doc.moveDown(0.25);
    }
    
    if (recommendations.length === 0) {
      doc.fontSize(10)
         .fillColor('#6B7280')
         .text('No additional recommendations based on your profile.');
    }
  }

  private addHsaProjection(doc: PDFKit.PDFDocument, profile: any, plan: PlanData): void {
    doc.moveDown(1);
    
    doc.fontSize(14)
       .fillColor('#111827')
       .text('HSA Savings Projection', { underline: true });
    
    doc.moveDown(0.5);
    
    const isFamily = profile?.coverageType === 'family' || profile?.coverageType === 'employee_spouse';
    const maxContribution = isFamily ? 8550 : 4300;
    const employerContribution = isFamily 
      ? (plan.hsaEmployerContribution.family || 0)
      : (plan.hsaEmployerContribution.individual || 0);
    
    // Estimate tax savings (simplified)
    const taxRate = 0.30; // Combined federal, state, FICA
    const taxSavings = maxContribution * taxRate;
    
    doc.fontSize(11)
       .fillColor('#374151');
    
    doc.text(`Maximum annual contribution: $${maxContribution.toLocaleString()}`);
    doc.text(`Employer contribution: $${employerContribution.toLocaleString()}`);
    doc.text(`Your contribution opportunity: $${(maxContribution - employerContribution).toLocaleString()}`);
    doc.moveDown(0.5);
    doc.fillColor('#059669')
       .text(`Estimated tax savings: $${Math.round(taxSavings).toLocaleString()}/year`);
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .fillColor('#6B7280')
       .text('HSA funds roll over year-to-year and can be invested for long-term growth. After age 65, funds can be used for any purpose.');
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    const pageHeight = 792; // Letter size height
    
    doc.fontSize(8)
       .fillColor('#9CA3AF')
       .text(
         'This summary is for informational purposes only and does not constitute medical or financial advice. Please review plan details carefully before enrolling.',
         50,
         pageHeight - 60,
         { width: 512, align: 'center' }
       );
    
    doc.text(
      'Powered by TouchCare Benefits Platform',
      50,
      pageHeight - 40,
      { width: 512, align: 'center' }
    );
  }

  private addEnrollmentQrCode(doc: PDFKit.PDFDocument, sessionId: string): void {
    // Note: In production, generate actual QR code using a library like 'qrcode'
    // For now, add enrollment link text
    doc.fontSize(10)
       .fillColor('#374151')
       .text('Ready to enroll? Visit your benefits portal or scan the QR code below.', 50, 650, { width: 512, align: 'center' });
    
    // Placeholder for QR code
    doc.rect(231, 670, 100, 100)
       .strokeColor('#E5E7EB')
       .stroke();
    
    doc.fontSize(8)
       .fillColor('#9CA3AF')
       .text('QR Code', 231, 710, { width: 100, align: 'center' });
  }

  /**
   * Generate enrollment data package
   */
  async generateEnrollmentPackage(sessionId: string): Promise<{
    sessionId: string;
    timestamp: string;
    profile: any;
    selectedPlan: any;
    decisions: any[];
    signature?: string;
  }> {
    const sessionResult = await query<any>(
      `SELECT s.*, p.name as plan_name, p.type as plan_type
       FROM sessions s
       LEFT JOIN plans p ON s.selected_plan_id = p.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionResult.rows[0];

    return {
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      profile: session.profile_data,
      selectedPlan: {
        id: session.selected_plan_id,
        name: session.plan_name,
        type: session.plan_type,
      },
      decisions: [], // Would include the full decision journey
    };
  }

  /**
   * Generate deep link for benefits admin systems
   */
  generateEnrollmentDeepLink(
    system: 'workday' | 'adp' | 'bamboohr' | 'paylocity' | 'gusto',
    enrollmentData: any
  ): string {
    const baseUrls: Record<string, string> = {
      workday: 'https://www.myworkday.com/benefits/enrollment',
      adp: 'https://workforcenow.adp.com/benefits',
      bamboohr: 'https://app.bamboohr.com/benefits',
      paylocity: 'https://access.paylocity.com/benefits',
      gusto: 'https://app.gusto.com/benefits',
    };

    const base = baseUrls[system] || baseUrls.workday;
    
    // Encode enrollment data
    const params = new URLSearchParams({
      plan_id: enrollmentData.selectedPlan?.id || '',
      coverage: enrollmentData.profile?.coverageType || '',
      source: 'touchcare',
      session: enrollmentData.sessionId,
    });

    return `${base}?${params.toString()}`;
  }
}

export const pdfService = new PdfService();
