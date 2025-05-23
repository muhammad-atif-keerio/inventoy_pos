// Database connection check script
import { PrismaClient } from "@prisma/client";
import { resolve } from "path";

async function main() {
    console.log("🔍 Checking database connection...");
    console.log("📝 Current environment:", process.env.NODE_ENV);
    console.log("🔗 Prisma is looking for .env file at:", resolve(".env"));

    try {
        // Try to create a Prisma client
        console.log("👉 Creating Prisma client...");
        const prisma = new PrismaClient({
            log: ["query", "info", "warn", "error"],
        });

        // Try a basic query
        console.log("👉 Testing database connection...");
        const result = await prisma.$queryRaw`SELECT current_timestamp;`;
        console.log("✅ Connection successful!", result);

        // List all tables
        console.log("👉 Listing all tables in the database...");
        const tables =
            await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
        console.log("📊 Tables found:", tables);

        // Test specific models
        try {
            console.log("👉 Testing SalesOrder model...");
            const salesOrderCount = await prisma.salesOrder.count();
            console.log(
                `✅ SalesOrder model working (${salesOrderCount} records found)`,
            );
        } catch (modelError) {
            console.error("❌ SalesOrder model error:", modelError.message);
            console.log(
                "💡 This could indicate that the table doesn't exist or there's a schema mismatch",
            );
        }

        // Close the Prisma client
        await prisma.$disconnect();
    } catch (err) {
        console.error("❌ DATABASE CONNECTION ERROR");
        console.error(err);

        // Provide specific guidance based on error
        if (err.message.includes("P1001")) {
            console.log("");
            console.log("💡 DIAGNOSIS: Cannot reach database server");
            console.log("This usually means:");
            console.log("1. Your connection string is incorrect");
            console.log(
                "2. There are network restrictions (IP allowlist, firewall)",
            );
            console.log("3. The database server is down");
            console.log("");
            console.log("🛠️ SOLUTION:");
            console.log("1. Check your .env file for correct DATABASE_URL");
            console.log(
                "2. Go to Supabase Dashboard → Database → Connection Settings",
            );
            console.log(
                '3. Make sure your IP is allowed in "Connection Pooling" settings',
            );
            console.log(
                "4. Try the direct connection string instead of the pooler",
            );
        }

        if (err.message.includes("P1003")) {
            console.log("");
            console.log("💡 DIAGNOSIS: Database schema issues");
            console.log("This usually means:");
            console.log("1. Tables don't exist yet");
            console.log("2. Your Prisma schema doesn't match the database");
            console.log("");
            console.log("🛠️ SOLUTION:");
            console.log("1. Run: npx prisma db push");
            console.log(
                "2. If that doesn't work, try: npx prisma migrate dev --name init",
            );
        }
    }
}

main();
