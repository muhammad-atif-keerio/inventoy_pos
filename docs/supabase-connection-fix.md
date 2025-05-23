# Supabase Connection Fix

Based on our tests, we found the solution to the connection issues with your Supabase database.

## The Solution: Disable SSL for Testing

Update your `.env` file with these modified connection strings:

```
# Main Database URL - Supabase connection
DATABASE_URL="postgresql://postgres.yfxoalablmripacasgct:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=disable"
DIRECT_URL="postgresql://postgres.yfxoalablmripacasgct:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"

# Ledger Database URLs
LEDGER_DATABASE_URL="postgresql://postgres.yfxoalablmripacasgct:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=ledger&sslmode=disable"
LEDGER_DIRECT_URL="postgresql://postgres.yfxoalablmripacasgct:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres?schema=ledger"
```

The key change is adding `&sslmode=disable` to the connection strings for the pooler connections.

## Important Security Note

This solution works for local development, but for production you should:

1. Properly configure SSL with your Supabase project
2. Enable SSL verification (`sslmode=require` instead of `sslmode=disable`)
3. Make sure your IP address is in the Supabase allowlist

## Testing the Connection

You can verify the connection works using:

```bash
node test-alt-connection.js
```

## For Your App

The Prisma client connection should now work properly. To make sure it's using the real database and not mock data:

1. Double-check that `useMockDataForTesting = false` in `app/lib/ledger-db.ts`
2. Restart your development server

## Creating Test Data

Create initial data either through the application UI or using:

```bash
node create-test-ledger-data.js
```

Make sure to modify this script to use the `sslmode=disable` parameter if you encounter SSL-related errors.
