// Script to update ledger-db.ts file to use schema properly
const fs = require("fs");
const path = require("path");

console.log("🔧 Updating ledger-db.ts file...");

try {
    // Path to ledger-db.ts file
    const ledgerDbPath = path.join(__dirname, "app", "lib", "ledger-db.ts");

    if (!fs.existsSync(ledgerDbPath)) {
        console.error(`❌ File not found: ${ledgerDbPath}`);
        process.exit(1);
    }

    // Read the file
    let content = fs.readFileSync(ledgerDbPath, "utf8");

    // Update the content to use schema parameter correctly

    // 1. Ensure URL parsing properly handles schema parameter
    const schemaParsingFix = `
    // Extract schema from query params if present
    const searchParams = url.searchParams;
    const schema = searchParams.get("schema") || "public";

    return {
      user: url.username,
      password: url.password,
      host,
      port,
      database,
      schema, // Added schema parameter
      ssl: {
        rejectUnauthorized: false, // This allows self-signed or invalid certificates
      },
    };`;

    // Replace the URL parsing section
    content = content.replace(
        /const searchParams = url\.searchParams;.*?rejectUnauthorized: false,.*?\s+\},/s,
        schemaParsingFix,
    );

    // 2. Update Prisma client initialization to use schema
    const prismaInitFix = `
            const prismaClient = new PrismaClient({
                log: ["error", "warn"],
                datasources: {
                    db: {
                        url: ledgerDbUrl
                    }
                }
            });`;

    content = content.replace(
        /const prismaClient = new PrismaClient\(\{.*?datasources:.*?\{.*?db:.*?\{.*?url: ledgerDbUrl.*?\}.*?\}.*?\}\);/s,
        prismaInitFix,
    );

    // Write the updated content back to the file
    fs.writeFileSync(ledgerDbPath, content);
    console.log("✅ Successfully updated ledger-db.ts file");

    // Create a backup just in case
    fs.copyFileSync(ledgerDbPath, `${ledgerDbPath}.backup`);
    console.log(`✅ Created backup at ${ledgerDbPath}.backup`);
} catch (error) {
    console.error("❌ Error updating ledger-db.ts:", error.message);
}
