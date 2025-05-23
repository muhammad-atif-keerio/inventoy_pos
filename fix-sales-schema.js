// Script to migrate SalesOrderItem table to use separate threadPurchaseId and fabricProductionId fields
require("dotenv").config(); // Load environment variables from .env file

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Exit handler to ensure we always disconnect from Prisma
process.on("exit", () => {
    try {
        prisma.$disconnect();
    } catch (e) {
        console.error("Error disconnecting from Prisma:", e);
    }
});

// Also handle other termination signals
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
    process.on(signal, () => {
        console.log(`Received ${signal}, gracefully shutting down...`);
        try {
            prisma.$disconnect();
        } catch (e) {
            console.error("Error disconnecting from Prisma:", e);
        }
        process.exit(0);
    });
});

async function migrateSalesOrderItems() {
    console.log("🔍 Starting sales schema migration...");
    console.log("Database URL detected:", Boolean(process.env.DATABASE_URL));

    try {
        // First check if we have a connection
        try {
            // Test database connection with a simple query
            const result = await prisma.$queryRawUnsafe(`SELECT 1 as test`);
            console.log("Database connection successful:", result);
        } catch (connectionError) {
            console.error("Failed to connect to database:", connectionError);
            console.log("\nPossible solutions:");
            console.log("1. Make sure your .env file contains DATABASE_URL");
            console.log(
                "2. If using a direct URL, make sure DIRECT_URL is also in your .env file",
            );
            console.log("3. Verify that your database credentials are correct");
            console.log(
                "4. Check if your database server is running and accessible",
            );

            // Re-throw to stop execution
            throw new Error(
                "Database connection failed. Fix connection issues before proceeding.",
            );
        }

        // Step 1: Get all existing sales order items
        const existingItems = await prisma.salesOrderItem.findMany();
        console.log(
            `Found ${existingItems.length} sales order items to migrate`,
        );

        // Step 2: Check if columns already exist
        const columnsCheck = await prisma.$queryRawUnsafe(
            `SELECT column_name 
      FROM information_schema.columns 
       WHERE table_name = 'SalesOrderItem' AND table_schema = 'public'
       AND column_name IN ('threadPurchaseId', 'fabricProductionId')`,
        );

        const hasThreadPurchaseId = columnsCheck.some(
            (c) => c.column_name === "threadPurchaseId",
        );
        const hasFabricProductionId = columnsCheck.some(
            (c) => c.column_name === "fabricProductionId",
        );

        console.log(
            `Column check: threadPurchaseId=${hasThreadPurchaseId}, fabricProductionId=${hasFabricProductionId}`,
        );

        // Step 3: Modifying table structure if needed
        console.log("Modifying table structure...");

        // First remove the constraints - we need to find them first
        const constraints = await prisma.$queryRawUnsafe(
            `SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
              ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
       FROM information_schema.table_constraints AS tc 
       JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
       WHERE tc.table_name = 'SalesOrderItem' AND tc.constraint_type = 'FOREIGN KEY'`,
        );

        console.log("Foreign key constraints found:", constraints);

        // Drop relevant constraints one by one
        for (const constraint of constraints) {
            if (
                constraint.column_name === "productId" &&
                (constraint.foreign_table_name === "ThreadPurchase" ||
                    constraint.foreign_table_name === "FabricProduction")
            ) {
                console.log(
                    `Dropping constraint: ${constraint.constraint_name}`,
                );
                await prisma.$executeRawUnsafe(
                    `ALTER TABLE "SalesOrderItem" DROP CONSTRAINT "${constraint.constraint_name}"`,
                );
            }
        }

        // Add new columns if they don't exist
        if (!hasThreadPurchaseId) {
            console.log("Adding threadPurchaseId column...");
            await prisma.$executeRawUnsafe(
                `ALTER TABLE "SalesOrderItem" ADD COLUMN "threadPurchaseId" INTEGER`,
            );
        }

        if (!hasFabricProductionId) {
            console.log("Adding fabricProductionId column...");
            await prisma.$executeRawUnsafe(
                `ALTER TABLE "SalesOrderItem" ADD COLUMN "fabricProductionId" INTEGER`,
            );
        }

        console.log("Table structure modified successfully");

        // Step 4: Update each item based on product type
        console.log("Migrating existing data...");

        for (const item of existingItems) {
            try {
                if (item.productType === "THREAD") {
                    console.log(
                        `Updating thread item ${item.id} with productId=${item.productId}`,
                    );
                    await prisma.salesOrderItem.update({
                        where: { id: item.id },
                        data: { threadPurchaseId: item.productId },
                    });
                } else if (item.productType === "FABRIC") {
                    console.log(
                        `Updating fabric item ${item.id} with productId=${item.productId}`,
                    );
                    await prisma.salesOrderItem.update({
                        where: { id: item.id },
                        data: { fabricProductionId: item.productId },
                    });
                }
            } catch (error) {
                console.error(`Error updating item ${item.id}:`, error);
            }
        }

        console.log("Data migration completed");

        // Step 5: Add back the constraints with the correct relationships
        console.log("Adding updated foreign key constraints...");

        await prisma.$executeRawUnsafe(
            `ALTER TABLE "SalesOrderItem" 
       ADD CONSTRAINT "SalesOrderItem_threadPurchaseId_fkey" 
       FOREIGN KEY ("threadPurchaseId") REFERENCES "ThreadPurchase"(id)
       ON DELETE SET NULL ON UPDATE CASCADE`,
        );

        await prisma.$executeRawUnsafe(
            `ALTER TABLE "SalesOrderItem" 
       ADD CONSTRAINT "SalesOrderItem_fabricProductionId_fkey" 
       FOREIGN KEY ("fabricProductionId") REFERENCES "FabricProduction"(id)
       ON DELETE SET NULL ON UPDATE CASCADE`,
        );

        console.log("Foreign key constraints added successfully");

        // Step 6: Create indexes for the new columns
        console.log("Creating indexes for new columns...");

        await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "SalesOrderItem_threadPurchaseId_idx"
       ON "SalesOrderItem" ("threadPurchaseId")`,
        );

        await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "SalesOrderItem_fabricProductionId_idx"
       ON "SalesOrderItem" ("fabricProductionId")`,
        );

        console.log("✅ Sales schema migration completed successfully");
    } catch (error) {
        console.error("❌ Error during migration:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

migrateSalesOrderItems().catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
});
