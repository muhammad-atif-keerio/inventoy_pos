# Ledger Database Connection Setup

Follow these steps to connect your ledger system to Supabase:

## 1. Update your .env file

Ensure your `.env` file in the project root has these variables:

```
# Main Database URL - Supabase connection
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"

# Ledger Database URLs - Using the same Supabase instance with ledger schema
LEDGER_DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=ledger"
LEDGER_DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres?schema=ledger"
```

Replace:

- `[YOUR-PASSWORD]` with your actual Supabase database password
- `[YOUR-PROJECT-ID]` with your Supabase project ID

## 2. Run the fix-ledger-setup script

```bash
node fix-ledger-setup.js
```

This will:

- Generate the ledger Prisma client
- Check for environment variables
- Create the client in the correct location

## 3. Push the schema to Supabase

```bash
npx prisma db push --schema=prisma/schema-ledger.prisma
```

This will create the necessary tables in your Supabase database.

## 4. Create test data (optional)

Run the test data creation script:

```bash
node create-test-ledger-data.js
```

## 5. Restart your development server

```bash
npm run dev
```

## Troubleshooting

If connection issues persist:

1. Check your IP allowlist in Supabase Dashboard -> Settings -> Database
2. Verify the port is correct (6543 for pooled connections, 5432 for direct)
3. Make sure SSL is enabled in your connection strings
4. Look for errors in the console - they often provide helpful information
