# Ledger System Guide

This guide provides comprehensive information about the POS system's ledger module, including setup instructions, troubleshooting common issues, and understanding how the system works.

## Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Database Configuration](#database-configuration)
4. [Troubleshooting](#troubleshooting)
5. [Working with Supabase](#working-with-supabase)
6. [Development vs. Production](#development-vs-production)
7. [System Architecture](#system-architecture)

## Overview

The ledger system is a module within the POS application that provides accounting and financial management capabilities. It includes:

- Khata (account book) management
- Party (vendor/customer) tracking
- Bill and transaction recording
- Bank account management
- Inventory tracking
- Financial reporting and KPIs

The system uses a separate Prisma schema (`schema-ledger.prisma`) and database connection to isolate the ledger functionality from the main application.

## Setup Instructions

Follow these steps to set up the ledger system:

### 1. Configure Environment Variables

Ensure your `.env` file contains the following variables:

```
# Connection pooling URL for regular queries (with correct port 6543)
LEDGER_DATABASE_URL="postgresql://username:password@hostname:6543/database?pgbouncer=true&schema=ledger&sslmode=disable"

# Direct connection URL for migrations (using port 5432)
LEDGER_DIRECT_URL="postgresql://username:password@hostname:5432/database?schema=ledger&sslmode=disable"
```

### 2. Generate Prisma Client

Generate the ledger-specific Prisma client:

```bash
npx prisma generate --schema=prisma/schema-ledger.prisma
```

### 3. Push Schema to Database

Create the database tables:

```bash
npx prisma db push --schema=prisma/schema-ledger.prisma
```

### 4. Create Test Data (Optional)

Populate the database with test data:

```bash
node create-test-ledger-data.js
```

### 5. Verify Setup

Run the verification script to ensure everything is working:

```bash
node verify-ledger-system.js
```

## Database Configuration

### Supabase Connection Details

When using Supabase as your database provider, note these important details:

1. **Connection Pooling**: Use port `6543` for regular queries with the `pgbouncer=true` parameter
2. **Direct Connection**: Use port `5432` for migrations and schema changes
3. **SSL Mode**: Add `sslmode=disable` for development or configure proper SSL certificates for production

### Example Connection Strings

```
# For connection pooling (regular queries)
postgresql://postgres.user:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=ledger&sslmode=disable

# For direct connection (migrations)
postgresql://postgres.user:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=ledger&sslmode=disable
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Errors

**Symptoms**: Error messages about connection failures, timeouts, or authentication issues.

**Solutions**:

- Verify connection strings in `.env` file
- Check that you're using the correct ports (6543 for pooling, 5432 for direct)
- Add `sslmode=disable` for development environments
- Ensure your IP address is allowed in Supabase's access controls

#### 2. Schema Issues

**Symptoms**: Errors about missing tables or columns.

**Solutions**:

- Run `npx prisma db push --schema=prisma/schema-ledger.prisma`
- Check for schema drift between your local schema and the database
- Run `node fix-ledger-schema.js` to update enum types

#### 3. Prisma Client Issues

**Symptoms**: Errors about missing Prisma client or methods.

**Solutions**:

- Run `npx prisma generate --schema=prisma/schema-ledger.prisma`
- Check that the client is being generated at `node_modules/@prisma/ledger-client`
- Run `node fix-ledger-setup.js` to fix common setup issues

#### 4. Mock Data Mode

**Symptoms**: Only seeing sample data, not real data from database.

**Solutions**:

- Check `app/lib/ledger-db.ts` to ensure `useMockDataForTesting` is set to `false`
- Verify database connection is working with `node test-connection.js`
- Ensure environment variables are correctly set

### Diagnostic Commands

Use these commands to diagnose issues:

```bash
# Test database connection
node test-connection.js

# Fix common setup issues
node fix-ledger-setup.js

# Create test data
node create-test-ledger-data.js

# Verify entire system
node verify-ledger-system.js
```

## Working with Supabase

### Supabase Configuration

1. **Database Settings**:

    - Navigate to Supabase Dashboard > Project Settings > Database
    - Ensure the "Connection Pooling" setting is enabled
    - Note the connection strings for both direct and pooled connections

2. **SSL Configuration**:

    - For development: Use `sslmode=disable` in connection strings
    - For production: Configure proper SSL certificates

3. **Schema Management**:
    - The ledger system uses a dedicated schema named `ledger`
    - All tables are created within this schema
    - You can view tables in Supabase's Table Editor by selecting the "ledger" schema

### Supabase Connection Troubleshooting

If you're having trouble connecting to Supabase:

1. Check that your IP is whitelisted in Supabase's network restrictions
2. Verify that the database password is correct
3. Try connecting with a different PostgreSQL client to isolate the issue
4. Check Supabase's status page for any ongoing service issues

## Development vs. Production

### Development Mode

In development mode, the system has several fallbacks:

1. If database connection fails, it will use mock data
2. If environment variables are missing, it will use default values
3. If the Prisma client isn't found, it will use a mock client

To force mock data mode (for UI development without a database):

```bash
node run-with-mock-data.js
```

### Production Mode

In production:

1. All environment variables must be properly set
2. Database connection is required (no mock data fallback)
3. SSL should be properly configured (not disabled)
4. Error handling is more strict

## System Architecture

### Component Overview

The ledger system consists of these key components:

1. **Prisma Schema** (`prisma/schema-ledger.prisma`): Defines the database structure
2. **Prisma Client** (`node_modules/@prisma/ledger-client`): Generated client for database access
3. **Ledger DB Adapter** (`app/lib/ledger-db.ts`): Provides a unified interface for database operations
4. **API Routes** (`app/api/ledger/`): Backend endpoints for data access
5. **UI Components** (`app/(dashboard)/ledger/`): Frontend interface

### Data Flow

1. UI components request data via API routes
2. API routes use the ledger DB adapter to access the database
3. The adapter uses the Prisma client to execute database operations
4. Results are returned to the UI for display

### Mock Data Mode

When mock data is enabled:

1. The system bypasses the real database connection
2. Sample data is generated in memory
3. All operations simulate success but don't persist data

This allows for UI development without a working database connection.

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase PostgreSQL Documentation](https://supabase.com/docs/guides/database)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)

For further assistance, contact the development team or submit an issue in the project repository.
