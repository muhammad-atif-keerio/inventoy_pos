// Script to set up the ledger database in Supabase
const { execSync } = require("child_process");
const fs = require("fs");

console.log("🔄 Setting up the ledger database in Supabase...");

// Check if the .env file exists
if (!fs.existsSync(".env")) {
    console.error(
        "❌ No .env file found. Please create an .env file with your database credentials first.",
    );
    process.exit(1);
}

try {
    // Step 1: Generate the ledger Prisma client
    console.log("📝 Generating ledger-specific Prisma client...");
    execSync("node generate-ledger-client.js", { stdio: "inherit" });

    // Step 2: Push the ledger schema to the database
    console.log("🚀 Pushing the ledger schema to the database...");
    execSync("npx prisma db push --schema=prisma/schema-ledger.prisma", {
        stdio: "inherit",
    });

    // Step 3: Verify the schema was pushed correctly
    console.log("✅ Checking ledger schema...");
    execSync(
        "npx prisma db pull --schema=prisma/schema-ledger.prisma --print",
        { stdio: "inherit" },
    );

    console.log("✨ Ledger database setup complete!");
    console.log("");
    console.log(
        "You can now run the application and use the ledger functionality:",
    );
    console.log("npm run dev");
} catch (error) {
    console.error("❌ Failed to set up ledger database:", error.message);
    process.exit(1);
}
