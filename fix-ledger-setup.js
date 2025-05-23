// Script to check and fix ledger database setup issues
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Starting ledger system setup and fix...");

// Check if .env file exists
function setupEnvFile() {
    try {
        console.log("Checking for .env file...");

        if (!fs.existsSync(".env")) {
            console.log(
                "No .env file found. Creating from .env.bak if available...",
            );

            if (fs.existsSync(".env.bak")) {
                fs.copyFileSync(".env.bak", ".env");
                console.log(".env file created from backup");
            } else {
                // Create minimal .env file
                const envContent = `# DATABASE CONNECTION
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:password@localhost:5432/postgres"

# LEDGER DATABASE CONNECTION
LEDGER_DATABASE_URL="\${DATABASE_URL}&schema=ledger"
LEDGER_DIRECT_URL="\${DIRECT_URL}&schema=ledger"
`;
                fs.writeFileSync(".env", envContent);
                console.log("Created new .env file with default values");
            }
        }

        // Ensure ledger variables are in the .env file
        let envContent = fs.readFileSync(".env", "utf8");
        if (!envContent.includes("LEDGER_DATABASE_URL")) {
            console.log("Adding ledger database variables to .env file");
            envContent += `\n# LEDGER DATABASE CONNECTION
LEDGER_DATABASE_URL="\${DATABASE_URL}&schema=ledger"
LEDGER_DIRECT_URL="\${DIRECT_URL}&schema=ledger"\n`;
            fs.writeFileSync(".env", envContent);
        }

        console.log("✅ .env file is set up correctly");
        return true;
    } catch (error) {
        console.error("Error setting up .env file:", error.message);
        return false;
    }
}

// Generate the Prisma client for the ledger schema
function generateLedgerClient() {
    try {
        console.log("Generating Prisma client for ledger schema...");

        // Ensure the target directory exists
        const targetDir = path.join(
            __dirname,
            "node_modules",
            "@prisma",
            "ledger-client",
        );
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`Created directory: ${targetDir}`);
        }

        // Generate the client
        execSync("npx prisma generate --schema=prisma/schema-ledger.prisma", {
            stdio: "inherit",
        });

        // Check if the client was generated
        const clientPath = path.join(targetDir, "index.js");
        if (fs.existsSync(clientPath)) {
            console.log(
                `✅ Ledger client generated successfully at: ${clientPath}`,
            );
            return true;
        } else {
            console.error(
                `❌ Failed to find generated client at: ${clientPath}`,
            );
            return false;
        }
    } catch (error) {
        console.error("Error generating Prisma client:", error.message);
        return false;
    }
}

// Push the schema to create database tables
function pushLedgerSchema() {
    try {
        console.log("Pushing ledger schema to database...");
        execSync(
            "npx prisma db push --schema=prisma/schema-ledger.prisma --accept-data-loss",
            {
                stdio: "inherit",
            },
        );
        console.log("✅ Ledger schema pushed successfully");
        return true;
    } catch (error) {
        console.error("Error pushing ledger schema:", error.message);
        console.log(
            "Will continue anyway as mock data will be used in development",
        );
        return false;
    }
}

// Main execution flow
async function main() {
    console.log("🛠️ Running ledger system setup and fixes...");

    // Step 1: Set up environment variables
    const envSuccess = setupEnvFile();

    // Step 2: Generate the Prisma client
    const clientSuccess = generateLedgerClient();

    // Step 3: Push the schema (if client was generated)
    let schemaSuccess = false;
    if (clientSuccess) {
        schemaSuccess = pushLedgerSchema();
    }

    console.log("\n📋 Summary:");
    console.log(
        `- Environment Setup: ${envSuccess ? "✅ Success" : "❌ Failed"}`,
    );
    console.log(
        `- Prisma Client Generation: ${clientSuccess ? "✅ Success" : "❌ Failed"}`,
    );
    console.log(
        `- Schema Push: ${schemaSuccess ? "✅ Success" : clientSuccess ? "❌ Failed" : "⚠️ Skipped"}`,
    );

    if (envSuccess && clientSuccess) {
        console.log("\n✅✅✅ Ledger system setup completed successfully!");
        if (!schemaSuccess) {
            console.log(
                "⚠️ Note: Schema push failed, but the system will use mock data in development mode.",
            );
        }
    } else {
        console.log("\n⚠️ There were some issues with the ledger setup.");
        console.log(
            "The system will fall back to using mock data in development mode.",
        );
    }

    console.log("\n📌 Next steps:");
    console.log("1. Restart your Next.js development server");
    console.log("2. Visit the /ledger route in your application");
}

main().catch((error) => {
    console.error("Uncaught error:", error);
    process.exit(1);
});
