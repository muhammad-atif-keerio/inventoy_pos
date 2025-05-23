// Script to fix the sales schema foreign key issue
import { PrismaClient } from "@prisma/client";

async function main() {
    console.log("๐ง Fixing sales schema foreign key issue...");

    const prisma = new PrismaClient();

    try {
        console.log("1๏ธโฃ Checking database connection...");
        await prisma.$queryRaw`SELECT current_timestamp;`;
        console.log("โ Database connection successful.");

        console.log("2๏ธโฃ Checking SalesOrderItem table columns...");
        const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'SalesOrderItem' AND table_schema = 'public';
    `;

        console.log(
            "Found columns:",
            columns.map((c) => c.column_name).join(", "),
        );

        // Check if the columns already exist
        const hasThreadPurchaseId = columns.some(
            (c) => c.column_name === "threadPurchaseId",
        );
        const hasFabricProductionId = columns.some(
            (c) => c.column_name === "fabricProductionId",
        );

        if (hasThreadPurchaseId && hasFabricProductionId) {
            console.log("โ Columns already exist. No schema changes needed.");
            return;
        }

        console.log("3๏ธโฃ Checking foreign key constraints...");
        const constraints = await prisma.$queryRaw`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'SalesOrderItem' 
        AND constraint_type = 'FOREIGN KEY' 
        AND constraint_schema = 'public';
    `;

        console.log(
            "Found constraints:",
            constraints.map((c) => c.constraint_name).join(", "),
        );

        // First drop the foreign key constraints if they exist
        console.log("4๏ธโฃ Dropping existing foreign keys...");
        for (const constraint of constraints) {
            if (
                constraint.constraint_name.includes("ThreadSalesItemFK") ||
                constraint.constraint_name.includes("FabricSalesItemFK")
            ) {
                console.log(
                    `Dropping constraint: ${constraint.constraint_name}`,
                );
                await prisma.$executeRaw`
          ALTER TABLE "SalesOrderItem" DROP CONSTRAINT "${constraint.constraint_name}";
        `;
            }
        }

        // Add new columns if they don't exist
        if (!hasThreadPurchaseId) {
            console.log("5๏ธโฃ Adding threadPurchaseId column...");
            await prisma.$executeRaw`
        ALTER TABLE "SalesOrderItem" 
        ADD COLUMN "threadPurchaseId" INTEGER;
      `;
        }

        if (!hasFabricProductionId) {
            console.log("6๏ธโฃ Adding fabricProductionId column...");
            await prisma.$executeRaw`
        ALTER TABLE "SalesOrderItem" 
        ADD COLUMN "fabricProductionId" INTEGER;
      `;
        }

        // Update existing records to populate the new columns based on productId and type
        console.log("7๏ธโฃ Updating existing THREAD records...");
        await prisma.$executeRaw`
      UPDATE "SalesOrderItem"
      SET "threadPurchaseId" = "productId"
      WHERE "productType" = 'THREAD'::\"ProductType\" AND "threadPurchaseId" IS NULL;
    `;

        console.log("8๏ธโฃ Updating existing FABRIC records...");
        await prisma.$executeRaw`
      UPDATE "SalesOrderItem"
      SET "fabricProductionId" = "productId"
      WHERE "productType" = 'FABRIC'::\"ProductType\" AND "fabricProductionId" IS NULL;
    `;

        // Add new foreign key constraints
        console.log("9๏ธโฃ Adding new foreign key constraints...");
        await prisma.$executeRaw`
      ALTER TABLE "SalesOrderItem"
      ADD CONSTRAINT "ThreadSalesItemFK"
      FOREIGN KEY ("threadPurchaseId")
      REFERENCES "ThreadPurchase" ("id")
      ON DELETE SET NULL;
    `;

        await prisma.$executeRaw`
      ALTER TABLE "SalesOrderItem"
      ADD CONSTRAINT "FabricSalesItemFK"
      FOREIGN KEY ("fabricProductionId")
      REFERENCES "FabricProduction" ("id")
      ON DELETE SET NULL;
    `;

        // Create indexes for the new columns
        console.log("๐ Creating indexes for new columns...");
        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "SalesOrderItem_threadPurchaseId_idx"
      ON "SalesOrderItem" ("threadPurchaseId");
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "SalesOrderItem_fabricProductionId_idx"
      ON "SalesOrderItem" ("fabricProductionId");
    `;

        console.log(
            "โ Schema update complete! The sales form should now work correctly.",
        );
    } catch (error) {
        console.error("โ Error updating schema:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
