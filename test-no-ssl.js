// Simple test script with SSL completely disabled
require("dotenv").config();
const { Client } = require("pg");

console.log("📊 Testing database connection with SSL disabled...");

async function testConnection() {
    // Get connection strings from environment
    const dbUrl = process.env.DATABASE_URL;
    const ledgerDbUrl = process.env.LEDGER_DATABASE_URL;

    if (!dbUrl) {
        console.error("❌ DATABASE_URL not found in environment");
        return;
    }

    try {
        console.log("Attempting connection with SSL DISABLED");
        console.log(`Connection string: ${dbUrl.replace(/:[^:]*@/, ":****@")}`);

        // Parse the connection string
        const url = new URL(dbUrl);

        // Create connection config with SSL disabled
        const config = {
            user: url.username,
            password: url.password,
            host: url.hostname,
            port: url.port || "6543",
            database: url.pathname.replace(/^\//, ""),
            ssl: false, // Completely disable SSL
        };

        console.log(
            `Connecting to ${config.host}:${config.port}/${config.database}...`,
        );

        // Create client and connect
        const client = new Client(config);
        await client.connect();
        console.log("✅ Connected successfully!");

        // Test a simple query
        const result = await client.query(
            "SELECT current_database() as db, current_schema() as schema",
        );
        console.log(`✅ Query successful!`);
        console.log(
            `Database: ${result.rows[0].db}, Schema: ${result.rows[0].schema}`,
        );

        // If we have a ledger database URL, check that too
        if (ledgerDbUrl) {
            console.log("\nTesting ledger database connection...");
            await testLedgerConnection(ledgerDbUrl);
        }

        // Close the connection
        await client.end();
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
    }
}

async function testLedgerConnection(connectionString) {
    try {
        console.log(
            `Connection string: ${connectionString.replace(/:[^:]*@/, ":****@")}`,
        );

        // Parse the connection string
        const url = new URL(connectionString);

        // Create connection config with SSL disabled
        const config = {
            user: url.username,
            password: url.password,
            host: url.hostname,
            port: url.port || "6543",
            database: url.pathname.replace(/^\//, ""),
            ssl: false, // Completely disable SSL
        };

        console.log(
            `Connecting to ledger database at ${config.host}:${config.port}/${config.database}...`,
        );

        // Create client and connect
        const client = new Client(config);
        await client.connect();
        console.log("✅ Ledger database connected successfully!");

        // Check if schema exists
        if (url.searchParams.has("schema")) {
            const schema = url.searchParams.get("schema");

            // Set search path to the schema
            await client.query(`SET search_path TO ${schema};`);
            console.log(`✅ Schema ${schema} exists and is accessible`);

            // Check for tables
            const { rows } = await client.query(
                `
        SELECT count(*) FROM information_schema.tables 
        WHERE table_schema = $1;
      `,
                [schema],
            );

            console.log(`Tables in schema ${schema}: ${rows[0].count}`);
        }

        // Close the connection
        await client.end();
    } catch (error) {
        console.error("❌ Ledger connection failed:", error.message);
    }
}

// Run the test
testConnection().catch((err) => {
    console.error("Uncaught error:", err);
    process.exit(1);
});
