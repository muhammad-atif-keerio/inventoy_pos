// Script to synchronize recent ledger entries with the main ledger system
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaClient: LedgerPrismaClient } = require("@prisma/ledger-client");

console.log("🔄 Starting synchronization of recent ledger entries...");

async function syncRecentEntries() {
    try {
        // Connect to both databases
        const mainPrisma = new PrismaClient();
        const ledgerPrisma = new LedgerPrismaClient();

        await mainPrisma.$connect();
        await ledgerPrisma.$connect();
        console.log("✅ Connected to both databases");

        // Get recent bills from the ledger database (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        console.log(
            `\n1. Fetching recent bills (since ${thirtyDaysAgo.toISOString()})...`,
        );
        const recentBills = await ledgerPrisma.bill.findMany({
            where: {
                createdAt: {
                    gte: thirtyDaysAgo,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                party: true,
                khata: true,
            },
        });

        console.log(
            `Found ${recentBills.length} bills created in the last 30 days`,
        );

        if (recentBills.length > 0) {
            console.log("Most recent bill:", {
                id: recentBills[0].id,
                billNumber: recentBills[0].billNumber,
                date: recentBills[0].createdAt,
                khata: recentBills[0].khata?.name || "Unknown",
            });
        }

        // Check for existing ledger entries to avoid duplicates
        console.log(
            "\n2. Checking for existing ledger entries to avoid duplicates...",
        );
        const references = recentBills.map((bill) => `BILL-${bill.billNumber}`);

        const existingEntries = await mainPrisma.ledgerEntry.findMany({
            where: {
                reference: {
                    in: references,
                },
            },
            select: {
                id: true,
                reference: true,
            },
        });

        const existingReferences = new Set(
            existingEntries.map((e) => e.reference),
        );
        console.log(`Found ${existingEntries.length} existing ledger entries`);

        // Synchronize missing bills
        console.log("\n3. Synchronizing missing bills...");
        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const bill of recentBills) {
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
                        vendorId:
                            bill.party?.type === "VENDOR"
                                ? bill.party?.vendorId
                                : null,
                        customerId:
                            bill.party?.type === "CUSTOMER"
                                ? bill.party?.customerId
                                : null,
                    },
                });

                console.log(`✓ Created entry for bill ${bill.billNumber}`);
                createdCount++;
            } catch (createError) {
                console.error(
                    `❌ Failed to create entry for bill ${bill.billNumber}:`,
                    createError.message,
                );
                errorCount++;
            }
        }

        // Check for recent transactions
        console.log("\n4. Checking for recent transactions...");
        const recentTransactions = await ledgerPrisma.transaction.findMany({
            where: {
                createdAt: {
                    gte: thirtyDaysAgo,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                party: true,
                khata: true,
            },
            take: 100,
        });

        console.log(
            `Found ${recentTransactions.length} transactions created in the last 30 days`,
        );

        if (recentTransactions.length > 0) {
            console.log("Most recent transaction:", {
                id: recentTransactions[0].id,
                type: recentTransactions[0].transactionType,
                amount: recentTransactions[0].amount.toString(),
                date: recentTransactions[0].createdAt,
            });

            // Check for existing transaction entries
            const txnReferences = recentTransactions.map(
                (txn) => `TXN-${txn.id}`,
            );

            const existingTxns = await mainPrisma.ledgerEntry.findMany({
                where: {
                    reference: {
                        in: txnReferences,
                    },
                },
                select: {
                    reference: true,
                },
            });

            const existingTxnRefs = new Set(
                existingTxns.map((e) => e.reference),
            );
            console.log(
                `Found ${existingTxns.length} existing transaction entries`,
            );

            // Synchronize missing transactions
            console.log("\n5. Synchronizing missing transactions...");

            for (const txn of recentTransactions) {
                const reference = `TXN-${txn.id}`;

                if (existingTxnRefs.has(reference)) {
                    skippedCount++;
                    continue;
                }

                try {
                    await mainPrisma.ledgerEntry.create({
                        data: {
                            entryType: "TRANSACTION",
                            entryDate: txn.transactionDate,
                            description:
                                txn.description || `Transaction ${txn.id}`,
                            amount: txn.amount,
                            remainingAmount: 0, // Transactions are usually completed immediately
                            status: "COMPLETED",
                            reference: reference,
                            notes: `khata:${txn.khataId}\nparty:${txn.partyId || "none"}\nsync:${new Date().toISOString()}`,
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

                    console.log(`✓ Created entry for transaction ${txn.id}`);
                    createdCount++;
                } catch (createError) {
                    console.error(
                        `❌ Failed to create entry for transaction ${txn.id}:`,
                        createError.message,
                    );
                    errorCount++;
                }
            }
        }

        // Check for any entries in main database without khata references
        console.log("\n6. Checking for entries without khata references...");

        const entriesWithoutKhata = await mainPrisma.ledgerEntry.findMany({
            where: {
                AND: [
                    { notes: { not: { contains: "khata:" } } },
                    { reference: { not: { contains: "khata:" } } },
                ],
                createdAt: {
                    gte: thirtyDaysAgo,
                },
            },
            take: 100,
        });

        console.log(
            `Found ${entriesWithoutKhata.length} recent entries without khata references`,
        );

        // Add khata references to entries that don't have them
        if (entriesWithoutKhata.length > 0) {
            console.log("Adding khata references to these entries...");

            for (const entry of entriesWithoutKhata) {
                try {
                    await mainPrisma.ledgerEntry.update({
                        where: { id: entry.id },
                        data: {
                            notes: `${entry.notes || ""}\nkhata:1\nsync:${new Date().toISOString()}`,
                            reference: entry.reference
                                ? `${entry.reference} khata:1`
                                : "khata:1",
                        },
                    });

                    console.log(
                        `✓ Updated entry ${entry.id}: ${entry.description}`,
                    );
                    createdCount++;
                } catch (updateError) {
                    console.error(
                        `❌ Failed to update entry ${entry.id}:`,
                        updateError.message,
                    );
                    errorCount++;
                }
            }
        }

        // Summary
        console.log("\n🔄 Synchronization Summary:");
        console.log(`✓ Created/updated ${createdCount} entries`);
        console.log(`✓ Skipped ${skippedCount} existing entries`);
        console.log(`❌ Failed to process ${errorCount} entries`);

        if (errorCount > 0) {
            console.log(
                "\n⚠️ Some entries failed to synchronize. Check the logs above for details.",
            );
        } else {
            console.log("\n✅ All entries processed successfully!");
        }

        // Recommendation for automatic synchronization
        console.log("\n📋 Recommendation:");
        console.log("To ensure future entries are automatically visible:");
        console.log(
            "1. Add a hook in app/api/ledger/bill/route.ts and app/api/ledger/transactions/route.ts",
        );
        console.log(
            "2. The hook should create a corresponding LedgerEntry record with khata reference",
        );
        console.log("3. Set up a daily job to run this synchronization script");

        console.log(
            "\nNow try refreshing the ledger page to see the new entries.",
        );

        await ledgerPrisma.$disconnect();
        await mainPrisma.$disconnect();
    } catch (error) {
        console.error("Unexpected error during synchronization:", error);
    }
}

syncRecentEntries();
