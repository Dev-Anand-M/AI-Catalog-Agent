# How to Get Supabase Database URLs

## Step-by-Step Guide

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard
- Sign in to your account
- Select your project (or create one if you haven't)

### 2. Navigate to Database Settings
- In your project dashboard, click on **Settings** (gear icon) in the left sidebar
- Click on **Database** from the settings menu

### 3. Find Connection Strings Section
Look for the **Connection string** section. You'll see several options:

#### Option 1: Connection Pooling (Recommended for Production)
```
postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

#### Option 2: Direct Connection
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres
```

### 4. Get Your Database Password
- If you forgot your password, click **Reset database password**
- **Important**: Save this password securely - you'll need it for the connection strings

### 5. Configure Your Environment Variables

#### For Most Use Cases (Recommended):
```env
# Use the same URL for both (Connection Pooling)
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

#### For High-Performance Applications:
```env
# Pooled connection for regular queries
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Direct connection for migrations and schema changes
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres"
```

## What Each URL Does

### DATABASE_URL
- **Purpose**: Regular database operations (queries, inserts, updates)
- **Uses**: Connection pooling for better performance
- **Port**: 6543 (pooled)
- **Best for**: Production applications with multiple concurrent users

### DIRECT_URL  
- **Purpose**: Database migrations, schema changes, administrative tasks
- **Uses**: Direct connection to database
- **Port**: 5432 (direct)
- **Best for**: Prisma migrations, database administration

## Quick Copy-Paste Template

Replace the placeholders with your actual values:

```env
# Replace these placeholders:
# [PROJECT-REF] = Your project reference (e.g., abcdefghijklmnop)
# [YOUR-PASSWORD] = Your database password

# Option 1: Simple setup (use pooled for both)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Option 2: Optimized setup (pooled + direct)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## How to Find Your Project Reference

Your project reference is visible in:
1. **Project URL**: `https://[PROJECT-REF].supabase.co`
2. **Database settings page** in the connection strings
3. **Project settings** → **General** → **Reference ID**

## Example (with fake credentials)

```env
# Example with project reference "abcdefghijklmnop" and password "mySecretPassword123"
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:mySecretPassword123@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:mySecretPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

## Troubleshooting

### Connection Issues:
1. **Check password**: Make sure you're using the correct database password
2. **Check project reference**: Verify the project ID in the URL
3. **Check region**: Your pooler URL might be in a different region (us-east-1, eu-west-1, etc.)
4. **IP whitelist**: Supabase allows all IPs by default, but check if you have restrictions

### Test Your Connection:
```bash
# Test with psql (if installed)
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Or test with Prisma
npx prisma db pull
```

## Security Notes

- **Never commit** these URLs to version control
- **Use environment variables** in production
- **Rotate passwords** regularly
- **Use connection pooling** for production applications
- **Monitor connection usage** in Supabase dashboard