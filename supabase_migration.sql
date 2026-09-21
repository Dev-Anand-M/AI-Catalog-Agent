-- AI Catalog Agent - Complete Supabase Migration Schema
-- This file contains the complete database schema for Supabase PostgreSQL
-- Safe to run multiple times - includes IF NOT EXISTS checks

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users table
CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Products table
CREATE TABLE IF NOT EXISTS "Product" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "imageUrl" TEXT,
    "shopifyProductId" VARCHAR(255),
    "shopifyUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Product_userId_fkey'
    ) THEN
        ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Create PaymentSettings table
CREATE TABLE IF NOT EXISTS "PaymentSettings" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER UNIQUE NOT NULL,
    "upiData" JSONB,
    "bankAccount" JSONB,
    "qrCodeUrl" TEXT,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'PaymentSettings_userId_fkey'
    ) THEN
        ALTER TABLE "PaymentSettings" ADD CONSTRAINT "PaymentSettings_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance (with IF NOT EXISTS)
DO $$
BEGIN
    -- Index for product userId
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_userId') THEN
        CREATE INDEX "idx_product_userId" ON "Product"("userId");
    END IF;
    
    -- Index for product category
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_category') THEN
        CREATE INDEX "idx_product_category" ON "Product"("category");
    END IF;
    
    -- Index for product createdAt
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_createdAt') THEN
        CREATE INDEX "idx_product_createdAt" ON "Product"("createdAt");
    END IF;
    
    -- Index for user email (might already exist due to UNIQUE constraint)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_email') THEN
        CREATE INDEX "idx_user_email" ON "User"("email");
    END IF;
END $$;

-- Create updated_at trigger function (safe to recreate)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for PaymentSettings updatedAt (drop and recreate to be safe)
DROP TRIGGER IF EXISTS update_payment_settings_updated_at ON "PaymentSettings";
CREATE TRIGGER update_payment_settings_updated_at 
    BEFORE UPDATE ON "PaymentSettings" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for Supabase
-- Enable RLS (safe to run multiple times)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSettings" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
-- RLS Policies for User table
DROP POLICY IF EXISTS "Users can view own profile" ON "User";
CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON "User";
CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for Product table
DROP POLICY IF EXISTS "Users can view own products" ON "Product";
CREATE POLICY "Users can view own products" ON "Product"
    FOR SELECT USING (auth.uid()::text = "userId"::text);

DROP POLICY IF EXISTS "Users can insert own products" ON "Product";
CREATE POLICY "Users can insert own products" ON "Product"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);

DROP POLICY IF EXISTS "Users can update own products" ON "Product";
CREATE POLICY "Users can update own products" ON "Product"
    FOR UPDATE USING (auth.uid()::text = "userId"::text);

DROP POLICY IF EXISTS "Users can delete own products" ON "Product";
CREATE POLICY "Users can delete own products" ON "Product"
    FOR DELETE USING (auth.uid()::text = "userId"::text);

DROP POLICY IF EXISTS "Public can view products for catalog" ON "Product";
CREATE POLICY "Public can view products for catalog" ON "Product"
    FOR SELECT USING (true);

-- RLS Policies for PaymentSettings table
DROP POLICY IF EXISTS "Users can view own payment settings" ON "PaymentSettings";
CREATE POLICY "Users can view own payment settings" ON "PaymentSettings"
    FOR SELECT USING (auth.uid()::text = "userId"::text);

DROP POLICY IF EXISTS "Users can insert own payment settings" ON "PaymentSettings";
CREATE POLICY "Users can insert own payment settings" ON "PaymentSettings"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);

DROP POLICY IF EXISTS "Users can update own payment settings" ON "PaymentSettings";
CREATE POLICY "Users can update own payment settings" ON "PaymentSettings"
    FOR UPDATE USING (auth.uid()::text = "userId"::text);

DROP POLICY IF EXISTS "Users can delete own payment settings" ON "PaymentSettings";
CREATE POLICY "Users can delete own payment settings" ON "PaymentSettings"
    FOR DELETE USING (auth.uid()::text = "userId"::text);

-- Insert sample data (only if tables are empty)
DO $$
BEGIN
    -- Insert sample users only if User table is empty
    IF NOT EXISTS (SELECT 1 FROM "User" LIMIT 1) THEN
        INSERT INTO "User" ("name", "email", "passwordHash") VALUES
        ('Demo User', 'demo@example.com', '$2b$10$example.hash.here'),
        ('Test User', 'test@example.com', '$2b$10$example.hash.here');
    END IF;
    
    -- Insert sample products only if Product table is empty
    IF NOT EXISTS (SELECT 1 FROM "Product" LIMIT 1) THEN
        INSERT INTO "Product" ("userId", "name", "description", "category", "price", "language") VALUES
        (1, 'Sample Product', 'This is a sample product description', 'Electronics', 99.99, 'en'),
        (1, 'Another Product', 'Another sample product', 'Clothing', 49.99, 'en');
    END IF;
END $$;

-- Create views for easier querying (safe to recreate)
CREATE OR REPLACE VIEW "ProductsWithUser" AS
SELECT 
    p.*,
    u."name" as "userName",
    u."email" as "userEmail"
FROM "Product" p
JOIN "User" u ON p."userId" = u."id";

-- Create function for product search (safe to recreate)
CREATE OR REPLACE FUNCTION search_products(search_term TEXT)
RETURNS TABLE (
    id INTEGER,
    "userId" INTEGER,
    name VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2),
    language VARCHAR(10),
    "imageUrl" TEXT,
    "shopifyProductId" VARCHAR(255),
    "shopifyUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM "Product" p
    WHERE 
        p."name" ILIKE '%' || search_term || '%' OR
        p."description" ILIKE '%' || search_term || '%' OR
        p."category" ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;


-- ===========================================================================
-- NEXT STEP: run supabase_enterprise_auth.sql
--
-- That file adds phone-based sign-in and the invitation-only onboarding tables.
-- It is additive and safe to run on an existing database. It lives in its own file
-- so it can be pasted into the Supabase SQL editor on its own, without re-running
-- this whole schema.
-- ===========================================================================