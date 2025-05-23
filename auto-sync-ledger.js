// Auto-sync script for ledger system
// This script can be run as a scheduled task to ensure all ledger entries are visible
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaClient: LedgerPrismaClient } = require("@prisma/ledger-client");

console.log(
    `🔄 Running automatic ledger sync at ${new Date().toISOString()}...`,
);

async function autoSyncLedger() {
    try {
        // Connect to databases
        const mainPrisma = new PrismaClient();
        const ledgerPrisma = new LedgerPrismaClient();

        await mainPrisma.$connect();
        await ledgerPrisma.$connect();
        console.log("✅ Connected to both databases");

        // Part 1: Sync bills from ledger database to main database
        console.log("\n1️⃣ Synchronizing bills...");

        // Get all bills from ledger database
        const bills = await ledgerPrisma.bill.findMany({
            include: {
                party: true,
            },
        });

        // Check for existing ledger entries
        const existingBillEntries = await mainPrisma.ledgerEntry.findMany({
            where: {
                entryType: "BILL",
                reference: {
                    contains: "BILL-",
                },
            },
            select: {
                reference: true,
            },
        });

        const existingBillRefs = new Set(
            existingBillEntries.map((e) => e.reference),
        );

        // Create ledger entries for missing bills
        let billsCreated = 0;
        let billsSkipped = 0;

        for (const bill of bills) {
            const reference = `BILL-${bill.billNumber}`;

            if (existingBillRefs.has(reference)) {
                billsSkipped++;
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
                        notes: `khata:${bill.khataId}\nparty:${bill.partyId || "none"}\nauto-sync:${new Date().toISOString()}`,
                        updatedAt: new Date(),
                        vendorId: bill.party?.vendorId || null,
                        customerId: bill.party?.customerId || null,
                    },
                });

                billsCreated++;
            } catch (error) {
                console.error(
                    `Failed to create entry for bill ${bill.billNumber}:`,
                    error.message,
                );
            }
        }

        console.log(
            `Bills: ${billsCreated} created, ${billsSkipped} already exist`,
        );

        // Part 2: Sync transactions from ledger database to main database
        console.log("\n2️⃣ Synchronizing transactions...");

        // Get all transactions from ledger database
        const transactions = await ledgerPrisma.transaction.findMany({
            include: {
                party: true,
            },
        });

        // Check for existing transaction entries
        const existingTxnEntries = await mainPrisma.ledgerEntry.findMany({
            where: {
                entryType: "TRANSACTION",
                reference: {
                    contains: "TXN-",
                },
            },
            select: {
                reference: true,
            },
        });

        const existingTxnRefs = new Set(
            existingTxnEntries.map((e) => e.reference),
        );

        // Create ledger entries for missing transactions
        let txnsCreated = 0;
        let txnsSkipped = 0;

        for (const txn of transactions) {
            const reference = `TXN-${txn.id}`;

            if (existingTxnRefs.has(reference)) {
                txnsSkipped++;
                continue;
            }

            try {
                await mainPrisma.ledgerEntry.create({
                    data: {
                        entryType: "TRANSACTION",
                        entryDate: txn.transactionDate,
                        description: txn.description || `Transaction ${txn.id}`,
                        amount: txn.amount,
                        remainingAmount: 0, // Transactions are usually completed immediately
                        status: "COMPLETED",
                        reference: reference,
                        notes: `khata:${txn.khataId}\nparty:${txn.partyId || "none"}\nauto-sync:${new Date().toISOString()}`,
                        updatedAt: new Date(),
                        vendorId:
                            txn.party?.type === "VENDOR"
                                ? txn.party?.vendorId
                                : null,
                        customerId:
                            txn.party?.type === "CUSTOMER"
                                ? txn.party?.customerId
                                : null,
                    },
                });

                txnsCreated++;
            } catch (error) {
                console.error(
                    `Failed to create entry for transaction ${txn.id}:`,
                    error.message,
                );
            }
        }

        console.log(
            `Transactions: ${txnsCreated} created, ${txnsSkipped} already exist`,
        );

        // Part 3: Fix entries without khata references
        console.log("\n3️⃣ Fixing entries without khata references...");

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

        // Add khata references to entries that don't have them
        let entriesFixed = 0;

        for (const entry of entriesWithoutKhata) {
            try {
                await mainPrisma.ledgerEntry.update({
                    where: { id: entry.id },
                    data: {
                        notes: `${entry.notes || ""}\nkhata:1\nauto-sync:${new Date().toISOString()}`,
                        reference: entry.reference
                            ? `${entry.reference} khata:1`
                            : `khata:1 ${entry.entryType}`,
                    },
                });

                entriesFixed++;
            } catch (error) {
                console.error(
                    `Failed to update entry ${entry.id}:`,
                    error.message,
                );
            }
        }

        console.log(`Added khata references to ${entriesFixed} entries`);

        // Summary
        console.log("\n📊 Auto-sync summary:");
        console.log(
            `- Bills: ${billsCreated} created, ${billsSkipped} skipped`,
        );
        console.log(
            `- Transactions: ${txnsCreated} created, ${txnsSkipped} skipped`,
        );
        console.log(`- Entries fixed: ${entriesFixed}`);
        console.log(
            `- Total changes: ${billsCreated + txnsCreated + entriesFixed}`,
        );

        if (billsCreated + txnsCreated + entriesFixed > 0) {
            console.log(
                "✅ Sync completed with changes - ledger UI should now show updated data",
            );
        } else {
            console.log("ℹ️ No changes needed - all data already synchronized");
        }

        await mainPrisma.$disconnect();
        await ledgerPrisma.$disconnect();
    } catch (error) {
        console.error("Error during auto-sync:", error);
    }
}

// Run the sync function
autoSyncLedger()
    .then(() => {
        console.log("Auto-sync process completed");
    })
    .catch((error) => {
        console.error("Fatal error during auto-sync:", error);
        process.exit(1);
    });
