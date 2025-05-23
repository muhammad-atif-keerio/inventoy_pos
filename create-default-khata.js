// Script to create a default khata if it doesn't exist
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createDefaultKhata() {
    console.log("=== 🏦 Creating default khata if needed ===\n");

    try {
        // Check if any khata entries exist
        const existingKhatas = await prisma.ledgerEntry.findMany({
            where: { entryType: "KHATA" },
        });

        console.log(`Found ${existingKhatas.length} existing khata entries.`);

        if (existingKhatas.length > 0) {
            console.log("\nExisting khatas:");
            existingKhatas.forEach((khata) => {
                console.log(`- ID: ${khata.id}, Name: ${khata.description}`);
            });

            console.log(
                "\n✅ At least one khata already exists. No need to create default.",
            );
        } else {
            console.log("\nNo khata entries found. Creating default khata...");

            // Create a default khata
            const defaultKhata = await prisma.ledgerEntry.create({
                data: {
                    entryType: "KHATA",
                    description: "Default Khata",
                    amount: 0,
                    remainingAmount: 0,
                    status: "PENDING",
                    entryDate: new Date(),
                    updatedAt: new Date(),
                },
            });

            console.log(
                `\n✅ Created default khata with ID: ${defaultKhata.id}`,
            );
        }
    } catch (error) {
        console.error("\n❌ Error creating default khata:", error);
    } finally {
        await prisma.$disconnect();
    }
}

createDefaultKhata().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
