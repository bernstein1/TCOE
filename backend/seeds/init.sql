-- Seed data for TouchCare Benefits Platform
-- Run after migrations

-- Demo company
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS voluntary_benefits CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url VARCHAR(255),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  settings JSONB DEFAULT '{}'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'employee',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email, company_id)
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  network VARCHAR(100),
  description TEXT,
  highlights TEXT[],
  warnings TEXT[],
  premiums JSONB NOT NULL,
  deductibles JSONB NOT NULL,
  oop_max JSONB NOT NULL,
  copays JSONB DEFAULT '{}',
  coinsurance INTEGER DEFAULT 0,
  hsa_eligible BOOLEAN DEFAULT false,
  hsa_employer_contribution JSONB DEFAULT '{}',
  fsa_eligible BOOLEAN DEFAULT false,
  fsa_employer_contribution JSONB DEFAULT '{}',
  rx_tiers JSONB DEFAULT '{}',
  requires_referral BOOLEAN DEFAULT false,
  drug_tiers JSONB DEFAULT '{}',
  requires_pcp BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  brand_names TEXT[],
  drug_class VARCHAR(100),
  default_tier VARCHAR(50),
  avg_monthly_cost DECIMAL(10, 2),
  requires_prior_auth BOOLEAN DEFAULT false,
  has_generic BOOLEAN DEFAULT false,
  is_specialty BOOLEAN DEFAULT false
);

CREATE TABLE voluntary_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  monthly_cost_range JSONB,
  coverage_details JSONB
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  mode VARCHAR(50) DEFAULT 'go',
  current_step INTEGER DEFAULT 1,
  profile_data JSONB DEFAULT '{}',
  selected_plan_id UUID REFERENCES plans(id),
  comparison_plan_ids UUID[],
  completed_at TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES sessions(id),
  plan_id UUID REFERENCES plans(id),
  enrollment_type VARCHAR(50) NOT NULL,
  life_event_type VARCHAR(100),
  effective_date TIMESTAMP,
  coverage_type VARCHAR(50) NOT NULL,
  dependents JSONB DEFAULT '[]',
  voluntary_benefits UUID[],
  hsa_contribution_annual DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO companies (id, name, slug, logo_url, primary_color, secondary_color, settings) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Acme Corporation', 'acme', '/logos/acme.png', '#0D9488', '#6366F1', '{"enrollment_start": "2024-11-01", "enrollment_end": "2024-11-30", "plan_year": 2025}'),
('550e8400-e29b-41d4-a716-446655440002', 'TechStart Inc', 'techstart', '/logos/techstart.png', '#2563EB', '#7C3AED', '{"enrollment_start": "2024-11-15", "enrollment_end": "2024-12-15", "plan_year": 2025}');

-- Demo admin user (password: admin123)
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role) VALUES
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 'admin@acme.com', '$2a$10$AfANlYtTwbIu/Be0dXQWBuM/A4tnAtIY/AxrhOSEUvll90auyeZ52', 'Admin', 'User', 'admin'),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'employee@acme.com', '$2a$10$AfANlYtTwbIu/Be0dXQWBuM/A4tnAtIY/AxrhOSEUvll90auyeZ52', 'John', 'Employee', 'employee');

-- Health plans for Acme Corporation
INSERT INTO plans (id, company_id, name, type, network, description, highlights, warnings, premiums, deductibles, oop_max, copays, coinsurance, hsa_eligible, hsa_employer_contribution, fsa_eligible, fsa_employer_contribution, rx_tiers, requires_referral, requires_pcp) VALUES
(
    '550e8400-e29b-41d4-a716-446655440100',
    '550e8400-e29b-41d4-a716-446655440001',
    'HDHP with HSA',
    'HDHP',
    'BlueCross BlueShield',
    'High-deductible plan with Health Savings Account. Best for healthy individuals who want to save on premiums and build tax-advantaged savings.',
    ARRAY['Lowest monthly premium', 'HSA with employer contribution', 'Preventive care 100% covered', '24/7 telehealth included'],
    ARRAY['Higher upfront costs before coverage kicks in', 'Best if you rarely need medical care'],
    '{"employee": 85, "employee_spouse": 200, "employee_children": 170, "family": 320}',
    '{"individual": 1500, "family": 3000}',
    '{"individual": 4000, "family": 8000}',
    '{"pcp": 0, "specialist": 0, "urgent_care": 0, "er": 0, "telehealth": 0}',
    20,
    true,
    '{"individual": 500, "family": 1000}',
    false,
    '{}',
    '{"generic": 10, "preferred": 35, "non_preferred": 70, "specialty": 150}',
    false,
    false
),
(
    '550e8400-e29b-41d4-a716-446655440101',
    '550e8400-e29b-41d4-a716-446655440001',
    'PPO Standard',
    'PPO',
    'Aetna',
    'Balanced plan with moderate premiums and copays. Good flexibility to see any provider without referrals.',
    ARRAY['See any doctor without referral', 'Predictable copays', 'Lower deductible than HDHP', 'Good for moderate healthcare users'],
    ARRAY['Higher premium than HDHP', 'No HSA eligibility'],
    '{"employee": 180, "employee_spouse": 380, "employee_children": 340, "family": 520}',
    '{"individual": 500, "family": 1000}',
    '{"individual": 3000, "family": 6000}',
    '{"pcp": 25, "specialist": 50, "urgent_care": 75, "er": 250, "telehealth": 15}',
    20,
    false,
    '{}',
    true,
    '{"individual": 250, "family": 500}',
    '{"generic": 15, "preferred": 40, "non_preferred": 80, "specialty": 200}',
    false,
    false
),
(
    '550e8400-e29b-41d4-a716-446655440102',
    '550e8400-e29b-41d4-a716-446655440001',
    'PPO Plus',
    'PPO',
    'Aetna',
    'Premium plan with lowest out-of-pocket costs. Ideal for those with ongoing health needs or expecting significant medical expenses.',
    ARRAY['Lowest deductible', 'Richest coverage', 'Best for families with health needs', 'Includes vision and dental basics'],
    ARRAY['Highest monthly premium', 'May be more than needed for healthy individuals'],
    '{"employee": 280, "employee_spouse": 560, "employee_children": 500, "family": 750}',
    '{"individual": 250, "family": 500}',
    '{"individual": 2000, "family": 4000}',
    '{"pcp": 15, "specialist": 35, "urgent_care": 50, "er": 150, "telehealth": 0}',
    10,
    false,
    '{}',
    true,
    '{"individual": 250, "family": 500}',
    '{"generic": 10, "preferred": 30, "non_preferred": 60, "specialty": 150}',
    false,
    false
),
(
    '550e8400-e29b-41d4-a716-446655440103',
    '550e8400-e29b-41d4-a716-446655440001',
    'HMO Value',
    'HMO',
    'Kaiser Permanente',
    'Lower-cost option with coordinated care through a primary care physician. All care managed within the Kaiser network.',
    ARRAY['Low monthly premium', 'Coordinated care model', 'No claim forms', 'Integrated pharmacy'],
    ARRAY['Must stay in-network', 'Need referrals for specialists', 'Limited provider choice'],
    '{"employee": 120, "employee_spouse": 260, "employee_children": 230, "family": 380}',
    '{"individual": 750, "family": 1500}',
    '{"individual": 3500, "family": 7000}',
    '{"pcp": 20, "specialist": 40, "urgent_care": 50, "er": 200, "telehealth": 10}',
    20,
    false,
    '{}',
    true,
    '{"individual": 250, "family": 500}',
    '{"generic": 10, "preferred": 35, "non_preferred": 70, "specialty": 175}',
    true,
    true
);

-- Prescriptions database
INSERT INTO prescriptions (id, name, generic_name, brand_names, drug_class, default_tier, avg_monthly_cost, requires_prior_auth, has_generic, is_specialty) VALUES
('550e8400-e29b-41d4-a716-446655440200', 'Metformin', 'Metformin HCL', ARRAY['Glucophage'], 'Diabetes', 'generic', 15.00, false, true, false),
('550e8400-e29b-41d4-a716-446655440201', 'Lisinopril', 'Lisinopril', ARRAY['Zestril', 'Prinivil'], 'Blood Pressure', 'generic', 12.00, false, true, false),
('550e8400-e29b-41d4-a716-446655440202', 'Atorvastatin', 'Atorvastatin Calcium', ARRAY['Lipitor'], 'Cholesterol', 'generic', 18.00, false, true, false),
('550e8400-e29b-41d4-a716-446655440203', 'Omeprazole', 'Omeprazole', ARRAY['Prilosec'], 'Acid Reflux', 'generic', 20.00, false, true, false),
('550e8400-e29b-41d4-a716-446655440204', 'Levothyroxine', 'Levothyroxine Sodium', ARRAY['Synthroid'], 'Thyroid', 'generic', 15.00, false, true, false),
('550e8400-e29b-41d4-a716-446655440205', 'Amlodipine', 'Amlodipine Besylate', ARRAY['Norvasc'], 'Blood Pressure', 'generic', 14.00, false, true, false),
('550e8400-e29b-41d4-a716-446655440206', 'Albuterol', 'Albuterol Sulfate', ARRAY['ProAir', 'Ventolin'], 'Asthma', 'preferred', 35.00, false, false, false),
('550e8400-e29b-41d4-a716-446655440207', 'Symbicort', 'Budesonide/Formoterol', ARRAY['Symbicort'], 'Asthma', 'non_preferred', 350.00, true, false, false),
('550e8400-e29b-41d4-a716-446655440208', 'Ozempic', 'Semaglutide', ARRAY['Ozempic', 'Wegovy'], 'Diabetes/Weight Loss', 'specialty', 950.00, true, false, true),
('550e8400-e29b-41d4-a716-446655440209', 'Humira', 'Adalimumab', ARRAY['Humira'], 'Autoimmune', 'specialty', 6500.00, true, false, true),
('550e8400-e29b-41d4-a716-446655440210', 'Eliquis', 'Apixaban', ARRAY['Eliquis'], 'Blood Thinner', 'non_preferred', 550.00, false, false, false),
('550e8400-e29b-41d4-a716-446655440211', 'Jardiance', 'Empagliflozin', ARRAY['Jardiance'], 'Diabetes', 'non_preferred', 580.00, true, false, false),
('550e8400-e29b-41d4-a716-446655440212', 'Xarelto', 'Rivaroxaban', ARRAY['Xarelto'], 'Blood Thinner', 'non_preferred', 520.00, false, false, false),
('550e8400-e29b-41d4-a716-446655440213', 'Gabapentin', 'Gabapentin', ARRAY['Neurontin'], 'Nerve Pain', 'generic', 25.00, false, true, false),
('550e8400-e29b-41d4-a716-446655440214', 'Sertraline', 'Sertraline HCL', ARRAY['Zoloft'], 'Antidepressant', 'generic', 15.00, false, true, false),
('550e8400-e29b-41d4-a716-446655440215', 'Duloxetine', 'Duloxetine HCL', ARRAY['Cymbalta'], 'Antidepressant', 'preferred', 40.00, false, false, false);

-- Voluntary benefits for Acme
INSERT INTO voluntary_benefits (id, company_id, name, type, description, monthly_cost_range, coverage_details) VALUES
('550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440001', 'Accident Insurance', 'accident', 'Cash benefits for accidental injuries, covering emergency treatment, hospital stays, and recovery.', '{"employee": {"min": 8, "max": 25}, "family": {"min": 20, "max": 60}}', '{"er_benefit": 250, "hospital_admission": 1000, "fracture": 500, "ambulance": 200}'),
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', 'Critical Illness', 'critical_illness', 'Lump-sum payment upon diagnosis of covered critical illnesses like cancer, heart attack, or stroke.', '{"employee": {"min": 15, "max": 50}, "family": {"min": 35, "max": 100}}', '{"cancer": 25000, "heart_attack": 25000, "stroke": 25000, "major_organ_failure": 25000}'),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440001', 'Supplemental Life Insurance', 'life', 'Additional life insurance coverage beyond the company-provided basic coverage.', '{"per_10k": 2.50}', '{"max_coverage": 500000, "spouse_coverage": true, "child_coverage": true}'),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440001', 'Short-Term Disability', 'disability', 'Income replacement if you cannot work due to illness or injury.', '{"percentage_of_salary": 1.2}', '{"benefit_percentage": 60, "max_weekly": 2500, "waiting_period_days": 14, "benefit_duration_weeks": 26}'),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440001', 'Legal Services', 'legal', 'Access to attorneys for personal legal matters at no additional cost.', '{"employee": {"min": 10, "max": 20}}', '{"will_preparation": true, "real_estate": true, "family_law": true, "traffic_violations": true}');
