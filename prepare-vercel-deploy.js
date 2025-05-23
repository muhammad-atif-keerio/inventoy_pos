// Script to verify database connection and prepare for Vercel deployment
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { resolve } from "path";

async function main() {
    console.log("🚀 Preparing for Vercel deployment...");

    // Check for .env file
    const envExists = fs.existsSync(".env");
    if (!envExists) {
        console.log(
            "⚠️ No .env file found. Make sure to set environment variables in Vercel dashboard.",
        );
    } else {
        console.log("✅ .env file found.");
    }

    // Check database connection
    console.log("🔍 Checking database connection...");

    try {
        const prisma = new PrismaClient({
            log: ["error"],
        });

        // Try a basic query
        const result = await prisma.$queryRaw`SELECT current_timestamp;`;
        console.log("✅ Database connection successful!", result);

        // Check for required tables
        console.log("👉 Checking database schema...");
        const tables =
            await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;

        const requiredTables = [
            "Customer",
            "Vendor",
            "Inventory",
            "SalesOrder",
            "ThreadPurchase",
            "FabricProduction",
        ];

        const tableNames = tables.map((t) => t.table_name);

        const missingTables = requiredTables.filter(
            (table) => !tableNames.includes(table.toLowerCase()),
        );

        if (missingTables.length > 0) {
            console.log("⚠️ Some tables are missing from the database:");
            missingTables.forEach((table) => console.log(`   - ${table}`));
            console.log(
                "👉 Running prisma db push to create missing tables...",
            );

            try {
                const { execSync } = require("child_process");
                execSync("npx prisma db push", { stdio: "inherit" });
                console.log("✅ Database schema updated.");
            } catch (pushError) {
                console.error(
                    "❌ Failed to update database schema:",
                    pushError.message,
                );
            }
        } else {
            console.log("✅ All required tables exist in the database.");
        }

        // Close the Prisma client
        await prisma.$disconnect();
    } catch (err) {
        console.error("❌ DATABASE CONNECTION ERROR");
        console.error(err);

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
        } else if (err.message.includes("P1003")) {
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

        process.exit(1);
    }

    // Verify Prisma Client can be generated
    try {
        console.log("👉 Testing Prisma Client generation...");
        const { execSync } = require("child_process");
        execSync("npx prisma generate", { stdio: "inherit" });
        console.log("✅ Prisma Client generated successfully.");
    } catch (genError) {
        console.error("❌ Failed to generate Prisma Client:", genError.message);
        process.exit(1);
    }

    console.log("");
    console.log(
        "✅ All checks passed. Your application is ready for Vercel deployment.",
    );
    console.log("");
    console.log("📋 Deployment checklist:");
    console.log("1. Commit all your changes to your repository");
    console.log("2. Push your changes to GitHub/GitLab/Bitbucket");
    console.log("3. Import your project in the Vercel dashboard");
    console.log("4. Set up environment variables in the Vercel dashboard");
    console.log("5. Deploy your application");
    console.log("");
    console.log("🎉 Good luck with your deployment!");
}

main();
