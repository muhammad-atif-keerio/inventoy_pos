// Script to set up the .env file from .env-ledger-fix
const fs = require("fs");

console.log("Setting up .env file from .env-ledger-fix...");

try {
    // Read the .env-ledger-fix file
    const fixEnvContent = fs.readFileSync(".env-ledger-fix", "utf8");

    // Extract the connection strings
    const ledgerDbUrlMatch = fixEnvContent.match(
        /LEDGER_DATABASE_URL="([^"]+)"/,
    );
    const ledgerDirectUrlMatch = fixEnvContent.match(
        /LEDGER_DIRECT_URL="([^"]+)"/,
    );

    if (!ledgerDbUrlMatch || !ledgerDirectUrlMatch) {
        console.error("Could not find connection strings in .env-ledger-fix");
        process.exit(1);
    }

    // Add sslmode=disable to the connection strings
    let ledgerDbUrl = ledgerDbUrlMatch[1];
    let ledgerDirectUrl = ledgerDirectUrlMatch[1];

    if (!ledgerDbUrl.includes("sslmode=")) {
        ledgerDbUrl += "&sslmode=disable";
    } else {
        ledgerDbUrl = ledgerDbUrl.replace(/sslmode=[^&]+/, "sslmode=disable");
    }

    if (!ledgerDirectUrl.includes("sslmode=")) {
        ledgerDirectUrl += "&sslmode=disable";
    } else {
        ledgerDirectUrl = ledgerDirectUrl.replace(
            /sslmode=[^&]+/,
            "sslmode=disable",
        );
    }

    // Create the main database URL from the ledger URL
    const mainDbUrl = ledgerDbUrl.replace(/&schema=ledger/, "");

    // Create the .env file content
    const envContent = `# Ledger database connection settings
# Updated configuration with SSL disabled

# Connection pooling URL for regular queries (with correct port 6543)
LEDGER_DATABASE_URL="${ledgerDbUrl}"

# Direct connection URL for migrations (using port 5432)
LEDGER_DIRECT_URL="${ledgerDirectUrl}"

# Main database URL (for other app features)
DATABASE_URL="${mainDbUrl}"
`;

    // Write the .env file
    fs.writeFileSync(".env", envContent);
    console.log(".env file created successfully with sslmode=disable");
} catch (error) {
    console.error("Error setting up .env file:", error);
    process.exit(1);
}
