# How to Fix Ledger Functionality Issues

If you're experiencing issues with the ledger functionality in the application, follow these steps to fix them.

## Quick Fix

Run the automatic setup script:

```bash
npm run setup:ledger
```

This will:

1. Create or fix the `.env` file with the necessary ledger database settings
2. Generate the ledger Prisma client
3. Push the schema to the database (if possible)
4. Provide an option to start the development server

## Manual Fix Steps

If the automatic fix doesn't work, follow these manual steps:

### 1. Set up Environment Variables

Create or update your `.env` file to include these variables:

```
# LEDGER DATABASE CONNECTION
LEDGER_DATABASE_URL="${DATABASE_URL}&schema=ledger"
LEDGER_DIRECT_URL="${DIRECT_URL}&schema=ledger"
```

### 2. Generate the Ledger Prisma Client

Run:

```bash
npm run generate:ledger
# or
node generate-ledger-client.js
```

This will create the necessary Prisma client for the ledger schema.

### 3. Push the Schema (Optional)

If you want to use a real database (not mock data), run:

```bash
npm run db:push:ledger
# or
npx prisma db push --schema=prisma/schema-ledger.prisma
```

### 4. Restart the Development Server

```bash
npm run dev
```

## Troubleshooting

### Issue: Ledger page shows "Failed to load data"

This usually means:

- The ledger Prisma client wasn't generated
- The environment variables are missing or incorrect

Solution:

1. Check if the directory `node_modules/@prisma/ledger-client` exists
2. If not, run `npm run generate:ledger`
3. Check your `.env` file for the `LEDGER_DATABASE_URL` variable

### Issue: "Error: Cannot find module '@prisma/ledger-client'"

This means the ledger client hasn't been generated.

Solution:

1. Run `npm run generate:ledger`
2. Restart your development server

### Issue: Database connection errors

If you're getting database connection errors:

1. Check your database credentials in `.env`
2. Ensure your database is running and accessible
3. For development, you can ignore these errors as the system will use mock data

### Issue: Empty data or missing functionality

If the ledger page loads but shows no data:

1. The system is likely using mock data (which is normal in development)
2. If you need real data, make sure you've pushed the schema with `npm run db:push:ledger`

## Operating in Mock Mode

The ledger system is designed to work in "mock mode" when:

- No database connection is available
- The ledger Prisma client isn't generated

This allows you to develop and test the UI without setting up a real database. In mock mode:

- Sample data will be generated automatically
- All CRUD operations will simulate success but won't persist data

To force mock mode (for testing), temporarily rename or move the `node_modules/@prisma/ledger-client` directory.

## Need More Help?

If you're still experiencing issues, see the full documentation in `README-LEDGER.md` or reach out to the development team.
