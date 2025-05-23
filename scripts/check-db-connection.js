// @ts-check
const { PrismaClient } = require("@prisma/client");

/**
 * Script to check database connectivity
 * Run with: node scripts/check-db-connection.js
 */
async function checkDatabaseConnection() {
    console.log("Checking database connection...");

    const prisma = new PrismaClient({
        log: ["query", "info", "warn", "error"],
    });

    try {
        // Try to execute a simple query
        console.log("Attempting to connect to the database...");
        const result = await prisma.$queryRaw`SELECT 1 as "connection_test"`;
        console.log("Database connection successful!", result);

        // Get database version info
        const versionInfo = await prisma.$queryRaw`SELECT version()`;
        console.log("Database version:", versionInfo);

        // Check connection pool status if using PostgreSQL
        const poolStats = await prisma.$queryRaw`
      SELECT state, count(*) as count
      FROM pg_stat_activity
      GROUP BY state
    `;
        console.log("Connection pool statistics:", poolStats);

        return true;
    } catch (error) {
        console.error("Database connection failed:", error);
        return false;
    } finally {
        await prisma.$disconnect();
        console.log("Connection check complete.");
    }
}

// Run the check if this file is executed directly
if (require.main === module) {
    checkDatabaseConnection()
        .then((isConnected) => {
            if (!isConnected) {
                console.error("ERROR: Database connection check failed");
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error("Error running connection check:", error);
            process.exit(1);
        });
}

module.exports = { checkDatabaseConnection };
