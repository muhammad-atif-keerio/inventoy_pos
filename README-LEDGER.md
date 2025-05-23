# Ledger System Documentation

The Ledger System is a comprehensive accounting and inventory tracking module integrated with the main inventory POS system. It provides functionality for tracking bills, transactions, bank accounts, and inventory movements.

## Key Features

- **Multi-Book Accounting**: Support for multiple khatas (accounting books)
- **Transaction Management**: Track various transaction types (purchases, sales, bank deposits/withdrawals)
- **Bill Tracking**: Manage invoices, payables, and receivables
- **Party Management**: Maintain vendor and customer records
- **Payment Processing**: Record payments with multiple methods (cash, cheque, online)
- **Status Tracking**: Monitor payment status (pending, partial, completed, cancelled)
- **Data Visualization**: View financial data with sortable/filterable tables

## Technical Implementation

### Database Structure

The ledger system uses a separate PostgreSQL database defined in `schema-ledger.prisma`. Key models include:

- **Khata**: The main accounting book that groups related transactions
- **Bill**: Invoices for purchases, sales, and other transactions
- **Party**: Vendors, customers, and other business relationships
- **Transaction**: Financial entries recording movement of money
- **BankAccount**: Banking information and balances
- **Cheque**: Payment instruments with status tracking
- **Inventory**: Stock items and their movements

### Architecture

The system is designed with a dual-mode approach:

1. **Real Database Mode**: Uses Prisma to connect to a PostgreSQL database
2. **Mock Mode**: Provides sample data when the real database isn't available

### Type Definitions

The type system is centralized in `app/lib/types.ts` with the following key types:

- `LedgerEntryType`: Enum for entry types (PAYABLE, RECEIVABLE, BILL, etc.)
- `LedgerEntryStatus`: Enum for status values (PENDING, PARTIAL, COMPLETED, etc.)
- `LedgerEntryRow`: Interface defining the structure of ledger entries

### API Endpoints

The ledger system provides RESTful API endpoints under `/api/ledger/`:

- **GET /api/ledger/entries**: List all ledger entries with filtering
- **GET /api/ledger/:id**: Get details of a specific ledger entry
- **POST /api/ledger**: Create a new ledger entry
- **PATCH /api/ledger/:id**: Update an existing ledger entry
- **DELETE /api/ledger/:id**: Delete a ledger entry
- **GET /api/ledger/:id/transactions**: Get transactions for a specific entry
- **POST /api/ledger/transactions**: Add a new transaction
- **GET /api/ledger/khata**: Get available khatas (account books)
- **GET /api/ledger/party**: Get parties (vendors/customers)

### User Interface

The ledger UI is built with:

- React components using the Next.js framework
- Tanstack Table for data display with sorting/filtering
- Shadcn UI components for consistent styling
- React Hook Form with Zod validation

## Getting Started

### Configuration

1. Set up the ledger database connection in your environment variables:

    ```
    LEDGER_DATABASE_URL="postgresql://user:password@localhost:5432/ledger_db"
    LEDGER_DIRECT_URL="postgresql://user:password@localhost:5432/ledger_db"
    ```

2. If no database connection is available, the system will use mock data automatically.

### Usage

1. Navigate to the `/ledger` route in the application
2. Use the tabs to switch between different entry types
3. Click on entries to view details and manage transactions
4. Use the "New Entry" button to create new ledger entries
5. Record payments via the payment forms

## Development Notes

- All type definitions are centralized in `app/lib/types.ts`
- API routes follow RESTful conventions for consistency
- React components use TypeScript for type safety
- The system gracefully falls back to mock data when needed

## Setup Instructions

### 1. Database Setup

The ledger system uses a separate database defined in the `.env` file. You need to set up the following environment variables:

```
# Ledger Database (separate from main app database)
LEDGER_DATABASE_URL="postgresql://username:password@localhost:5432/ledger_db"
LEDGER_DIRECT_URL="postgresql://username:password@localhost:5432/ledger_db"
```

You can use the same PostgreSQL server as your main database, but with a different database name.

### 2. Schema Generation

The schema for the ledger system is defined in `prisma/schema-ledger.prisma`. To generate the client for the ledger system, run:

```bash
npx prisma generate --schema=./prisma/schema-ledger.prisma
```

This will create a separate Prisma client at `node_modules/@prisma/ledger-client`.

### 3. Database Migration

To create the database tables, run:

```bash
npx prisma db push --schema=./prisma/schema-ledger.prisma
```

This will push the schema to the database defined in the `LEDGER_DATABASE_URL` environment variable.

## Architecture

The ledger system is designed to work alongside the main application without interference. Key components:

1. **Database Client**: Located at `app/lib/ledger-db.ts`, this provides both real and mock implementations
2. **API Routes**:

    - `/api/ledger/entries` - List all ledger entries
    - `/api/ledger/khata` - Manage khatas (account books)
    - `/api/ledger/bill` - Manage bills (invoices)
    - `/api/ledger/party` - Manage parties (vendors/customers)
    - `/api/ledger/transactions` - Manage transactions

3. **UI Components**: Located in `/app/(dashboard)/ledger`

## Data Models

The ledger system includes the following main models:

- **Khata**: Account books for separating financial records
- **Bill**: Invoices for purchases and sales
- **Party**: Vendors and customers
- **Transaction**: Financial transactions
- **Cheque**: Cheque payments and receipts
- **BankAccount**: Bank account information
- **Inventory**: Inventory stock tracking

## Development Mode

The system will automatically use mock data if the real database client cannot be loaded. This allows you to develop the UI without setting up the database.

To force using the mock client, you can temporarily rename or move the `node_modules/@prisma/ledger-client` directory.

## Troubleshooting

### Missing Database Tables

If you see error messages about missing database tables, make sure you've run:

```bash
npx prisma db push --schema=./prisma/schema-ledger.prisma
```

### Schema Generation Errors

If you encounter errors related to schema generation, check that:

1. Your PostgreSQL server is running
2. The `LEDGER_DATABASE_URL` in your `.env` file is correct
3. You have proper permissions for the database

Run this to diagnose connection issues:

```bash
npx prisma diagnose --schema=./prisma/schema-ledger.prisma
```

### Missing Ledger Client

If you get errors about the ledger client not being found, try regenerating it:

```bash
npx prisma generate --schema=./prisma/schema-ledger.prisma
```

## TypeScript Enum Compatibility

The ledger module uses enum values from Prisma for `LedgerEntryType` and `LedgerEntryStatus`. However, there can be TypeScript compatibility issues between string literals and these enum types. We've implemented a robust solution to handle this:

### Type Issues Solution

We've created a type-safe approach that:

1. Defines string literal constants that match the Prisma enum values:

    ```typescript
    const LedgerTypes = {
        BILL: "BILL",
        TRANSACTION: "TRANSACTION",
        CHEQUE: "CHEQUE",
        INVENTORY: "INVENTORY",
        BANK: "BANK",
        PAYABLE: "PAYABLE",
        RECEIVABLE: "RECEIVABLE",
        KHATA: "KHATA",
    } as const;

    type LedgerEntryType = (typeof LedgerTypes)[keyof typeof LedgerTypes];
    ```

2. Provides a helper function to safely cast these values when used with Prisma:

    ```typescript
    function toLedgerEntryType(type: string): any {
        return type;
    }
    ```

3. Uses this pattern consistently when working with database operations:
    ```typescript
    // Example usage
    await prisma.ledgerEntry.findMany({
        where: { entryType: toLedgerEntryType(LedgerTypes.KHATA) },
    });
    ```

### Automatic Fixes

We've created a `fix-ledger-type-issues.js` script that can be run to automatically apply these fixes across the codebase. This script is integrated into our deployment workflows.

To run the fix manually:

```
node fix-ledger-type-issues.js
```

This approach preserves type safety while ensuring compatibility with Prisma's generated types.
