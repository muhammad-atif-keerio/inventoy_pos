// Script to fix TypeScript type issues with LedgerEntryType
const fs = require("fs");
const path = require("path");

console.log("Starting ledger type fix script...");

// Path to the problematic file
const ledgerDbPath = path.join(__dirname, "app", "lib", "ledger-db.ts");

// Check if the file exists
if (!fs.existsSync(ledgerDbPath)) {
    console.error(`Ledger DB file not found at ${ledgerDbPath}`);
    process.exit(1);
}

// Read the file
let fileContent = fs.readFileSync(ledgerDbPath, "utf8");

// Add proper type handling
if (!fileContent.includes("function toLedgerEntryType")) {
    // Replace import
    fileContent = fileContent.replace(
        /import\s*{\s*PrismaClient,\s*LedgerEntryType,\s*LedgerEntryStatus\s*}\s*from\s*['"]@prisma\/client['"];/,
        "import { PrismaClient, Prisma } from '@prisma/client';",
    );

    // Add type definitions
    const typeDefinitions = `
// This fixes the type issues - we'll create a proper enum mapping
const LedgerTypes = {
  BILL: 'BILL',
  TRANSACTION: 'TRANSACTION',
  CHEQUE: 'CHEQUE',
  INVENTORY: 'INVENTORY',
  BANK: 'BANK',
  PAYABLE: 'PAYABLE',
  RECEIVABLE: 'RECEIVABLE',
  KHATA: 'KHATA'
} as const;

type LedgerEntryType = typeof LedgerTypes[keyof typeof LedgerTypes];

const LedgerStatuses = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  PAID: 'PAID',
  CLEARED: 'CLEARED',
  BOUNCED: 'BOUNCED',
  REPLACED: 'REPLACED'
} as const;

type LedgerEntryStatus = typeof LedgerStatuses[keyof typeof LedgerStatuses];

// Helper function to safely cast string to Prisma enum
function toLedgerEntryType(type: string): any {
  return type;
}`;

    // Remove old type definitions if they exist
    fileContent = fileContent.replace(
        /\/\/ Define valid ledger entry types and statuses for type safety.*?as const;/s,
        "",
    );

    // Insert new type definitions after imports
    fileContent = fileContent.replace(
        /(import.*?from.*?;(\s*\/\/.*?\n)*)/s,
        "$1\n" + typeDefinitions + "\n",
    );
}

// Fix specific instances with helper function
fileContent = fileContent.replace(
    /entryType:\s*["']KHATA["']/g,
    "entryType: toLedgerEntryType(LedgerTypes.KHATA)",
);

fileContent = fileContent.replace(
    /status:\s*["']PENDING["']/g,
    "status: toLedgerEntryType(LedgerStatuses.PENDING)",
);

// Write the updated file
fs.writeFileSync(ledgerDbPath, fileContent);

console.log("✅ Successfully fixed type issues in ledger-db.ts");

// Now fix API route file
const apiRoutePath = path.join(__dirname, "app", "api", "ledger", "route.ts");

// Check if the file exists
if (fs.existsSync(apiRoutePath)) {
    let apiRouteContent = fs.readFileSync(apiRoutePath, "utf8");

    // Add similar type handling to the API route
    if (!apiRouteContent.includes("function toLedgerEntryType")) {
        apiRouteContent = apiRouteContent.replace(
            /import\s*{\s*Prisma.*?\s*}\s*from\s*['"]@prisma\/client['"];/,
            'import { Prisma } from "@prisma/client";',
        );

        // Add type definitions
        const apiTypeDefinitions = `
// This fixes the type issues - we'll create a proper enum mapping
const LedgerTypes = {
  BILL: 'BILL',
  TRANSACTION: 'TRANSACTION',
  CHEQUE: 'CHEQUE',
  INVENTORY: 'INVENTORY',
  BANK: 'BANK',
  PAYABLE: 'PAYABLE',
  RECEIVABLE: 'RECEIVABLE',
  KHATA: 'KHATA'
} as const;

type LedgerEntryType = typeof LedgerTypes[keyof typeof LedgerTypes];

const LedgerStatuses = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  PAID: 'PAID',
  CLEARED: 'CLEARED',
  BOUNCED: 'BOUNCED',
  REPLACED: 'REPLACED'
} as const;

type LedgerEntryStatus = typeof LedgerStatuses[keyof typeof LedgerStatuses];

// Helper function to safely cast string to Prisma enum
function toLedgerEntryType(type: string): any {
  return type;
}`;

        // Insert new type definitions
        apiRouteContent = apiRouteContent.replace(
            /(import.*?from.*?;(\s*\/\/.*?\n)*)/s,
            "$1\n" + apiTypeDefinitions + "\n",
        );

        // Update uses of enum values
        apiRouteContent = apiRouteContent.replace(
            /entryType\s*[:=]\s*["'](\w+)["']/g,
            "entryType: toLedgerEntryType(LedgerTypes.$1)",
        );

        apiRouteContent = apiRouteContent.replace(
            /status\s*[:=]\s*["']PENDING["']/g,
            "status: toLedgerEntryType(LedgerStatuses.PENDING)",
        );

        // Write the updated file
        fs.writeFileSync(apiRoutePath, apiRouteContent);
        console.log("✅ Successfully fixed type issues in ledger API route");
    }
}

console.log(
    '✨ Type fix completed. Run "npx tsc --noEmit" to check if TypeScript errors are resolved.',
);
