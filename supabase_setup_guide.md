# Supabase Setup Guide for AI Catalog Agent

## Prerequisites
- Supabase account (sign up at https://supabase.com)
- Node.js and npm installed
- Git repository cloned

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `ai-catalog-agent`
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait for project to be ready (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - Project URL
   - Project API keys (anon/public and service_role)
3. Go to Settings > Database
4. Copy the connection string

## Step 3: Run Database Migration

### Option A: Using Supabase SQL Editor
1. Go to SQL Editor in your Supabase dashboard
2. Create a new query
3. Copy and paste the entire content from `supabase_migration.sql`
4. Click "Run" to execute the migration

### Option B: Using psql (Command Line)
```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration file
\i supabase_migration.sql
```

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
   SUPABASE_ANON_KEY="[YOUR-SUPABASE-ANON-KEY]"
   SUPABASE_SERVICE_ROLE_KEY="[YOUR-SUPABASE-SERVICE-ROLE-KEY]"
   ```

## Step 5: Update Prisma Configuration

Update your `prisma/schema.prisma` to use the Supabase connection:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Step 6: Generate Prisma Client

```bash
cd server
npx prisma generate
```

## Step 7: Verify Setup

1. Check if tables were created in Supabase dashboard > Table Editor
2. Test the connection:
   ```bash
   cd server
   npm run test:db  # If you have a test script
   ```

## Step 8: Configure Row Level Security (RLS)

The migration already includes RLS policies, but you can customize them:

1. Go to Authentication > Policies in Supabase dashboard
2. Review and modify policies as needed
3. Test with different user roles

## Step 9: Set up Authentication (Optional)

If using Supabase Auth instead of custom JWT:

1. Go to Authentication > Settings
2. Configure providers (Email, Google, etc.)
3. Update your client code to use Supabase Auth

## Troubleshooting

### Common Issues:

1. **Connection refused**: Check if your IP is whitelisted in Supabase
2. **Permission denied**: Ensure you're using the correct credentials
3. **Table already exists**: Drop existing tables or use a fresh project
4. **RLS blocking queries**: Temporarily disable RLS for testing

### Useful Commands:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS status
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Disable RLS temporarily (for testing)
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSettings" DISABLE ROW LEVEL SECURITY;
```

## Production Considerations

1. **Environment Variables**: Use proper secrets management
2. **Connection Pooling**: Consider using Supabase's connection pooler
3. **Backups**: Enable automatic backups in Supabase
4. **Monitoring**: Set up alerts for database performance
5. **Security**: Review and test all RLS policies thoroughly

## Next Steps

1. Test your application with the new Supabase setup
2. Configure additional services (AI APIs, image upload, etc.)
3. Deploy your application
4. Monitor performance and optimize queries

## Support

- Supabase Documentation: https://supabase.com/docs
- Prisma Documentation: https://www.prisma.io/docs
- Project Issues: Create an issue in your repository