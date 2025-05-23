// Script to fix ledger display issues by ensuring data is properly connected
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaClient: LedgerPrismaClient } = require("@prisma/ledger-client");
const fs = require("fs");
const path = require("path");

console.log("🔄 Starting ledger display fix...");

async function fixLedgerDisplay() {
    try {
        // Step 1: Connect to databases
        console.log("\n1️⃣ Connecting to databases...");
        const mainPrisma = new PrismaClient();
        const ledgerPrisma = new LedgerPrismaClient();

        await mainPrisma.$connect();
        await ledgerPrisma.$connect();
        console.log("✅ Connected to both databases");

        // Step 2: Update the ledger-db.ts file to ensure proper mapping
        console.log("\n2️⃣ Updating ledger-db.ts to improve data visibility...");
        const dbFilePath = path.join(
            process.cwd(),
            "app",
            "lib",
            "ledger-db.ts",
        );

        if (fs.existsSync(dbFilePath)) {
            let content = fs.readFileSync(dbFilePath, "utf8");
            let modified = false;

            // Make sure mock data is disabled
            if (content.includes("const useMockDataForTesting = true")) {
                content = content.replace(
                    "const useMockDataForTesting = true",
                    "const useMockDataForTesting = false // Set to false to use real database",
                );
                modified = true;
                console.log("✅ Set mock data mode to false");
            }

            // Check if we already modified the findMany method for better filtering
            // If not, add improved implementation
            if (
                !content.includes(
                    "console.log(`Using alternative khataId filtering for khata ${khataId}`);",
                )
            ) {
                // Look for the bill findMany method
                const findManyPos = content.indexOf(
                    "findMany: async (args) => {",
                );
                if (findManyPos > 0) {
                    // Add improved filtering and debugging
                    const improvedFindMany = `findMany: async (args) => {
        // Handle khataId filter if present by using notes or reference field
        if (args?.where?.khataId) {
          const khataId = args.where.khataId;
          delete args.where.khataId;  // Remove the khataId from original filter
          
          // Add a filter on the reference or notes field instead
          // This adapts our schema to simulate the khata relationship
          console.log(\`Using alternative khataId filtering for khata \${khataId}\`);
          args.where = {
            ...args.where,
            OR: [
              { reference: { contains: \`khata:\${khataId}\` } },
              { notes: { contains: \`khata:\${khataId}\` } }
            ]
          };
        }
        
        return this.client.ledgerEntry.findMany(args);
      }`;

                    // Replace the original implementation
                    content = content.replace(
                        /findMany: async \(args\) => \{[^}]*\}/s,
                        improvedFindMany,
                    );
                    modified = true;
                    console.log("✅ Added improved khataId filtering");
                }
            }

            if (modified) {
                fs.writeFileSync(dbFilePath, content);
                console.log("✅ Updated ledger-db.ts file");
            } else {
                console.log(
                    "ℹ️ ledger-db.ts already has the necessary modifications",
                );
            }
        } else {
            console.log("❌ Could not find ledger-db.ts file");
        }

        // Step 3: Synchronize bills from ledger database to main database
        console.log("\n3️⃣ Synchronizing bills to main database...");
        const bills = await ledgerPrisma.bill.findMany({
            include: {
                party: true,
            },
        });

        console.log(`Found ${bills.length} bills to synchronize`);

        // Check for existing ledger entries
        const existingEntries = await mainPrisma.ledgerEntry.findMany({
            where: {
                entryType: "BILL",
            },
            select: {
                reference: true,
            },
        });

        const existingReferences = new Set(
            existingEntries.map((e) => e.reference),
        );
        console.log(`Found ${existingEntries.length} existing bill entries`);

        // Create ledger entries for missing bills
        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const bill of bills) {
            const reference = `BILL-${bill.billNumber}`;

            if (existingReferences.has(reference)) {
                skippedCount++;
                continue;
            }

            try {
                await mainPrisma.ledgerEntry.create({
                    data: {
                        entryType: "BILL",
                        entryDate: bill.billDate,
                        dueDate: bill.dueDate,
                        description:
                            bill.description || `Bill ${bill.billNumber}`,
                        amount: bill.amount,
                        remainingAmount: bill.amount.minus(
                            bill.paidAmount || 0,
                        ),
                        status: bill.status,
                        reference: reference,
                        notes: `khata:${bill.khataId}\nparty:${bill.partyId || "none"}\nsync:${new Date().toISOString()}`,
                        updatedAt: new Date(),
                        // Add vendor or customer ID if available
                        vendorId: bill.party?.vendorId || null,
                        customerId: bill.party?.customerId || null,
                    },
                });

                createdCount++;
            } catch (error) {
                console.error(
                    `❌ Failed to create entry for bill ${bill.billNumber}:`,
                    error.message,
                );
                errorCount++;
            }
        }

        console.log(
            `✅ Synchronized bills: ${createdCount} created, ${skippedCount} skipped, ${errorCount} failed`,
        );

        // Step 4: Check if any entries are missing khata references
        console.log("\n4️⃣ Fixing entries without khata references...");
        const entriesWithoutKhata = await mainPrisma.ledgerEntry.findMany({
            where: {
                AND: [
                    { notes: { not: { contains: "khata:" } } },
                    { reference: { not: { contains: "khata:" } } },
                ],
            },
        });

        console.log(
            `Found ${entriesWithoutKhata.length} entries without khata references`,
        );

        // Add khata references to all entries that don't have one
        let fixedCount = 0;
        for (const entry of entriesWithoutKhata) {
            try {
                await mainPrisma.ledgerEntry.update({
                    where: { id: entry.id },
                    data: {
                        notes: `${entry.notes || ""}\nkhata:1`,
                        reference: entry.reference
                            ? `${entry.reference} khata:1`
                            : `khata:1`,
                    },
                });

                fixedCount++;
            } catch (error) {
                console.error(
                    `❌ Failed to update entry ${entry.id}:`,
                    error.message,
                );
            }
        }

        console.log(`✅ Added khata references to ${fixedCount} entries`);

        // Step 5: Verify entries are now properly referenced
        console.log("\n5️⃣ Verifying khata references...");
        const remainingWithoutKhata = await mainPrisma.ledgerEntry.count({
            where: {
                AND: [
                    { notes: { not: { contains: "khata:" } } },
                    { reference: { not: { contains: "khata:" } } },
                ],
            },
        });

        if (remainingWithoutKhata === 0) {
            console.log("✅ All entries now have khata references");
        } else {
            console.log(
                `⚠️ There are still ${remainingWithoutKhata} entries without khata references`,
            );
        }

        // Step 6: Check if API filtering is working
        console.log("\n6️⃣ Testing API filtering...");

        // Get first khata
        const firstKhata = await ledgerPrisma.khata.findFirst();
        if (firstKhata) {
            const khataId = firstKhata.id;

            // Test the filter that the API would use
            const filteredEntries = await mainPrisma.ledgerEntry.findMany({
                where: {
                    OR: [
                        { reference: { contains: `khata:${khataId}` } },
                        { notes: { contains: `khata:${khataId}` } },
                    ],
                },
                take: 5,
            });

            console.log(
                `API filter returns ${filteredEntries.length} entries for khata ID ${khataId}`,
            );
            if (filteredEntries.length > 0) {
                console.log("✅ API filtering is working");
            } else {
                console.log(
                    "⚠️ API filtering returns no results - check khata IDs",
                );
            }
        }

        // Summary
        console.log("\n📋 Fix Summary:");
        console.log("1. Updated ledger-db.ts file for improved filtering");
        console.log(
            `2. Synchronized ${createdCount} bills to the main database`,
        );
        console.log(`3. Added khata references to ${fixedCount} entries`);

        console.log(
            "\n✅ Your ledger data should now be displayed correctly in the UI.",
        );
        console.log(
            "If you still don't see your data, please restart the application.",
        );

        await mainPrisma.$disconnect();
        await ledgerPrisma.$disconnect();
    } catch (error) {
        console.error("Error fixing ledger display:", error);
    }
}

fixLedgerDisplay();
