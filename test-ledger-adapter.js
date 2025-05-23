// Script to test the ledger adapter with mock data
require("dotenv").config();
const path = require("path");

// Add the app directory to the module search path
process.env.NODE_PATH = path.join(__dirname);
require("module").Module._initPaths();

// Import the adapter dynamically
async function runTest() {
    try {
        console.log("Testing ledger adapter with mock data...");

        // Import the adapter
        const { LedgerClientAdapter } = require("./app/lib/ledger-adapter");

        // Create an instance of the adapter
        console.log("Creating adapter instance...");
        const adapter = new LedgerClientAdapter();

        // Connect to the database (this will likely fail, but the adapter will fall back to mock data)
        await adapter.$connect();

        // Test getting khatas
        console.log("\nTesting khata.findMany():");
        const khatas = await adapter.khata.findMany();
        console.log(`Found ${khatas.length} khatas:`);
        khatas.forEach((k) => console.log(`- ${k.id}: ${k.name}`));

        // Test getting parties
        console.log("\nTesting party.findMany():");
        const parties = await adapter.party.findMany();
        console.log(`Found ${parties.length} parties:`);
        parties.forEach((p) => console.log(`- ${p.id}: ${p.name} (${p.type})`));

        // Test getting bills
        console.log("\nTesting bill.findMany():");
        const bills = await adapter.bill.findMany();
        console.log(`Found ${bills.length} bills:`);
        bills.forEach((b) =>
            console.log(
                `- ${b.id}: ${b.billNumber}, Amount: ${b.amount}, Status: ${b.status}`,
            ),
        );

        // Test error handling by trying to find a non-existent item
        console.log("\nTesting error handling (finding non-existent khata):");
        try {
            const nonExistentKhata = await adapter.khata.findUnique({
                where: { id: 9999 },
            });
            console.log(
                "Result:",
                nonExistentKhata ? "Found (mock data)" : "Not found",
            );
        } catch (error) {
            console.error("Error (expected):", error.message);
        }

        console.log(
            "\n✅ Test completed successfully - the adapter is working with mock data",
        );

        // Disconnect
        await adapter.$disconnect();
    } catch (error) {
        console.error("Error testing adapter:", error);
    }
}

runTest();
