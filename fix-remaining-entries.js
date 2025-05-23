// Script to fix remaining entries without khata references
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

console.log("Fixing remaining entries without khata references...");

async function fixRemainingEntries() {
    try {
        // Connect to main database
        const prisma = new PrismaClient();
        await prisma.$connect();
        console.log("✅ Connected to database");

        // Find entries without khata references
        const entriesWithoutKhata = await prisma.ledgerEntry.findMany({
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

        // Update each entry to add khata reference
        let updatedCount = 0;
        for (const entry of entriesWithoutKhata) {
            try {
                // Add khata reference to notes and reference fields
                const updatedNotes = `${entry.notes || ""}\nkhata:1`;
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

                updatedCount++;
                console.log(
                    `✓ Updated entry ${entry.id}: ${entry.description}`,
                );
            } catch (error) {
                console.error(
                    `Failed to update entry ${entry.id}:`,
                    error.message,
                );
            }
        }

        console.log(
            `\n✅ Updated ${updatedCount} of ${entriesWithoutKhata.length} entries`,
        );

        // Verify all entries now have khata references
        const remainingWithoutKhata = await prisma.ledgerEntry.count({
            where: {
                AND: [
                    { notes: { not: { contains: "khata:" } } },
                    { reference: { not: { contains: "khata:" } } },
                ],
            },
        });

        if (remainingWithoutKhata === 0) {
            console.log("✅ SUCCESS: All entries now have khata references!");
            console.log("The ledger UI should now display all entries.");
        } else {
            console.log(
                `⚠️ There are still ${remainingWithoutKhata} entries without khata references.`,
            );
            console.log(
                "You may need to run this script again or check for other issues.",
            );
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error("Error fixing entries:", error);
    }
}

fixRemainingEntries();
