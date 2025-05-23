// Script to set up the Supabase connection with proper SSL settings
const fs = require("fs");
const path = require("path");

console.log("Setting up Supabase connection with proper SSL settings...");

// Create a proper .env file with SSL disabled
const envContent = `# Ledger database connection settings with SSL disabled
# Updated on ${new Date().toISOString()}

# Connection pooling URL for regular queries (with correct port 6543)
LEDGER_DATABASE_URL="postgresql://postgres.yfxoalablmripacasgct:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=ledger&sslmode=disable"

# Direct connection URL for migrations (using port 5432)
LEDGER_DIRECT_URL="postgresql://postgres.yfxoalablmripacasgct:[YOUR-PASSWORD]@db.yfxoalablmripacasgct.supabase.co:5432/postgres?schema=ledger&sslmode=disable"

# Main database URL
DATABASE_URL="postgresql://postgres.yfxoalablmripacasgct:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=disable"

# Notes:
# 1. Replace [YOUR-PASSWORD] with your actual database password
# 2. Make sure you have the correct project ID (yfxoalablmripacasgct in this example)
# 3. The port for pooler connections should be 6543, not 5432
# 4. Using sslmode=disable to handle SSL certificate issues
`;

// Write the .env file
try {
    fs.writeFileSync(".env", envContent);
    console.log("✅ Created .env file with SSL disabled");
} catch (error) {
    console.error("❌ Failed to create .env file:", error);
}

// Update the ledger-db.ts file to use real database
const dbFilePath = path.join(__dirname, "app", "lib", "ledger-db.ts");

try {
    // Read the file content
    let content = fs.readFileSync(dbFilePath, "utf8");
    console.log("Read ledger-db.ts file successfully");

    // Replace the useMockDataForTesting line to set it to false
    if (content.includes("const useMockDataForTesting = true;")) {
        content = content.replace(
            "const useMockDataForTesting = true;",
            "const useMockDataForTesting = false; // Changed to false to use real database",
        );
        console.log(
            "Changed useMockDataForTesting to false to use real database",
        );
    } else {
        console.log("Could not find useMockDataForTesting variable to modify");
    }

    // Write the file back
    fs.writeFileSync(dbFilePath, content);
    console.log("✅ Updated ledger-db.ts file to use real database");

    // Verify the change
    const newContent = fs.readFileSync(dbFilePath, "utf8");
    if (newContent.includes("const useMockDataForTesting = false;")) {
        console.log("✅ Successfully updated the file to use real database");
    } else {
        console.log("❌ Failed to update the file properly");
    }
} catch (error) {
    console.error("❌ Error updating ledger-db.ts file:", error);
}

console.log("\nNext steps:");
console.log("1. Edit the .env file to add your actual Supabase password");
console.log('2. Run "node test-ledger-connection.js" to test the connection');
console.log(
    '3. Run "npx prisma generate --schema=prisma/schema-ledger.prisma" to generate the Prisma client',
);
console.log(
    '4. Run "npx prisma db push --schema=prisma/schema-ledger.prisma" to create/update the database schema',
);
console.log('5. Run "node create-test-ledger-data.js" to create test data');
console.log('6. Restart your Next.js application with "npm run dev"');
