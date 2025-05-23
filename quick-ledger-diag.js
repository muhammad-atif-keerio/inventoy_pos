// Quick diagnostic script for ledger system
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaClient: LedgerPrismaClient } = require("@prisma/ledger-client");

async function runDiagnostic() {
    try {
        console.log("🔍 Running quick ledger diagnostic...");

        // Connect to both databases
        const mainPrisma = new PrismaClient();
        const ledgerPrisma = new LedgerPrismaClient();

        await mainPrisma.$connect();
        await ledgerPrisma.$connect();
        console.log("✅ Connected to both databases\n");

        // Check 1: Get total counts
        console.log("1️⃣ Checking record counts...");
        const [mainEntryCount, khataCount, billCount, transactionCount] =
            await Promise.all([
                mainPrisma.ledgerEntry.count(),
                ledgerPrisma.khata.count(),
                ledgerPrisma.bill.count(),
                ledgerPrisma.transaction.count(),
            ]);

        console.log(`Main DB - LedgerEntry count: ${mainEntryCount}`);
        console.log(`Ledger DB - Khata count: ${khataCount}`);
        console.log(`Ledger DB - Bill count: ${billCount}`);
        console.log(`Ledger DB - Transaction count: ${transactionCount}`);

        // Check 2: Get most recent entries in both DBs
        console.log("\n2️⃣ Checking most recent entries...");

        // Get the 5 most recent entries from main DB
        const recentMainEntries = await mainPrisma.ledgerEntry.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
        });

        console.log("Latest entries in main database:");
        recentMainEntries.forEach((entry) => {
            console.log(
                `- ID ${entry.id}: ${entry.entryType} - ${entry.description} - $${entry.amount} (${entry.status})`,
            );
            console.log(
                `  Created: ${entry.createdAt} - Has khata ref: ${entry.notes?.includes("khata:") || entry.reference?.includes("khata:") ? "YES" : "NO"}`,
            );
        });

        // Get the 5 most recent bills from ledger DB
        const recentBills = await ledgerPrisma.bill.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { khata: true },
        });

        console.log("\nLatest bills in ledger database:");
        recentBills.forEach((bill) => {
            console.log(
                `- ID ${bill.id}: ${bill.billNumber} - ${bill.description || "No description"} - $${bill.amount}`,
            );
            console.log(
                `  Created: ${bill.createdAt} - Khata: ${bill.khata?.name || "Unknown"} (ID: ${bill.khataId})`,
            );

            // Check if there's a corresponding entry in the main DB
            const billRef = `BILL-${bill.billNumber}`;
            const hasCorrespondingEntry = recentMainEntries.some((e) =>
                e.reference?.includes(billRef),
            );
            console.log(
                `  Has corresponding entry: ${hasCorrespondingEntry ? "YES" : "NO"}`,
            );
        });

        // Check 3: Database schemas
        console.log("\n3️⃣ Verifying database schemas...");

        // Check if LedgerEntry has the right columns
        try {
            const ledgerEntryColumns = await mainPrisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'LedgerEntry'
      `;

            console.log("LedgerEntry table columns:");
            const columnNames = ledgerEntryColumns.map(
                (col) => col.column_name,
            );
            console.log(columnNames);

            // Check for required columns
            const requiredColumns = ["entryType", "notes", "reference"];
            const missingColumns = requiredColumns.filter(
                (col) => !columnNames.includes(col),
            );

            if (missingColumns.length > 0) {
                console.log(
                    `⚠️ Missing required columns: ${missingColumns.join(", ")}`,
                );
            } else {
                console.log("✅ All required columns are present");
            }
        } catch (error) {
            console.error("Error checking schema:", error);
        }

        // Check 4: Khata references
        console.log("\n4️⃣ Analyzing khata references...");

        // Count entries with khata refs
        const entriesWithKhataRefs = await mainPrisma.ledgerEntry.count({
            where: {
                OR: [
                    { notes: { contains: "khata:" } },
                    { reference: { contains: "khata:" } },
                ],
            },
        });

        const entriesWithoutKhataRefs = mainEntryCount - entriesWithKhataRefs;
        const percentWithRefs = (
            (entriesWithKhataRefs / mainEntryCount) *
            100
        ).toFixed(2);

        console.log(
            `Entries with khata references: ${entriesWithKhataRefs} (${percentWithRefs}%)`,
        );
        console.log(
            `Entries without khata references: ${entriesWithoutKhataRefs}`,
        );

        if (entriesWithoutKhataRefs > 0) {
            console.log(
                "⚠️ Some entries don't have khata references and won't appear in the UI",
            );
            console.log("Run node fix-remaining-entries.js to fix all entries");
        }

        // Check 5: Get the active khatas from the ledger DB
        console.log("\n5️⃣ Checking available khatas...");

        const khatas = await ledgerPrisma.khata.findMany();
        console.log(`Found ${khatas.length} khatas:`);
        khatas.forEach((khata) => {
            console.log(`- ID ${khata.id}: ${khata.name}`);
        });

        // Check 6: Test filtering by khataId to verify UI query
        console.log("\n6️⃣ Testing khataId filtering...");

        if (khatas.length > 0) {
            const targetKhataId = khatas[0].id;

            const filteredEntries = await mainPrisma.ledgerEntry.findMany({
                where: {
                    OR: [
                        { notes: { contains: `khata:${targetKhataId}` } },
                        { reference: { contains: `khata:${targetKhataId}` } },
                    ],
                },
                take: 5,
            });

            console.log(
                `Found ${filteredEntries.length} entries for khata ID ${targetKhataId}`,
            );

            if (filteredEntries.length > 0) {
                console.log("Sample filtered entry:");
                console.log({
                    id: filteredEntries[0].id,
                    type: filteredEntries[0].entryType,
                    description: filteredEntries[0].description,
                    notes: filteredEntries[0].notes,
                });

                console.log("✅ Khata filtering is working properly");
            } else if (mainEntryCount > 0) {
                console.log(
                    "⚠️ No entries found for this khata - filtering may not be working",
                );
            }
        }

        // Conclusion and recommendations
        console.log("\n📊 Diagnostic Summary:");
        console.log(`- Main database entries: ${mainEntryCount}`);
        console.log(
            `- Ledger database items: ${khataCount + billCount + transactionCount}`,
        );

        if (entriesWithoutKhataRefs > 0) {
            console.log(
                "\n⚠️ Action needed: Run node fix-remaining-entries.js to add khata references to all entries",
            );
        }

        if (billCount > 0 && mainEntryCount === 0) {
            console.log(
                "\n⚠️ Action needed: Run node sync-new-ledger-entries.js to sync ledger data to main database",
            );
        }

        await mainPrisma.$disconnect();
        await ledgerPrisma.$disconnect();
    } catch (error) {
        console.error("Error running diagnostic:", error);
    }
}

runDiagnostic();
