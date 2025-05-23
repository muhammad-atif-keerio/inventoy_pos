// Script to update LedgerEntryType enum in prisma/schema.prisma
// This fixes the ledger entry type validation issues

const fs = require("fs");
const path = require("path");

console.log("Starting ledger schema fix script...");

// Path to the Prisma schema file
const schemaPath = path.join(__dirname, "prisma", "schema.prisma");

// Check if the file exists
if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found at ${schemaPath}`);
    process.exit(1);
}

// Read the schema file
let schemaContent = fs.readFileSync(schemaPath, "utf8");

// Check if LedgerEntryType enum exists
const ledgerEntryTypeRegex = /enum\s+LedgerEntryType\s*\{[^}]*\}/;
const match = schemaContent.match(ledgerEntryTypeRegex);

if (!match) {
    console.error("LedgerEntryType enum not found in schema file");
    console.log("Adding LedgerEntryType enum to schema...");

    // Add the enum at the end of the file
    schemaContent += `\nenum LedgerEntryType {
  PAYABLE
  RECEIVABLE
  KHATA
  BILL
  TRANSACTION
  CHEQUE
  INVENTORY
  BANK
}\n`;
} else {
    // Check if the enum has all required values
    const enumContent = match[0];
    const missingTypes = [];

    const requiredTypes = [
        "PAYABLE",
        "RECEIVABLE",
        "KHATA",
        "BILL",
        "TRANSACTION",
        "CHEQUE",
        "INVENTORY",
        "BANK",
    ];

    requiredTypes.forEach((type) => {
        if (!enumContent.includes(type)) {
            missingTypes.push(type);
        }
    });

    if (missingTypes.length > 0) {
        console.log(
            `Found LedgerEntryType enum but missing values: ${missingTypes.join(", ")}`,
        );

        // Update the enum to include missing types
        const updatedEnum = enumContent.replace(
            /\}/,
            `  ${missingTypes.join("\n  ")}\n}`,
        );

        schemaContent = schemaContent.replace(
            ledgerEntryTypeRegex,
            updatedEnum,
        );
    } else {
        console.log(
            "LedgerEntryType enum already contains all required values",
        );
    }
}

// Write the updated schema back to the file
fs.writeFileSync(schemaPath, schemaContent);
console.log("Schema updated successfully");

// Also update LedgerEntryStatus enum if needed
const ledgerEntryStatusRegex = /enum\s+LedgerEntryStatus\s*\{[^}]*\}/;
const statusMatch = schemaContent.match(ledgerEntryStatusRegex);

if (!statusMatch) {
    console.log("Adding LedgerEntryStatus enum to schema...");

    // Add the enum at the end of the file
    schemaContent += `\nenum LedgerEntryStatus {
  PENDING
  PARTIAL
  COMPLETED
  CANCELLED
  PAID
  CLEARED
  BOUNCED
  REPLACED
}\n`;

    // Write the updated schema back to the file
    fs.writeFileSync(schemaPath, schemaContent);
    console.log("Added LedgerEntryStatus enum to schema");
} else {
    // Check if the enum has all required values
    const enumContent = statusMatch[0];
    const missingStatuses = [];

    const requiredStatuses = [
        "PENDING",
        "PARTIAL",
        "COMPLETED",
        "CANCELLED",
        "PAID",
        "CLEARED",
        "BOUNCED",
        "REPLACED",
    ];

    requiredStatuses.forEach((status) => {
        if (!enumContent.includes(status)) {
            missingStatuses.push(status);
        }
    });

    if (missingStatuses.length > 0) {
        console.log(
            `Found LedgerEntryStatus enum but missing values: ${missingStatuses.join(", ")}`,
        );

        // Update the enum to include missing types
        const updatedEnum = enumContent.replace(
            /\}/,
            `  ${missingStatuses.join("\n  ")}\n}`,
        );

        schemaContent = schemaContent.replace(
            ledgerEntryStatusRegex,
            updatedEnum,
        );

        // Write the updated schema back to the file
        fs.writeFileSync(schemaPath, schemaContent);
        console.log("Updated LedgerEntryStatus enum with missing values");
    } else {
        console.log(
            "LedgerEntryStatus enum already contains all required values",
        );
    }
}

console.log("Ledger schema fix completed.");
