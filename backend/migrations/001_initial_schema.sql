-- Initial schema for TouchCare Benefits Platform
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (multi-tenant support)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#0D9488',
    secondary_color VARCHAR(7) DEFAULT '#6366F1',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, email)
);

-- Health plans table
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- HDHP, PPO, HMO, EPO
    network VARCHAR(100),
    description TEXT,
    highlights TEXT[],
    warnings TEXT[],
    
    -- Premium structure (JSONB for flexibility)
    premiums JSONB NOT NULL,
    -- Example: {"employee": 85, "employee_spouse": 200, "employee_children": 150, "family": 300}
    
    -- Deductibles
    deductibles JSONB NOT NULL,
    -- Example: {"individual": 1500, "family": 3000}
    
    -- Out of pocket maximums
    oop_max JSONB NOT NULL,
    -- Example: {"individual": 4000, "family": 8000}
    
    -- Copays
    copays JSONB DEFAULT '{}',
    -- Example: {"pcp": 25, "specialist": 50, "urgent_care": 75, "er": 250}
    
    -- Coinsurance after deductible (percentage patient pays)
    coinsurance INTEGER DEFAULT 20,
    
    -- HSA eligibility
    hsa_eligible BOOLEAN DEFAULT false,
    hsa_employer_contribution JSONB DEFAULT '{}',
    -- Example: {"individual": 500, "family": 1000}
    
    -- Prescription tiers
    rx_tiers JSONB DEFAULT '{}',
    -- Example: {"generic": 10, "preferred": 35, "non_preferred": 70, "specialty": 150}
    
    -- Network restrictions
    requires_referral BOOLEAN DEFAULT false,
    requires_pcp BOOLEAN DEFAULT false,
    
    is_active BOOLEAN DEFAULT true,
    plan_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles (health/usage information)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Coverage selections
    coverage_type VARCHAR(50), -- employee, employee_spouse, employee_children, family
    dependents JSONB DEFAULT '[]',
    -- Example: [{"relationship": "spouse", "age": 35}, {"relationship": "child", "age": 8}]
    
    -- Health usage patterns
    pcp_visits VARCHAR(20), -- none, 1-2, 3-5, 6+
    specialist_visits VARCHAR(20),
    er_urgent_care VARCHAR(20), -- none, 1, 2+
    planned_procedures TEXT[],
    
    -- Prescriptions
    prescriptions JSONB DEFAULT '[]',
    
    -- Financial preferences
    risk_tolerance VARCHAR(50), -- avoid_surprises, balanced, minimize_premium
    max_surprise_bill INTEGER,
    household_income VARCHAR(50),
    
    -- Calculated fields (cached)
    estimated_annual_costs JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Sessions table (for anonymous users and state persistence)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Mode and progress
    mode VARCHAR(20) DEFAULT 'go', -- counselor, go
    current_step INTEGER DEFAULT 0,
    
    -- Profile data (for anonymous users)
    profile_data JSONB DEFAULT '{}',
    
    -- Selections
    selected_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    comparison_plan_ids UUID[] DEFAULT '{}',
    
    -- Collaboration (spouse comparison)
    is_collaborative BOOLEAN DEFAULT false,
    spouse_session_id UUID REFERENCES sessions(id),
    spouse_profile_data JSONB DEFAULT '{}',
    
    -- Analytics
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prescriptions reference table
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand_names TEXT[],
    drug_class VARCHAR(100),
    
    -- Default tier (can be overridden per company)
    default_tier VARCHAR(50), -- generic, preferred, non_preferred, specialty
    
    -- Estimated costs
    avg_monthly_cost DECIMAL(10, 2),
    avg_90_day_cost DECIMAL(10, 2),
    
    -- Metadata
    requires_prior_auth BOOLEAN DEFAULT false,
    has_generic BOOLEAN DEFAULT false,
    is_specialty BOOLEAN DEFAULT false,
    rxnorm_id VARCHAR(50),
    ndc_codes TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company-specific formulary overrides
CREATE TABLE company_formularies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL,
    copay_override DECIMAL(10, 2),
    requires_prior_auth BOOLEAN,
    notes TEXT,
    UNIQUE(company_id, prescription_id)
);

-- Voluntary benefits
CREATE TABLE voluntary_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- accident, critical_illness, life, disability, etc.
    description TEXT,
    monthly_cost_range JSONB,
    coverage_details JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    
    -- A/B test tracking
    experiment_id VARCHAR(100),
    variant VARCHAR(50),
    
    -- Context
    page VARCHAR(100),
    step INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat conversations (for AI chatbot)
CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    messages JSONB DEFAULT '[]',
    -- Example: [{"role": "user", "content": "...", "timestamp": "..."}, {"role": "assistant", ...}]
    
    context JSONB DEFAULT '{}',
    summary TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollment records
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    
    enrollment_type VARCHAR(50), -- open_enrollment, new_hire, life_event
    life_event_type VARCHAR(100),
    effective_date DATE,
    
    -- Selected options
    coverage_type VARCHAR(50),
    dependents JSONB DEFAULT '[]',
    
    -- Voluntary benefits
    voluntary_benefits UUID[] DEFAULT '{}',
    
    -- HSA elections
    hsa_contribution_annual INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, submitted, confirmed, cancelled
    submitted_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit trail
    decision_journey JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio cache (for ElevenLabs narration)
CREATE TABLE audio_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text_hash VARCHAR(64) UNIQUE NOT NULL,
    voice_id VARCHAR(50) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    audio_url TEXT NOT NULL,
    duration_seconds DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- Indexes
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_plans_company ON plans(company_id);
CREATE INDEX idx_plans_type ON plans(type);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
CREATE INDEX idx_prescriptions_name ON prescriptions(name);
CREATE INDEX idx_prescriptions_generic ON prescriptions(generic_name);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
