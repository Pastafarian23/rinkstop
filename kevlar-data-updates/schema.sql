-- Property Records Table for DuPage County, IL
-- Add to your existing database schema

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin VARCHAR(50) UNIQUE NOT NULL, -- Property Index Number
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    zip VARCHAR(10) NOT NULL,
    county VARCHAR(50) NOT NULL DEFAULT 'dupage',
    owner VARCHAR(255),
    mailing_address VARCHAR(500),
    assessed_value INTEGER,
    market_value INTEGER,
    tax_amount INTEGER,
    status VARCHAR(20) DEFAULT 'active', -- active, foreclosure, tax-lien, sold
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_properties_county_zip ON properties(county, zip);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(county, city);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_assessed_value ON properties(assessed_value);
CREATE INDEX IF NOT EXISTS idx_properties_pin ON properties(pin);

-- Usage tracking table (for API rate limiting)
CREATE TABLE IF NOT EXISTS property_api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    api_key_id UUID NOT NULL,
    query_type VARCHAR(50) NOT NULL, -- 'search', 'detail', 'bulk'
    result_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_month ON property_api_usage(user_id, DATE_TRUNC('month', created_at));

-- NOTE: Run this in your Replit database (likely Neon/PostgreSQL)
-- Adjust syntax if using a different database provider