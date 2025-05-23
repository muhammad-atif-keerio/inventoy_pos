// Debug script to test the ledger API endpoint directly
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaClient: LedgerPrismaClient } = require("@prisma/ledger-client");

console.log("Starting debug script for ledger API endpoint...");

async function debugLedgerApi() {
    try {
        console.log("\n1. Testing main database connection...");
        const prisma = new PrismaClient();
        await prisma.$connect();
        console.log("✅ Connected to main database");

        // Check ledger entries in main database first
        console.log("\n2. Checking ledger entries in main database...");
        try {
            const ledgerEntries = await prisma.ledgerEntry.findMany({
                take: 5,
            });
            console.log(
                `Found ${ledgerEntries.length} ledger entries in main database`,
            );

            if (ledgerEntries.length > 0) {
                console.log("First entry:", {
                    id: ledgerEntries[0].id,
                    type: ledgerEntries[0].entryType,
                    description: ledgerEntries[0].description,
                    amount: ledgerEntries[0].amount.toString(),
                    status: ledgerEntries[0].status,
                });
            } else {
                console.log("❌ No ledger entries found in main database");
            }
        } catch (error) {
            console.log(
                "❌ Error querying ledger entries in main database:",
                error.message,
            );
            if (error.code === "P2021") {
                console.log(
                    "Table does not exist in main database. This is expected if using a separate ledger database.",
                );
            }
        }

        console.log("\n3. Testing ledger database connection...");
        const ledgerPrisma = new LedgerPrismaClient();
        await ledgerPrisma.$connect();
        console.log("✅ Connected to ledger database");

        // Check tables in ledger database
        console.log("\n4. Checking tables in ledger database...");
        const tables = [
            "khata",
            "party",
            "bill",
            "transaction",
            "bank_account",
            "cheque",
            "inventory",
        ];
        for (const table of tables) {
            try {
                // Use raw query to check if table exists
                const result = await ledgerPrisma.$queryRawUnsafe(
                    `SELECT COUNT(*) FROM "${table}"`,
                );
                console.log(
                    `✅ Table "${table}" exists with ${result[0].count} records`,
                );
            } catch (error) {
                console.log(
                    `❌ Error querying table "${table}": ${error.message}`,
                );
            }
        }

        // Check khata records
        console.log("\n5. Checking khata records...");
        try {
            const khatas = await ledgerPrisma.khata.findMany();
            console.log(`Found ${khatas.length} khatas`);

            if (khatas.length > 0) {
                console.log(
                    "Khata records:",
                    khatas.map((k) => ({ id: k.id, name: k.name })),
                );
            } else {
                console.log("❌ No khata records found");
                console.log("Creating a sample khata...");
                const newKhata = await ledgerPrisma.khata.create({
                    data: {
                        name: "Default Business Account",
                        description: "Created for testing",
                    },
                });
                console.log("Created sample khata:", newKhata);
            }
        } catch (error) {
            console.log("❌ Error checking khatas:", error.message);
        }

        // Check bills connected to khata
        console.log("\n6. Checking bills...");
        try {
            const bills = await ledgerPrisma.bill.findMany({ take: 5 });
            console.log(`Found ${bills.length} bills`);

            if (bills.length > 0) {
                console.log(
                    "Sample bills:",
                    bills.map((b) => ({
                        id: b.id,
                        billNumber: b.billNumber,
                        khataId: b.khataId,
                        amount: b.amount.toString(),
                        status: b.status,
                    })),
                );
            } else {
                console.log("❌ No bills found");

                // If we have a khata, create a sample bill
                const khata = await ledgerPrisma.khata.findFirst();
                if (khata) {
                    console.log("Creating a sample bill...");
                    const billNumber = `BILL-${Math.floor(Math.random() * 10000)}`;
                    const newBill = await ledgerPrisma.bill.create({
                        data: {
                            billNumber,
                            khataId: khata.id,
                            billDate: new Date(),
                            amount: 5000,
                            paidAmount: 0,
                            description: "Sample bill for testing",
                            billType: "PURCHASE",
                            status: "PENDING",
                        },
                    });
                    console.log("Created sample bill:", newBill);
                }
            }
        } catch (error) {
            console.log("❌ Error checking bills:", error.message);
        }

        // Check if ledgerEntry table exists in the ledger schema
        console.log("\n7. Checking if LedgerEntry exists in ledger schema...");
        try {
            const result = await ledgerPrisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'ledger' 
          AND table_name = 'LedgerEntry'
        ) as exists
      `);
            if (result[0].exists) {
                console.log("✅ LedgerEntry table exists in ledger schema");
            } else {
                console.log(
                    "❌ LedgerEntry table does not exist in ledger schema",
                );
                console.log(
                    "This is normal if using a different schema design for the ledger database",
                );
            }
        } catch (error) {
            console.log("❌ Error checking LedgerEntry table:", error.message);
        }

        // Check schema validation
        console.log("\n8. Validating database schema...");
        let schemaValid = true;

        try {
            // Try a complex join query to validate schema relationships
            const testQuery = await ledgerPrisma.bill.findMany({
                where: {
                    khataId: 1,
                },
                include: {
                    khata: true,
                    party: true,
                    transactions: true,
                },
                take: 1,
            });

            console.log("✅ Schema validation successful");
            console.log(
                `Test query returned ${testQuery.length} results with relationships`,
            );
        } catch (error) {
            console.log("❌ Schema validation failed:", error.message);
            schemaValid = false;
        }

        console.log("\nDebug Summary:");
        console.log("1. Main Database Connection: ✅");
        console.log("2. Ledger Database Connection: ✅");
        console.log("3. Schema Validation: " + (schemaValid ? "✅" : "❌"));
        console.log("\nSuggested next steps:");

        if (!schemaValid) {
            console.log(
                "- Run `npx prisma db push --schema=prisma/schema-ledger.prisma` to update the schema",
            );
        }

        console.log(
            "- Check that khataId is being stored in reference or notes fields",
        );
        console.log(
            "- Verify that the data is being correctly mapped between schemas",
        );

        // Clean up connections
        await ledgerPrisma.$disconnect();
        await prisma.$disconnect();
    } catch (error) {
        console.error("Unexpected error:", error);
    }
}

debugLedgerApi();
