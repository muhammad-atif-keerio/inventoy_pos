// Script to test Supabase connection with SSL disabled
require("dotenv").config();
const { Client } = require("pg");

console.log("Testing Supabase connection with SSL disabled...");

// Get connection strings from environment
const ledgerDbUrl = process.env.LEDGER_DATABASE_URL;
const ledgerDirectUrl = process.env.LEDGER_DIRECT_URL;
const dbUrl = process.env.DATABASE_URL;

// Check if environment variables are set
if (!ledgerDbUrl) {
    console.error("❌ LEDGER_DATABASE_URL not found in environment");
    console.log(
        "Make sure you have created a .env file with the correct connection string",
    );
    process.exit(1);
}

// Function to parse connection string
function parseConnectionString(connString) {
    try {
        // Parse URL
        const url = new URL(connString);

        // Add sslmode=disable to the URL if not already present
        const searchParams = new URLSearchParams(url.search);
        if (!searchParams.has("sslmode")) {
            searchParams.append("sslmode", "disable");
            url.search = searchParams.toString();
            connString = url.toString();
        } else if (searchParams.get("sslmode") !== "disable") {
            searchParams.set("sslmode", "disable");
            url.search = searchParams.toString();
            connString = url.toString();
        }

        return {
            connectionString: connString,
            user: url.username,
            password: url.password,
            host: url.hostname,
            port: url.port || "6543",
            database: url.pathname.replace(/^\//, ""),
            schema: url.searchParams.get("schema") || "public",
            ssl: false, // Disable SSL
        };
    } catch (err) {
        console.error("Failed to parse connection string:", err);
        return null;
    }
}

// Test connection function
async function testConnection(connString, name) {
    console.log(`\nTesting ${name} connection...`);
    console.log(
        `Connection string: ${connString.replace(/:[^:]*@/, ":****@")}`,
    );

    // Parse connection string
    const config = parseConnectionString(connString);
    if (!config) {
        console.error(`❌ Failed to parse ${name} connection string`);
        return false;
    }

    console.log(
        `Connecting to ${config.host}:${config.port}/${config.database} (schema: ${config.schema})...`,
    );

    // Create client
    const client = new Client({
        connectionString: config.connectionString,
        ssl: false, // Explicitly disable SSL
    });

    try {
        // Connect to database
        await client.connect();
        console.log(`✅ Successfully connected to ${name} database!`);

        // Test a simple query
        const result = await client.query(
            "SELECT current_database() as db, current_schema() as schema",
        );
        console.log(`✅ Query successful!`);
        console.log(
            `Database: ${result.rows[0].db}, Schema: ${result.rows[0].schema}`,
        );

        // If schema is specified, check if it exists
        if (config.schema !== "public") {
            try {
                // Set search path to the schema
                await client.query(`SET search_path TO ${config.schema};`);
                console.log(
                    `✅ Schema ${config.schema} exists and is accessible`,
                );

                // Check for tables
                const { rows } = await client.query(
                    `
          SELECT count(*) FROM information_schema.tables 
          WHERE table_schema = $1;
        `,
                    [config.schema],
                );

                console.log(
                    `Tables in schema ${config.schema}: ${rows[0].count}`,
                );

                if (parseInt(rows[0].count) === 0) {
                    console.log(
                        `\n⚠️ No tables found in schema ${config.schema}`,
                    );
                    console.log(
                        `You need to run the migration to create the tables:`,
                    );
                    console.log(
                        `npx prisma db push --schema=prisma/schema-ledger.prisma`,
                    );
                } else {
                    // List tables
                    const tablesResult = await client.query(
                        `
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = $1
            ORDER BY table_name;
          `,
                        [config.schema],
                    );

                    console.log(
                        `\nFound ${tablesResult.rows.length} tables in schema ${config.schema}:`,
                    );
                    tablesResult.rows.forEach((row) => {
                        console.log(`   - ${row.table_name}`);
                    });
                }
            } catch (error) {
                console.error(
                    `❌ Error accessing schema ${config.schema}:`,
                    error.message,
                );
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error(
            `❌ Failed to connect to ${name} database:`,
            error.message,
        );

        // Provide troubleshooting tips
        console.log("\nPossible issues:");
        console.log("1. Incorrect username or password");
        console.log(
            "2. IP address not in allowlist (check Supabase Dashboard > Settings > Database > Connection Pooling)",
        );
        console.log("3. Database server is down or unreachable");
        console.log("4. Firewall blocking outbound connections on port 6543");
        console.log(
            "5. SSL settings issue - try with sslmode=disable in the connection string",
        );

        return false;
    } finally {
        // Close the connection
        try {
            await client.end();
            console.log(`Connection closed for ${name}`);
        } catch (error) {
            // Ignore errors on disconnect
        }
    }
}

// Main function to test all connections
async function main() {
    let success = true;

    // Test ledger database URL
    if (ledgerDbUrl) {
        const ledgerSuccess = await testConnection(
            ledgerDbUrl,
            "ledger database",
        );
        success = success && ledgerSuccess;
    }

    // Test ledger direct URL
    if (ledgerDirectUrl) {
        const directSuccess = await testConnection(
            ledgerDirectUrl,
            "ledger direct",
        );
        success = success && directSuccess;
    }

    // Test main database URL
    if (dbUrl && dbUrl !== ledgerDbUrl) {
        const dbSuccess = await testConnection(dbUrl, "main database");
        success = success && dbSuccess;
    }

    // Summary
    console.log("\n=== Connection Test Summary ===");
    if (success) {
        console.log("✅ All connections successful!");
        console.log("\nNext steps:");
        console.log(
            "1. Generate Prisma client: npx prisma generate --schema=prisma/schema-ledger.prisma",
        );
        console.log(
            "2. Push schema to database: npx prisma db push --schema=prisma/schema-ledger.prisma",
        );
        console.log("3. Create test data: node create-test-ledger-data.js");
        console.log("4. Restart your application: npm run dev");
    } else {
        console.log(
            "❌ Some connections failed. Please fix the issues before proceeding.",
        );
        console.log("\nTroubleshooting tips:");
        console.log("1. Check your Supabase credentials");
        console.log(
            "2. Make sure sslmode=disable is in your connection strings",
        );
        console.log("3. Verify your IP is allowed in Supabase Dashboard");
    }
}

main().catch((err) => {
    console.error("Uncaught error:", err);
    process.exit(1);
});
