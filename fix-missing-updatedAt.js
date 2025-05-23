/**
 * This script fixes missing updatedAt fields in Prisma create operations.
 * It adds updatedAt: new Date() to all create operations in the codebase.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixMissingFields() {
    console.log("Starting to fix missing updatedAt fields in the database...");

    try {
        // Run a raw SQL query to set all null updatedAt fields to current timestamp
        const tables = [
            "ThreadType",
            "FabricType",
            "Inventory",
            "InventoryTransaction",
            "SalesOrderItem",
            "SalesOrder",
            "FabricProduction",
            "ThreadPurchase",
            "DyeingProcess",
            "Customer",
            "Vendor",
        ];

        let fixedRecords = 0;

        for (const table of tables) {
            console.log(
                `Checking table ${table} for missing updatedAt fields...`,
            );

            try {
                // First check if the table has an updatedAt column
                const columns = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${table} 
          AND column_name = 'updatedAt'
          AND table_schema = 'public';
        `;

                if (columns.length === 0) {
                    console.log(
                        `Table ${table} does not have an updatedAt column. Skipping.`,
                    );
                    continue;
                }

                // Update null updatedAt fields
                const result = await prisma.$executeRawUnsafe(`
          UPDATE "${table}" 
          SET "updatedAt" = CURRENT_TIMESTAMP 
          WHERE "updatedAt" IS NULL
        `);

                console.log(`Fixed ${result} records in ${table}`);
                fixedRecords += result;
            } catch (error) {
                console.error(`Error fixing ${table}:`, error.message);
            }
        }

        console.log(
            `\nFixed a total of ${fixedRecords} records across ${tables.length} tables.`,
        );
        console.log(
            "\nNOTE: This script only fixes the database. You should also update your code to include updatedAt in create operations.",
        );
        console.log(
            "\nTo fix your code, add the following to all Prisma create operations:",
        );
        console.log("data: { ..., updatedAt: new Date() }");
        console.log("\nOr better yet, use the helper function:");
        console.log(
            "import { addRequiredFields } from '@/lib/prisma-helpers';",
        );
        console.log("data: addRequiredFields({ ... })");
    } catch (error) {
        console.error("Error fixing missing updatedAt fields:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the function
fixMissingFields()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
