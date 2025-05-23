// Script to check a specific bill's khata references
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get bill ID from command line arguments or use default
const billId = process.argv[2] ? parseInt(process.argv[2]) : null;

async function checkBill(id) {
    console.log("=== 🔍 Ledger Bill Diagnostic Tool ===\n");

    if (!id) {
        console.log("No bill ID provided. Will check the most recent bill.");

        // Get the most recent bill
        const recentBill = await prisma.ledgerEntry.findFirst({
            where: { entryType: "BILL" },
            orderBy: { id: "desc" },
        });

        if (!recentBill) {
            console.error("❌ No bills found in the database");
            return;
        }

        id = recentBill.id;
        console.log(`Using most recent bill with ID: ${id}\n`);
    }

    try {
        // Fetch the bill from the database
        const bill = await prisma.ledgerEntry.findUnique({
            where: { id },
        });

        if (!bill) {
            console.error(`❌ No bill found with ID: ${id}`);
            return;
        }

        console.log("Bill details:");
        console.log("=============");
        console.log(`ID: ${bill.id}`);
        console.log(`Type: ${bill.entryType}`);
        console.log(`Description: ${bill.description}`);
        console.log(`Amount: ${bill.amount}`);
        console.log(`Remaining Amount: ${bill.remainingAmount}`);
        console.log(`Status: ${bill.status}`);
        console.log(`Reference: ${bill.reference || "(none)"}`);
        console.log(`Notes: ${bill.notes || "(none)"}`);
        console.log(`Created: ${bill.createdAt}`);
        console.log(`Updated: ${bill.updatedAt}`);

        // Check if the bill has khata references
        const hasKhataInReference =
            bill.reference && bill.reference.includes("khata:");
        const hasKhataInNotes = bill.notes && bill.notes.includes("khata:");

        console.log("\nReference check:");
        console.log("===============");
        if (hasKhataInReference) {
            // Extract khata ID from reference
            const khataIdMatch = bill.reference.match(/khata:(\d+)/);
            const khataId = khataIdMatch ? khataIdMatch[1] : null;

            console.log(
                `✅ Bill reference contains khata reference: khata:${khataId}`,
            );

            // Check if the khata exists
            if (khataId) {
                const khata = await prisma.ledgerEntry.findFirst({
                    where: {
                        entryType: "KHATA",
                        id: parseInt(khataId),
                    },
                });

                if (khata) {
                    console.log(
                        `✅ Referenced khata exists - ID: ${khata.id}, Name: ${khata.description}`,
                    );
                } else {
                    console.log(
                        `❌ Referenced khata with ID ${khataId} does not exist!`,
                    );
                }
            }
        } else {
            console.log("❌ No khata reference found in bill reference");
        }

        console.log("\nNotes check:");
        console.log("===========");
        if (hasKhataInNotes) {
            // Extract khata ID from notes
            const khataIdMatch = bill.notes.match(/khata:(\d+)/);
            const khataId = khataIdMatch ? khataIdMatch[1] : null;

            console.log(
                `✅ Bill notes contain khata reference: khata:${khataId}`,
            );
        } else {
            console.log("❌ No khata reference found in bill notes");
        }

        // Check for consistency between reference and notes
        if (hasKhataInReference && hasKhataInNotes) {
            const refKhataId = bill.reference.match(/khata:(\d+)/)?.[1];
            const notesKhataId = bill.notes.match(/khata:(\d+)/)?.[1];

            if (refKhataId === notesKhataId) {
                console.log(
                    `\n✅ Khata references are consistent between reference and notes: khata:${refKhataId}`,
                );
            } else {
                console.log(
                    `\n❌ Inconsistent khata references! Reference: khata:${refKhataId}, Notes: khata:${notesKhataId}`,
                );
            }
        }

        // Final assessment
        console.log("\nDiagnostic result:");
        console.log("=================");
        if (hasKhataInReference || hasKhataInNotes) {
            console.log(
                "✅ Bill has khata references and should appear in the ledger UI",
            );
        } else {
            console.log(
                "❌ Bill has no khata references and may not appear in the ledger UI",
            );

            // Offer to fix
            console.log(
                "\nDo you want to add khata references to this bill? (y/n)",
            );
            process.stdin.once("data", async (data) => {
                const response = data.toString().trim().toLowerCase();

                if (response === "y" || response === "yes") {
                    // Default to khata ID 1
                    const defaultKhataId = 1;

                    await prisma.ledgerEntry.update({
                        where: { id: bill.id },
                        data: {
                            reference:
                                `${bill.reference || `BILL-${bill.id}`} khata:${defaultKhataId}`.trim(),
                            notes: `${bill.notes || ""}${bill.notes ? "\n" : ""}khata:${defaultKhataId}`.trim(),
                        },
                    });

                    console.log(
                        `\n✅ Added khata:${defaultKhataId} references to bill ${bill.id}`,
                    );
                } else {
                    console.log("\nNo changes made to the bill.");
                }

                await prisma.$disconnect();
                process.exit(0);
            });

            // Keep the process running to wait for user input
            return;
        }
    } catch (error) {
        console.error("Error checking bill:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Execute the check
checkBill(billId).catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
