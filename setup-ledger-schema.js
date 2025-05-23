// Script to generate the Prisma client and push the schema to the database
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Setting up ledger schema and generating Prisma client...");

// Check if .env file exists
function checkEnvFile() {
    if (!fs.existsSync(".env")) {
        console.error("❌ .env file not found");
        console.log(
            "Please run setup-supabase-connection.js first to create the .env file",
        );
        return false;
    }

    // Check if the environment variables are set
    const envContent = fs.readFileSync(".env", "utf8");
    if (!envContent.includes("LEDGER_DATABASE_URL=")) {
        console.error("❌ LEDGER_DATABASE_URL not found in .env file");
        console.log(
            "Please run setup-supabase-connection.js first to create the .env file",
        );
        return false;
    }

    // Check if the password has been updated
    if (envContent.includes("[YOUR-PASSWORD]")) {
        console.error("❌ Database password not set in .env file");
        console.log(
            "Please edit the .env file and replace [YOUR-PASSWORD] with your actual Supabase password",
        );
        return false;
    }

    return true;
}

// Generate the Prisma client
function generatePrismaClient() {
    try {
        console.log("\nGenerating Prisma client...");
        execSync("npx prisma generate --schema=prisma/schema-ledger.prisma", {
            stdio: "inherit",
        });
        console.log("✅ Prisma client generated successfully");
        return true;
    } catch (error) {
        console.error("❌ Failed to generate Prisma client:", error.message);
        return false;
    }
}

// Push the schema to the database
function pushSchema() {
    try {
        console.log("\nPushing schema to database...");
        execSync("npx prisma db push --schema=prisma/schema-ledger.prisma", {
            stdio: "inherit",
        });
        console.log("✅ Schema pushed to database successfully");
        return true;
    } catch (error) {
        console.error("❌ Failed to push schema to database:", error.message);
        return false;
    }
}

// Update the ledger-db.ts file to use real database
function updateLedgerDbFile() {
    const dbFilePath = path.join(__dirname, "app", "lib", "ledger-db.ts");

    try {
        // Read the file content
        let content = fs.readFileSync(dbFilePath, "utf8");
        console.log("\nUpdating ledger-db.ts file...");

        // Replace the useMockDataForTesting line to set it to false
        if (content.includes("const useMockDataForTesting = true;")) {
            content = content.replace(
                "const useMockDataForTesting = true;",
                "const useMockDataForTesting = false; // Changed to false to use real database",
            );
            console.log(
                "Changed useMockDataForTesting to false to use real database",
            );
        } else if (content.includes("const useMockDataForTesting = false;")) {
            console.log("useMockDataForTesting is already set to false");
        } else {
            console.log(
                "Could not find useMockDataForTesting variable to modify",
            );
        }

        // Write the file back
        fs.writeFileSync(dbFilePath, content);
        console.log("✅ Updated ledger-db.ts file");
        return true;
    } catch (error) {
        console.error("❌ Error updating ledger-db.ts file:", error.message);
        return false;
    }
}

// Main function
function main() {
    console.log("=== Ledger Schema Setup ===");

    // Check if .env file exists and is properly configured
    if (!checkEnvFile()) {
        return;
    }

    // Generate the Prisma client
    const clientGenerated = generatePrismaClient();

    // Push the schema to the database
    const schemaPushed = pushSchema();

    // Update the ledger-db.ts file
    const fileUpdated = updateLedgerDbFile();

    // Print summary
    console.log("\n=== Setup Summary ===");
    console.log(
        `Prisma Client Generation: ${clientGenerated ? "✅ Success" : "❌ Failed"}`,
    );
    console.log(`Schema Push: ${schemaPushed ? "✅ Success" : "❌ Failed"}`);
    console.log(
        `Ledger DB File Update: ${fileUpdated ? "✅ Success" : "❌ Failed"}`,
    );

    if (clientGenerated && schemaPushed && fileUpdated) {
        console.log("\n✅ Ledger schema setup completed successfully!");
        console.log("\nNext steps:");
        console.log("1. Create test data: node create-test-ledger-data.js");
        console.log("2. Restart your application: npm run dev");
    } else {
        console.log(
            "\n❌ Ledger schema setup completed with errors. Please fix the issues before proceeding.",
        );
    }
}

main();
