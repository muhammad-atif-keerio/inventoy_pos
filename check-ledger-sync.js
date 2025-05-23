// Script to check if the ledger data is properly connected and visible
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

console.log("Checking ledger data visibility...");

async function checkLedgerSync() {
    try {
        // Connect to main database
        const prisma = new PrismaClient();
        await prisma.$connect();
        console.log("✅ Connected to database");

        // Get all ledger entries with khata reference
        const entries = await prisma.ledgerEntry.findMany({
            where: {
                OR: [
                    { notes: { contains: "khata:" } },
                    { reference: { contains: "khata:" } },
                ],
            },
        });

        console.log(
            `Found ${entries.length} ledger entries with khata references`,
        );

        // Group entries by khata
        const entriesByKhata = {};
        for (const entry of entries) {
            // Extract khata ID from reference or notes
            let khataId;
            const notesMatch = entry.notes?.match(/khata:(\d+)/);
            const refMatch = entry.reference?.match(/khata:(\d+)/);
            khataId =
                (notesMatch && notesMatch[1]) ||
                (refMatch && refMatch[1]) ||
                "unknown";

            if (!entriesByKhata[khataId]) {
                entriesByKhata[khataId] = [];
            }
            entriesByKhata[khataId].push({
                id: entry.id,
                type: entry.entryType,
                description: entry.description,
                amount: entry.amount.toString(),
                remainingAmount: entry.remainingAmount.toString(),
                status: entry.status,
            });
        }

        // Display entries by khata
        console.log("\nEntries by Khata:");
        for (const khataId in entriesByKhata) {
            console.log(
                `Khata ID ${khataId}: ${entriesByKhata[khataId].length} entries`,
            );
            if (entriesByKhata[khataId].length > 0) {
                console.log("Sample entries:");
                entriesByKhata[khataId].slice(0, 3).forEach((entry, i) => {
                    console.log(
                        `  ${i + 1}. ${entry.type} - ${entry.description} - $${entry.amount} (${entry.status})`,
                    );
                });
                if (entriesByKhata[khataId].length > 3) {
                    console.log(
                        `  ... and ${entriesByKhata[khataId].length - 3} more entries`,
                    );
                }
            }
        }

        // Check for entries WITHOUT khata reference
        const entriesWithoutKhata = await prisma.ledgerEntry.findMany({
            where: {
                AND: [
                    { notes: { not: { contains: "khata:" } } },
                    { reference: { not: { contains: "khata:" } } },
                ],
            },
        });

        console.log(
            `\nFound ${entriesWithoutKhata.length} entries WITHOUT khata references`,
        );
        if (entriesWithoutKhata.length > 0) {
            console.log("These entries will NOT appear in the ledger UI!");
            console.log("Sample entries without khata reference:");
            entriesWithoutKhata.slice(0, 3).forEach((entry, i) => {
                console.log(
                    `  ${i + 1}. ${entry.entryType} - ${entry.description} - ${entry.amount.toString()}`,
                );
            });
        }

        // Simulate the API query to verify data is visible to the API
        console.log("\nSimulating API query to check data visibility...");
        const filter = {
            OR: [
                { reference: { contains: "khata:1" } },
                { notes: { contains: "khata:1" } },
            ],
        };

        const apiEntries = await prisma.ledgerEntry.findMany({
            where: filter,
            take: 10,
        });

        console.log(
            `API query would return ${apiEntries.length} entries for Khata ID 1`,
        );

        if (apiEntries.length > 0) {
            console.log(
                "✅ DATA IS VISIBLE! The ledger UI should now display these entries.",
            );
        } else {
            console.log(
                "❌ No data found for Khata ID 1. The ledger UI may still show empty.",
            );
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error("Error checking ledger data:", error);
    }
}

checkLedgerSync();
