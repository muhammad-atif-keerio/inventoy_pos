// Script to create a default khata if none exists
require("dotenv").config();
const { PrismaClient } = require("@prisma/ledger-client");

async function createDefaultKhata() {
    console.log("Checking if a default khata needs to be created...");

    const prisma = new PrismaClient({
        log: ["error", "warn"],
    });

    try {
        // Connect to the database
        await prisma.$connect();
        console.log("Connected to the ledger database");

        // Check if any khata exists
        const khataCount = await prisma.khata.count();
        console.log(`Found ${khataCount} existing khata records`);

        if (khataCount === 0) {
            console.log("No khata records found, creating a default one...");

            try {
                // Create a default khata
                const defaultKhata = await prisma.khata.create({
                    data: {
                        name: "Default Khata",
                        description: "System generated default khata",
                    },
                });

                console.log(
                    `✅ Created default khata with ID: ${defaultKhata.id}`,
                );
            } catch (createError) {
                console.error(
                    "Failed to create default khata:",
                    createError.message,
                );

                if (createError.message.includes("connect")) {
                    console.log(
                        "\nThere seems to be a connection issue. The application will use mock data in development mode.",
                    );
                }
            }
        } else {
            console.log(
                "✅ At least one khata already exists, no need to create a default one",
            );
        }
    } catch (error) {
        console.error("Error:", error.message);
        console.log("\nFalling back to mock data in development mode");
    } finally {
        // Disconnect from the database
        await prisma.$disconnect();
        console.log("Disconnected from the database");
    }
}

// Execute the function
createDefaultKhata()
    .catch(console.error)
    .finally(() => console.log("Script completed"));
