// Script to diagnose and fix ledger database connection issues
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("Starting ledger database connection diagnostics...");

// Check if .env file exists and contains necessary variables
function checkEnvFile() {
    console.log("\n📋 Checking environment variables...");

    try {
        if (!fs.existsSync(".env")) {
            console.log(
                "⚠️ No .env file found, creating from example if available",
            );
            if (fs.existsSync(".env.example")) {
                fs.copyFileSync(".env.example", ".env");
                console.log("✅ Created .env from .env.example");
            } else {
                // Create minimal .env file
                const envContent = `# DATABASE CONNECTION
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:password@localhost:5432/postgres"

# LEDGER DATABASE CONNECTION
LEDGER_DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres?schema=ledger"
LEDGER_DIRECT_URL="postgresql://postgres:password@localhost:5432/postgres?schema=ledger"
`;
                fs.writeFileSync(".env", envContent);
                console.log("✅ Created new .env file with default values");
            }
        }

        // Read .env file
        const envContent = fs.readFileSync(".env", "utf8");
        const envLines = envContent.split("\n");
        const envVars = {};

        // Parse .env file
        envLines.forEach((line) => {
            if (!line || line.startsWith("#")) return;
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes if present
                if (
                    (value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))
                ) {
                    value = value.slice(1, -1);
                }
                envVars[key] = value;
            }
        });

        // Check for required variables
        const requiredVars = [
            "DATABASE_URL",
            "DIRECT_URL",
            "LEDGER_DATABASE_URL",
            "LEDGER_DIRECT_URL",
        ];

        const missingVars = [];
        requiredVars.forEach((varName) => {
            if (!envVars[varName]) {
                missingVars.push(varName);
            }
        });

        if (missingVars.length > 0) {
            console.log(
                `⚠️ Missing environment variables: ${missingVars.join(", ")}`,
            );

            // Add missing variables
            let updatedEnvContent = envContent;

            if (!envVars["DATABASE_URL"]) {
                updatedEnvContent +=
                    '\nDATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"';
            }

            if (!envVars["DIRECT_URL"]) {
                updatedEnvContent +=
                    '\nDIRECT_URL="postgresql://postgres:password@localhost:5432/postgres"';
            }

            if (!envVars["LEDGER_DATABASE_URL"]) {
                updatedEnvContent +=
                    '\nLEDGER_DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres?schema=ledger"';
            }

            if (!envVars["LEDGER_DIRECT_URL"]) {
                updatedEnvContent +=
                    '\nLEDGER_DIRECT_URL="postgresql://postgres:password@localhost:5432/postgres?schema=ledger"';
            }

            fs.writeFileSync(".env", updatedEnvContent);
            console.log("✅ Added missing environment variables to .env");
        } else {
            console.log("✅ All required environment variables are present");
        }

        // Fix SSL configuration in connection strings
        if (
            envVars["DATABASE_URL"] &&
            !envVars["DATABASE_URL"].includes("sslmode=disable")
        ) {
            const updatedEnvContent = envContent.replace(
                /DATABASE_URL="([^"]*)"/,
                (match, url) => {
                    const joiner = url.includes("?") ? "&" : "?";
                    return `DATABASE_URL="${url}${joiner}sslmode=disable"`;
                },
            );
            fs.writeFileSync(".env", updatedEnvContent);
            console.log(
                "✅ Added sslmode=disable to DATABASE_URL for better compatibility",
            );
        }

        if (
            envVars["LEDGER_DATABASE_URL"] &&
            !envVars["LEDGER_DATABASE_URL"].includes("sslmode=disable")
        ) {
            const updatedEnvContent = fs
                .readFileSync(".env", "utf8")
                .replace(/LEDGER_DATABASE_URL="([^"]*)"/, (match, url) => {
                    const joiner = url.includes("?") ? "&" : "?";
                    return `LEDGER_DATABASE_URL="${url}${joiner}sslmode=disable"`;
                });
            fs.writeFileSync(".env", updatedEnvContent);
            console.log(
                "✅ Added sslmode=disable to LEDGER_DATABASE_URL for better compatibility",
            );
        }

        return true;
    } catch (error) {
        console.error(
            "❌ Error checking environment variables:",
            error.message,
        );
        return false;
    }
}

// Update ledger-db-wrapper.ts file
function updateLedgerDbWrapper() {
    console.log("\n📋 Updating ledger-db-wrapper.ts...");

    const dbWrapperPath = path.join(
        __dirname,
        "app",
        "api",
        "ledger-db-wrapper.ts",
    );

    try {
        if (!fs.existsSync(dbWrapperPath)) {
            console.log("⚠️ ledger-db-wrapper.ts not found, creating it...");

            // Create directory if it doesn't exist
            const dirPath = path.join(__dirname, "app", "api");
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            // Create the wrapper file with correct imports
            const wrapperContent = `// Direct wrapper for ledger functionality
import { db } from "../../lib/db";

// Create direct exports
export const ledgerDb = db;
export const isUsingRealLedgerClient = !!process.env.LEDGER_DATABASE_URL;

// Define types directly to avoid import issues
export enum BillStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  CANCELLED = "CANCELLED"
}

export enum BillType {
  PURCHASE = "PURCHASE",
  SALE = "SALE",
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
  OTHER = "OTHER"
}

export enum PartyType {
  VENDOR = "VENDOR",
  CUSTOMER = "CUSTOMER",
  EMPLOYEE = "EMPLOYEE",
  OTHER = "OTHER"
}

export enum TransactionType {
  PURCHASE = "PURCHASE",
  SALE = "SALE",
  BANK_DEPOSIT = "BANK_DEPOSIT",
  BANK_WITHDRAWAL = "BANK_WITHDRAWAL",
  CASH_PAYMENT = "CASH_PAYMENT",
  CASH_RECEIPT = "CASH_RECEIPT",
  CHEQUE_PAYMENT = "CHEQUE_PAYMENT",
  CHEQUE_RECEIPT = "CHEQUE_RECEIPT",
  CHEQUE_RETURN = "CHEQUE_RETURN",
  DYEING_EXPENSE = "DYEING_EXPENSE",
  INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT",
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
  TRANSFER = "TRANSFER",
  OTHER = "OTHER"
}

export interface Bill {
  id: number;
  billNumber: string;
  khataId: number;
  partyId: number | null;
  billDate: Date;
  dueDate: Date | null;
  amount: number;
  paidAmount: number;
  description: string | null;
  billType: BillType;
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
  party?: Party;
  transactions?: Transaction[];
}

export interface Party {
  id: number;
  name: string;
  type: PartyType;
  khataId: number;
  contact: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  customerId: number | null;
  vendorId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: number;
  khataId: number;
  partyId: number | null;
  billId: number | null;
  bankAccountId: number | null;
  amount: number;
  description: string;
  transactionType: TransactionType;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  party?: Party | null;
}

export interface Khata {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
`;

            fs.writeFileSync(dbWrapperPath, wrapperContent);
            console.log("✅ Created ledger-db-wrapper.ts with proper imports");
        } else {
            let content = fs.readFileSync(dbWrapperPath, "utf8");

            // Check if imports are correct
            if (!content.includes("import { db } from")) {
                content = content.replace(
                    "// Direct wrapper for ledger functionality",
                    '// Direct wrapper for ledger functionality\nimport { db } from "../../lib/db";',
                );
                fs.writeFileSync(dbWrapperPath, content);
                console.log("✅ Fixed imports in ledger-db-wrapper.ts");
            }

            // Check if exports are correct
            if (!content.includes("export const ledgerDb")) {
                content = content.replace(
                    "// Direct wrapper for ledger functionality",
                    "// Direct wrapper for ledger functionality\n\n// Create direct exports\nexport const ledgerDb = db;\nexport const isUsingRealLedgerClient = !!process.env.LEDGER_DATABASE_URL;",
                );
                fs.writeFileSync(dbWrapperPath, content);
                console.log("✅ Added ledgerDb export to ledger-db-wrapper.ts");
            }

            console.log("✅ Updated ledger-db-wrapper.ts");
        }

        return true;
    } catch (error) {
        console.error("❌ Error updating ledger-db-wrapper.ts:", error.message);
        return false;
    }
}

// Create a script to synchronize ledger entries with khata references
function createSyncScript() {
    console.log("\n📋 Creating sync-ledger-entries.js script...");

    const syncScriptPath = path.join(__dirname, "sync-ledger-entries.js");

    try {
        const scriptContent = `// Script to add khata references to existing ledger entries
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncLedgerEntries() {
  console.log('Starting ledger entry synchronization...');
  
  try {
    // Get all ledger entries without khata references
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        entryType: 'BILL',
        OR: [
          {
            reference: {
              not: {
                contains: 'khata:'
              }
            }
          },
          {
            reference: null
          }
        ]
      }
    });
    
    console.log(\`Found \${entries.length} entries without khata references\`);
    
    // Default khata ID to use
    const defaultKhataId = 1;
    
    let updatedCount = 0;
    
    // Update each entry with a khata reference
    for (const entry of entries) {
      try {
        await prisma.ledgerEntry.update({
          where: {
            id: entry.id
          },
          data: {
            reference: \`\${entry.reference || ''} khata:\${defaultKhataId}\`.trim(),
            notes: \`\${entry.notes || ''}\${entry.notes ? '\\n' : ''}khata:\${defaultKhataId}\`.trim()
          }
        });
        
        updatedCount++;
        console.log(\`Updated entry \${entry.id} with khata reference\`);
      } catch (updateError) {
        console.error(\`Error updating entry \${entry.id}:\`, updateError);
      }
    }
    
    console.log(\`Successfully updated \${updatedCount} entries with khata references\`);
  } catch (error) {
    console.error('Error synchronizing ledger entries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncLedgerEntries().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
`;

        fs.writeFileSync(syncScriptPath, scriptContent);
        console.log("✅ Created sync-ledger-entries.js script");

        return true;
    } catch (error) {
        console.error("❌ Error creating sync script:", error.message);
        return false;
    }
}

// Fix bill route.ts to ensure proper handling of khata references
function fixBillRoute() {
    console.log("\n📋 Checking and fixing bill route.ts...");

    const billRoutePath = path.join(
        __dirname,
        "app",
        "api",
        "ledger",
        "bill",
        "route.ts",
    );

    try {
        if (!fs.existsSync(billRoutePath)) {
            console.log("⚠️ bill route.ts not found, skipping fix");
            return false;
        }

        let content = fs.readFileSync(billRoutePath, "utf8");
        let modified = false;

        // Check for proper imports
        if (!content.includes("import { db } from")) {
            content = content.replace(
                'import { NextRequest, NextResponse } from "next/server";',
                'import { NextRequest, NextResponse } from "next/server";\n// Import db from the correct location\nimport { db } from "../../../../lib/db";',
            );
            modified = true;
        }

        // Check if POST handler adds khata references
        const postMethodIndex = content.indexOf("export async function POST");
        if (postMethodIndex !== -1) {
            const createIndex = content.indexOf(
                "db.ledgerEntry.create",
                postMethodIndex,
            );

            if (createIndex !== -1) {
                // Check if khata reference is already being added
                const hasKhataReference = content
                    .slice(createIndex, createIndex + 500)
                    .includes("khata:");

                if (!hasKhataReference) {
                    // Find the data object in the create call
                    const dataStartIndex = content.indexOf(
                        "data:",
                        createIndex,
                    );

                    if (dataStartIndex !== -1) {
                        // Insert khata reference code
                        const beforeData = content.substring(
                            0,
                            dataStartIndex + 5,
                        );
                        const afterData = content.substring(dataStartIndex + 5);

                        content = `${beforeData} {
          // Add khata reference
          reference: \`\${billNumber}\${body.khataId ? \` khata:\${body.khataId}\` : ''}\`,
          notes: \`\${body.description || ''}\${body.description ? '\\n' : ''}khata:\${body.khataId}\${body.partyId ? \`\\nparty:\${body.partyId}\` : ''}\`,
          ${afterData.trimStart()}`;
                        modified = true;
                    }
                }
            }
        }

        if (modified) {
            fs.writeFileSync(billRoutePath, content);
            console.log(
                "✅ Fixed bill route.ts to properly handle khata references",
            );
        } else {
            console.log("✅ bill route.ts looks good");
        }

        return true;
    } catch (error) {
        console.error("❌ Error fixing bill route.ts:", error.message);
        return false;
    }
}

// Run Prisma generate to ensure the client is up to date
function runPrismaGenerate() {
    console.log("\n📋 Running Prisma generate...");

    try {
        console.log("Generating Prisma client...");
        execSync("npx prisma generate", { stdio: "inherit" });

        // Check if ledger schema exists
        const ledgerSchemaPath = path.join(
            __dirname,
            "prisma",
            "schema-ledger.prisma",
        );
        if (fs.existsSync(ledgerSchemaPath)) {
            console.log("Generating ledger Prisma client...");
            execSync(
                "npx prisma generate --schema=prisma/schema-ledger.prisma",
                { stdio: "inherit" },
            );
        }

        console.log("✅ Prisma clients generated successfully");
        return true;
    } catch (error) {
        console.error("❌ Error generating Prisma clients:", error.message);
        return false;
    }
}

// Main function
async function main() {
    console.log("🔍 Starting ledger system diagnostics and fix process...");

    // Step 1: Check and update .env file
    const envCheckResult = checkEnvFile();

    // Step 2: Update ledger-db-wrapper.ts
    const wrapperUpdateResult = updateLedgerDbWrapper();

    // Step 3: Create script to synchronize ledger entries
    const syncScriptResult = createSyncScript();

    // Step 4: Fix bill route.ts
    const billRouteResult = fixBillRoute();

    // Step 5: Run Prisma generate
    const prismaGenerateResult = runPrismaGenerate();

    // Print summary
    console.log("\n📋 Fix Summary:");
    console.log(
        `- Environment Variables: ${envCheckResult ? "✅ Fixed" : "❌ Failed"}`,
    );
    console.log(
        `- Ledger DB Wrapper: ${wrapperUpdateResult ? "✅ Fixed" : "❌ Failed"}`,
    );
    console.log(
        `- Sync Script: ${syncScriptResult ? "✅ Created" : "❌ Failed"}`,
    );
    console.log(`- Bill Route: ${billRouteResult ? "✅ Fixed" : "❌ Failed"}`);
    console.log(
        `- Prisma Generate: ${prismaGenerateResult ? "✅ Done" : "❌ Failed"}`,
    );

    if (
        envCheckResult &&
        wrapperUpdateResult &&
        syncScriptResult &&
        billRouteResult
    ) {
        console.log("\n✅ Ledger system fixes applied successfully!");
        console.log("\n📌 Next steps:");
        console.log(
            '1. Run "node sync-ledger-entries.js" to add khata references to existing entries',
        );
        console.log(
            '2. Restart your Next.js development server with "npm run dev"',
        );
        console.log(
            "3. Visit the /ledger route in your application to verify the fix",
        );
    } else {
        console.log("\n⚠️ Some fixes were not applied successfully.");
        console.log("Please check the errors above and run this script again.");
    }
}

main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
