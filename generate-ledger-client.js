// Script to generate the Prisma client for the ledger schema
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Generating Prisma client for ledger schema...");

// Check if the .env file exists
if (!fs.existsSync(".env")) {
    console.log("No .env file found. Creating a sample .env file...");

    // Create a sample .env file with the ledger database variables
    const envContent = `# This is a sample .env file. Replace the values with your actual database credentials.
# DATABASE CONNECTION
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"

# LEDGER DATABASE CONNECTION
# In development, we'll use the main database with a different schema
LEDGER_DATABASE_URL="\${DATABASE_URL}&schema=ledger"
LEDGER_DIRECT_URL="\${DIRECT_URL}&schema=ledger"

# For development, we fall back to mock data if these are not set
`;

    fs.writeFileSync(".env", envContent);
    console.log(
        "Sample .env file created. Please edit it with your actual database credentials.",
    );
}

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

try {
    // Generate the Prisma client specifically for the ledger schema
    console.log("Generating Prisma client from schema-ledger.prisma...");
    execSync("npx prisma generate --schema=prisma/schema-ledger.prisma", {
        stdio: "inherit",
    });
    console.log("Ledger Prisma client generated successfully!");

    // Check if the client was generated
    const clientPath = path.join(targetDir, "index.js");
    if (fs.existsSync(clientPath)) {
        console.log(`Ledger client generated at: ${clientPath}`);
    } else {
        console.error(`Failed to find generated client at: ${clientPath}`);
        process.exit(1);
    }
} catch (error) {
    console.error("Failed to generate Prisma client:", error.message);
    process.exit(1);
}

console.log("✅ Ledger client setup completed successfully.");
