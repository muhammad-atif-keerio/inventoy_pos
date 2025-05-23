// Script to fix the most recent ledger entries
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

console.log("🔄 Fixing most recent ledger entries...");

async function fixLatestEntries() {
    try {
        // Connect to main database
        const prisma = new PrismaClient();
        await prisma.$connect();
        console.log("✅ Connected to database");

        // Get the 10 most recent entries
        const recentEntries = await prisma.ledgerEntry.findMany({
            orderBy: {
                createdAt: "desc",
            },
            take: 10,
        });

        console.log(`Found ${recentEntries.length} recent entries`);

        if (recentEntries.length === 0) {
            console.log("No entries found. Exiting.");
            await prisma.$disconnect();
            return;
        }

        console.log("\nMost recent entry:");
        console.log({
            id: recentEntries[0].id,
            type: recentEntries[0].entryType,
            description: recentEntries[0].description,
            amount: recentEntries[0].amount.toString(),
            created: recentEntries[0].createdAt,
            reference: recentEntries[0].reference,
            notes: recentEntries[0].notes,
        });

        // Find entries without khata references
        const entriesToFix = recentEntries.filter((entry) => {
            const hasKhataInNotes = entry.notes?.includes("khata:");
            const hasKhataInRef = entry.reference?.includes("khata:");
            return !hasKhataInNotes && !hasKhataInRef;
        });

        console.log(
            `Found ${entriesToFix.length} entries that need khata references`,
        );

        // Fix entries
        let updatedCount = 0;
        for (const entry of entriesToFix) {
            try {
                const updatedNotes = `${entry.notes || ""}\nkhata:1\nfixed:${new Date().toISOString()}`;
                const updatedReference = entry.reference
                    ? `${entry.reference} khata:1`
                    : `khata:1 ${entry.entryType}`;

                await prisma.ledgerEntry.update({
                    where: { id: entry.id },
                    data: {
                        notes: updatedNotes,
                        reference: updatedReference,
                    },
                });

                console.log(
                    `✅ Updated entry ${entry.id}: ${entry.description}`,
                );
                updatedCount++;
            } catch (error) {
                console.error(
                    `❌ Failed to update entry ${entry.id}:`,
                    error.message,
                );
            }
        }

        console.log(`\n${updatedCount} entries updated with khata references.`);

        // Check if entries are now properly referenced
        if (updatedCount > 0) {
            console.log("\nVerifying updates...");
            const verifyEntries = await prisma.ledgerEntry.findMany({
                where: {
                    id: {
                        in: entriesToFix.map((e) => e.id),
                    },
                },
            });

            const allFixed = verifyEntries.every(
                (entry) =>
                    entry.notes?.includes("khata:") ||
                    entry.reference?.includes("khata:"),
            );

            if (allFixed) {
                console.log("✅ All entries now have khata references");
                console.log("The ledger UI should now display these entries.");
            } else {
                console.log(
                    "⚠️ Some entries still do not have khata references.",
                );
            }
        }

        // Check available khatas as reference
        try {
            console.log("\nChecking available khatas...");
            const khatas = await prisma.$queryRaw`
        SELECT DISTINCT substring(notes from 'khata:([0-9]+)') as khata_id, count(*) 
        FROM "LedgerEntry" 
        WHERE notes LIKE '%khata:%' 
        GROUP BY khata_id
      `;

            console.log("Available khata IDs in entries:");
            console.log(khatas);
        } catch (error) {
            console.log("Could not extract khata IDs:", error.message);
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

fixLatestEntries();
