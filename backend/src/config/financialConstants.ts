// Usage frequency mappings
export const VISIT_COUNTS: Record<string, { min: number; max: number; typical: number }> = {
    'none': { min: 0, max: 0, typical: 0 },
    '1-2': { min: 1, max: 2, typical: 1.5 },
    '3-5': { min: 3, max: 5, typical: 4 },
    '6+': { min: 6, max: 10, typical: 8 },
    // New visit frequency options
    'rarely': { min: 0, max: 1, typical: 0.5 },
    'occasionally': { min: 2, max: 4, typical: 3 },
    'regularly': { min: 5, max: 8, typical: 6 },
    'frequently': { min: 9, max: 15, typical: 12 },
};

// Health status multipliers for cost estimation
export const HEALTH_STATUS_MULTIPLIERS: Record<string, number> = {
    'excellent': 0.6,    // Lower utilization expected
    'good': 0.85,        // Slightly below average
    'fair': 1.2,         // Above average utilization
    'managing_conditions': 1.5,  // High utilization expected
};

export const ER_COUNTS: Record<string, { probability: number; typical: number; worst: number }> = {
    'none': { probability: 0.1, typical: 0, worst: 1 },
    '1': { probability: 0.6, typical: 1, worst: 2 },
    '2+': { probability: 0.9, typical: 2, worst: 3 },
};

// Average costs
export const COSTS = {
    PCP_VISIT: 150,
    SPECIALIST_VISIT: 300,
    ER_VISIT: 2500,
    URGENT_CARE: 250,
    PREGNANCY: { min: 8000, max: 15000 },
    SURGERY_MINOR: { min: 3000, max: 8000 },
    SURGERY_MAJOR: { min: 15000, max: 50000 },
};

// Tax brackets for HSA savings
export const TAX_BRACKETS = [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
];

export const INCOME_MIDPOINTS: Record<string, number> = {
    'under_50k': 35000,
    '50k_75k': 62500,
    '75k_100k': 87500,
    '100k_150k': 125000,
    '150k_200k': 175000,
    'over_200k': 250000,
};

// HSA limits for 2025
export const HSA_LIMITS = {
    individual: 4300,
    family: 8550,
    catchUp: 1000, // Additional for 55+
};
