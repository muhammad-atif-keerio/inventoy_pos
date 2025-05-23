# Connect Ledger System to Supabase: Step by Step Guide

This guide will help you properly connect your ledger system to Supabase and ensure data is flowing correctly.

## Prerequisites

- Supabase account and a project
- Your Supabase database password
- Your Supabase project ID

## Step 1: Set Environment Variables

Create or update your `.env` file at the project root with these variables:

```bash
# Main Database URL
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"

# Ledger Database URLs
LEDGER_DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=ledger"
LEDGER_DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres?schema=ledger"
```

Replace:

- `[YOUR-PASSWORD]` with your actual Supabase database password
- `[YOUR-PROJECT-ID]` with your Supabase project ID (found in the connection string in Settings → Database)

## Step 2: Add Your IP to Allowlist

1. Go to your Supabase project dashboard
2. Navigate to Settings → Database
3. Scroll to "Connection Pooling"
4. Click "Edit" next to "IP Allow List"
5. Add your current IP address

## Step 3: Generate Ledger Client

Run the setup script to generate the Prisma client for the ledger schema:

```bash
node fix-ledger-setup.js
```

This will:

- Check your environment variables
- Generate the ledger-specific Prisma client
- Create it in the correct location

## Step 4: Push Schema to Supabase

Run the following command to create the necessary tables in your Supabase database:

```bash
npx prisma db push --schema=prisma/schema-ledger.prisma
```

## Step 5: Test the Connection

Run the connection test script:

```bash
node check-supabase-connection.js
```

This will verify that:

- Your .env variables are correctly set
- Your database connection is working
- The ledger schema exists
- Tables are properly created

## Step 6: Add Test Data (Optional)

Run this script to create some test data:

```bash
node create-test-ledger-data.js
```

## Step 7: Modify Ledger Client

Make sure the mock data mode is turned off in `app/lib/ledger-db.ts`:

```typescript
// TEMPORARILY FORCE MOCK DATA FOR TESTING
const useMockDataForTesting = false; // Should be false to use real database
```

## Step 8: Restart the Development Server

```bash
npm run dev
```

## Step 9: Verify in the UI

1. Go to `/ledger` in your browser
2. Verify that real data appears in the table and KPIs
3. Try creating new entries through the UI

## Troubleshooting

If you encounter issues:

1. **Connection Errors**:

    - Double-check your password and project ID
    - Verify your IP is in the allowlist
    - Confirm the port is 6543 for pooled connections

2. **Schema Issues**:

    - Run `npx prisma db push --schema=prisma/schema-ledger.prisma --force-reset` (caution: this will reset your ledger data)

3. **No Data Showing**:

    - Check browser console for errors
    - Verify `useMockDataForTesting` is set to `false`
    - Add test data using the script

4. **SSL Certificate Errors**:

    - Add `&sslmode=require` to your connection strings

5. **Database Client Issues**:
    - Run `node fix-ledger-setup.js` again to regenerate the client

## Additional Resources

- [Prisma with Supabase Guide](https://supabase.com/docs/guides/integrations/prisma)
- [Database Connection Issues](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Prisma Schema Documentation](https://www.prisma.io/docs/orm/prisma-schema)
