# Shopify Sync Fix - Database Migration

## Problem
Product edits were not syncing to Shopify because:
1. The database didn't store Shopify product IDs
2. The update endpoint didn't call Shopify's update API

## Solution
Added `shopifyProductId` and `shopifyUrl` fields to track Shopify products.

## Migration Required

Run this SQL in your Supabase SQL Editor:

```sql
-- Add Shopify tracking fields to Product table
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "shopifyProductId" TEXT,
ADD COLUMN IF NOT EXISTS "shopifyUrl" TEXT;
```

## What Changed

1. **Database Schema**: Added `shopifyProductId` and `shopifyUrl` columns to Product table
2. **Product Creation**: Now stores Shopify product ID and URL after syncing
3. **Product Updates**: Now calls `updateProductInShopify()` to sync changes to Shopify
4. **New Function**: Added `updateProductInShopify()` in `api/shopify/sync.js` to handle updates

## Testing

After running the migration:
1. Create a new product - it will sync to Shopify and store the ID
2. Edit the product - changes will now sync to Shopify automatically
3. Check Shopify admin to verify the updates appear

## Note for Existing Products

Existing products in your database won't have `shopifyProductId` values. You have two options:

1. **Manual**: Delete and recreate them (they'll get Shopify IDs)
2. **Script**: Run a one-time sync script to match existing products with Shopify products by name/title

For option 2, you can use the Shopify API to fetch all products and match them by title to your database products.
