# Ledger System Setup Guide

This document explains how to set up the ledger system with a Supabase PostgreSQL database.

## Prerequisites

- Node.js and npm installed
- Supabase account with a PostgreSQL database
- Access to the Supabase database credentials

## Quick Setup

The easiest way to set up the ledger system is to run the PowerShell script:

```powershell
.\setup-ledger-db.ps1
```

This script will guide you through the entire setup process.

## Manual Setup Steps

If you prefer to set up the system manually, follow these steps:

### 1. Set up the Supabase connection

Run the following command to create a `.env` file with the correct connection strings:

```bash
node setup-supabase-connection.js
```

Then edit the `.env` file to replace `[YOUR-PASSWORD]` with your actual Supabase database password.

### 2. Test the connection

Run the following command to test the connection to the Supabase database:

```bash
node test-supabase-connection.js
```

If the connection fails, check the error messages and make sure:

- Your password is correct
- Your IP address is allowed in the Supabase dashboard
- The connection string uses `sslmode=disable`

### 3. Generate Prisma client and push schema

Run the following command to generate the Prisma client and push the schema to the database:

```bash
node setup-ledger-schema.js
```

This will:

- Generate the Prisma client for the ledger schema
- Push the schema to the database
- Update the `ledger-db.ts` file to use the real database

### 4. Create test data

Run the following command to create test data in the ledger database:

```bash
node create-test-ledger-data.js
```

### 5. Start the application

Run the following command to start the application:

```bash
npm run dev
```

## Troubleshooting

### Connection Issues

If you're having connection issues, try the following:

1. Make sure `sslmode=disable` is in your connection strings
2. Check if your IP address is allowed in the Supabase dashboard
3. Verify your database credentials
4. Try using the direct connection URL instead of the pooler connection

### Schema Issues

If you're having schema issues, try the following:

1. Run `npx prisma db push --schema=prisma/schema-ledger.prisma --force-reset` to reset the schema
2. Check if the schema exists in the database
3. Make sure the Prisma client is generated correctly

### Mock Data

If you want to use mock data instead of a real database, set `useMockDataForTesting = true` in `app/lib/ledger-db.ts`.

## Environment Variables

The following environment variables are used for the ledger system:

- `LEDGER_DATABASE_URL`: The connection string for the ledger database (pooled connection)
- `LEDGER_DIRECT_URL`: The direct connection string for migrations
- `DATABASE_URL`: The main database connection string

## Files

- `setup-supabase-connection.js`: Creates the `.env` file and updates `ledger-db.ts`
- `test-supabase-connection.js`: Tests the connection to the Supabase database
- `setup-ledger-schema.js`: Generates the Prisma client and pushes the schema
- `create-test-ledger-data.js`: Creates test data in the ledger database
- `setup-ledger-db.ps1`: PowerShell script to run the entire setup process
