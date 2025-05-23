// Script to create test data in the ledger database
const { PrismaClient } = require("@prisma/ledger-client");

async function main() {
    console.log("Creating test data for ledger database...");

    // Create a Prisma client for the ledger database
    const prisma = new PrismaClient({
        log: ["query", "info", "warn", "error"],
    });

    try {
        // Create a test Khata (Account Book)
        const khata = await prisma.khata.create({
            data: {
                name: "Main Business Account",
                description: "Primary business tracking account",
                updatedAt: new Date(),
            },
        });
        console.log("Created test khata:", khata);

        // Create a test Party (Customer)
        const customer = await prisma.party.create({
            data: {
                name: "ABC Textiles",
                type: "CUSTOMER",
                khataId: khata.id,
                contact: "Mr. Ahmed",
                phoneNumber: "0300-1234567",
                email: "contact@abctextiles.com",
                address: "123 Main Street",
                city: "Lahore",
                description: "Regular customer",
                customerId: 1, // Reference to main system
                updatedAt: new Date(),
            },
        });
        console.log("Created test customer:", customer);

        // Create a test Party (Vendor)
        const vendor = await prisma.party.create({
            data: {
                name: "XYZ Supplies",
                type: "VENDOR",
                khataId: khata.id,
                contact: "Ms. Fatima",
                phoneNumber: "0300-7654321",
                email: "info@xyzsupplies.com",
                address: "456 Business Avenue",
                city: "Karachi",
                description: "Regular supplier",
                vendorId: 1, // Reference to main system
                updatedAt: new Date(),
            },
        });
        console.log("Created test vendor:", vendor);

        // Create a test Bank Account
        const bankAccount = await prisma.bankAccount.create({
            data: {
                accountName: "Business Operations",
                accountNumber: "12345-67890",
                bankName: "Allied Bank",
                branchName: "Main Branch",
                khataId: khata.id,
                balance: 50000.0,
                description: "Main business account",
                updatedAt: new Date(),
            },
        });
        console.log("Created test bank account:", bankAccount);

        // Create a test Bill (Sale)
        const saleBill = await prisma.bill.create({
            data: {
                billNumber: "SALE-001",
                khataId: khata.id,
                partyId: customer.id,
                billDate: new Date(),
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days later
                amount: 15000.0,
                paidAmount: 5000.0,
                description: "Sale of fabric materials",
                billType: "SALE",
                status: "PARTIAL",
                updatedAt: new Date(),
            },
        });
        console.log("Created test sale bill:", saleBill);

        // Create a test Bill (Purchase)
        const purchaseBill = await prisma.bill.create({
            data: {
                billNumber: "PURCHASE-001",
                khataId: khata.id,
                partyId: vendor.id,
                billDate: new Date(),
                amount: 10000.0,
                paidAmount: 10000.0,
                description: "Purchase of raw materials",
                billType: "PURCHASE",
                status: "PAID",
                updatedAt: new Date(),
            },
        });
        console.log("Created test purchase bill:", purchaseBill);

        // Create test Transactions
        const saleTransaction = await prisma.transaction.create({
            data: {
                khataId: khata.id,
                transactionDate: new Date(),
                amount: 5000.0,
                description: "Initial payment for SALE-001",
                transactionType: "CASH_RECEIPT",
                partyId: customer.id,
                billId: saleBill.id,
                bankAccountId: bankAccount.id,
                updatedAt: new Date(),
            },
        });
        console.log("Created test sale transaction:", saleTransaction);

        const purchaseTransaction = await prisma.transaction.create({
            data: {
                khataId: khata.id,
                transactionDate: new Date(),
                amount: 10000.0,
                description: "Full payment for PURCHASE-001",
                transactionType: "CASH_PAYMENT",
                partyId: vendor.id,
                billId: purchaseBill.id,
                bankAccountId: bankAccount.id,
                updatedAt: new Date(),
            },
        });
        console.log("Created test purchase transaction:", purchaseTransaction);

        // Create a LedgerEntry
        const ledgerEntry = await prisma.ledgerEntry.create({
            data: {
                entryType: "KHATA",
                description: "Test Ledger Entry",
                amount: 1000.0,
                remainingAmount: 1000.0,
                status: "PENDING",
                updatedAt: new Date(),
            },
        });
        console.log("Created test ledger entry:", ledgerEntry);

        console.log("✅ Test data created successfully!");
    } catch (error) {
        console.error("Error creating test data:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
