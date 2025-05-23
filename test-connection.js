// Test connection to the ledger database
require("dotenv").config();
const { PrismaClient } = require("@prisma/ledger-client");

async function testConnection() {
    console.log("Testing connection to ledger database...");
    console.log(
        `LEDGER_DATABASE_URL: ${process.env.LEDGER_DATABASE_URL?.replace(/:[^:]*@/, ":****@")}`,
    );

    try {
        const prisma = new PrismaClient();
        console.log("Connecting to database...");

        await prisma.$connect();
        console.log("✅ Connection successful!");

        // Try a simple query
        console.log("Testing query: Fetching khatas...");
        const khatas = await prisma.khata.findMany({ take: 5 });
        console.log(`Retrieved ${khatas.length} khatas`);

        if (khatas.length > 0) {
            console.log("First khata:", khatas[0]);
        } else {
            console.log("No khatas found. Creating a test khata...");
            const newKhata = await prisma.khata.create({
                data: {
                    name: "Test Khata",
                    description: "Created during connection test",
                },
            });
            console.log("Created test khata:", newKhata);
        }

        await prisma.$disconnect();
        console.log("✅ Database test completed successfully!");
        return true;
    } catch (error) {
        console.error("❌ Connection failed:", error);
        return false;
    }
}

testConnection()
    .then((success) => {
        if (success) {
            console.log("The ledger database connection is working correctly!");
        } else {
            console.log(
                "There are issues with the ledger database connection.",
            );
            console.log(
                "Check your .env file and make sure the connection strings are correct.",
            );
        }
    })
    .catch((err) => {
        console.error("Unexpected error:", err);
    });
