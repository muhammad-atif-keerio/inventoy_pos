// Script to check if Supabase connection is working
// This checks the values from your .env file
require("dotenv").config();
const { Client } = require("pg");

async function checkConnection() {
    console.log("🔍 Checking database connections...");

    // Check main database connection
    console.log("\n📊 MAIN DATABASE:");
    const mainDbUrl = process.env.DATABASE_URL;
    if (!mainDbUrl) {
        console.error("❌ DATABASE_URL not found in environment");
    } else {
        console.log("✓ DATABASE_URL found in environment");
        try {
            await testConnection(mainDbUrl, "main");
        } catch (error) {
            console.error("❌ Error testing main database:", error.message);
        }
    }

    // Check ledger database connection
    console.log("\n📒 LEDGER DATABASE:");
    const ledgerDbUrl = process.env.LEDGER_DATABASE_URL;
    if (!ledgerDbUrl) {
        console.error("❌ LEDGER_DATABASE_URL not found in environment");
    } else {
        console.log("✓ LEDGER_DATABASE_URL found in environment");
        try {
            await testConnection(ledgerDbUrl, "ledger");
        } catch (error) {
            console.error("❌ Error testing ledger database:", error.message);
        }
    }

    console.log("\n🔍 Check complete!");
}

async function testConnection(connectionString, label) {
    // Convert connection string to object and hide password
    console.log(
        `Connection string (${label}): ${connectionString.replace(/:[^:]*@/, ":****@")}`,
    );

    try {
        // Parse the connection string
        const url = new URL(connectionString);
        const config = {
            user: url.username,
            password: url.password,
            host: url.hostname,
            port: url.port || "6543",
            database: url.pathname.replace(/^\//, ""),
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000,
        };

        console.log(
            `Connecting to ${config.host}:${config.port}/${config.database}...`,
        );

        // Create client
        const client = new Client(config);
        await client.connect();
        console.log("✅ Connected successfully!");

        // Run basic query
        const result = await client.query(
            "SELECT current_database() as db, current_schema() as schema",
        );
        console.log(
            `✅ Query success - Database: ${result.rows[0].db}, Schema: ${result.rows[0].schema}`,
        );

        // Check if ledger schema exists and correct table
        if (url.searchParams.has("schema")) {
            const schema = url.searchParams.get("schema");
            console.log(`Checking schema: ${schema}`);

            try {
                await client.query(`SET search_path TO ${schema}`);
                console.log(`✅ Schema ${schema} exists`);

                // Check for tables
                const tables = await client.query(
                    `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1
        `,
                    [schema],
                );

                if (tables.rows.length === 0) {
                    console.log(`⚠️ No tables found in schema ${schema}`);
                    console.log(
                        "You need to run: npx prisma db push --schema=prisma/schema-ledger.prisma",
                    );
                } else {
                    console.log(
                        `✅ Found ${tables.rows.length} tables in schema ${schema}`,
                    );
                    tables.rows.slice(0, 5).forEach((row) => {
                        console.log(`   - ${row.table_name}`);
                    });
                    if (tables.rows.length > 5) {
                        console.log(
                            `   - ... and ${tables.rows.length - 5} more`,
                        );
                    }
                }
            } catch (error) {
                console.error(`❌ Error with schema ${schema}:`, error.message);
            }
        }

        await client.end();
        return true;
    } catch (error) {
        console.error(`❌ Connection failed:`, error.message);

        // More detailed error handling
        if (error.message.includes("no pg_hba.conf entry")) {
            console.log(
                "⚠️ Your IP address is not in the allowlist. Add it in Supabase Dashboard > Settings > Database",
            );
        } else if (error.message.includes("password authentication failed")) {
            console.log("⚠️ Incorrect password in connection string");
        } else if (error.message.includes("connect ETIMEDOUT")) {
            console.log(
                "⚠️ Connection timed out. Check firewall settings and network connectivity",
            );
        } else if (error.message.includes("self signed certificate")) {
            console.log(
                "⚠️ SSL certificate issue. Try adding ?sslmode=require to your connection string",
            );
        }

        throw error;
    }
}

checkConnection().catch((err) => {
    console.error("Uncaught error:", err);
    process.exit(1);
});
