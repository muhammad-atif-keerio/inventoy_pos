// Simple script to test ledger database connection
require("dotenv").config();
const { Client } = require("pg");

console.log("Testing ledger database connection...");

// Extract database credentials from connection string
function parseConnectionString(connString) {
    try {
        // Simple parsing, assumes standard connection string format
        const url = new URL(connString);
        const userPass =
            url.username + (url.password ? `:${url.password}` : "");
        const host = url.hostname;
        const port = url.port || "6543"; // Changed to 6543 for Supabase pooler
        const database = url.pathname.replace(/^\//, "");

        // Extract schema from query params if present
        const searchParams = url.searchParams;
        const schema = searchParams.get("schema") || "public";

        return {
            user: url.username,
            password: url.password,
            host,
            port,
            database,
            schema,
            ssl: {
                rejectUnauthorized: false, // This allows self-signed or invalid certificates
            },
        };
    } catch (err) {
        console.error("Failed to parse connection string:", err.message);
        return null;
    }
}

async function testConnection() {
    // Get connection string from environment variables
    const connString =
        process.env.LEDGER_DATABASE_URL || process.env.DATABASE_URL;

    if (!connString) {
        console.error("❌ No connection string found in .env file");
        console.log(
            "Please make sure LEDGER_DATABASE_URL or DATABASE_URL is set in your .env file",
        );
        return;
    }

    console.log("Connection string found in environment variables");
    console.log("Connection string:", connString.replace(/:[^:]*@/, ":****@")); // Hide password

    // Parse connection string
    const config = parseConnectionString(connString);
    if (!config) {
        console.error("❌ Failed to parse connection string");
        return;
    }

    console.log(
        `Attempting to connect to: ${config.host}:${config.port}/${config.database} (schema: ${config.schema})`,
    );

    // Create client with timeout
    const client = new Client({
        ...config,
        connectionTimeoutMillis: 10000, // 10 second timeout
    });

    try {
        console.log("Connecting to database...");
        await client.connect();
        console.log("✅ Successfully connected to database!");

        // Try to query the database
        console.log("Running test query...");
        const result = await client.query(
            "SELECT current_database() as db, current_schema() as schema",
        );
        console.log("✅ Query successful!");
        console.log("Connected to database:", result.rows[0].db);
        console.log("Using schema:", result.rows[0].schema);

        // Try to set the schema
        if (config.schema !== "public") {
            try {
                await client.query(`SET search_path TO ${config.schema};`);
                console.log(`✅ Schema set to ${config.schema}`);

                // Check if tables exist
                const tableResult = await client.query(
                    `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1
          ORDER BY table_name;
        `,
                    [config.schema],
                );

                if (tableResult.rows.length === 0) {
                    console.log(
                        `❌ No tables found in schema ${config.schema}`,
                    );
                    console.log(
                        `You need to run the migration to create the tables first:`,
                    );
                    console.log(
                        `npx prisma db push --schema=prisma/schema-ledger.prisma`,
                    );
                } else {
                    console.log(
                        `✅ Found ${tableResult.rows.length} tables in schema ${config.schema}:`,
                    );
                    tableResult.rows.forEach((row) => {
                        console.log(`   - ${row.table_name}`);
                    });

                    // Check if there's data in tables
                    try {
                        const dataResult = await client.query(`
              SELECT 'khata' as table_name, COUNT(*) as count FROM ${config.schema}.khata
              UNION ALL
              SELECT 'bill' as table_name, COUNT(*) as count FROM ${config.schema}.bill
              UNION ALL 
              SELECT 'transaction' as table_name, COUNT(*) as count FROM ${config.schema}.transaction
              UNION ALL
              SELECT 'party' as table_name, COUNT(*) as count FROM ${config.schema}.party;
            `);

                        console.log("\nTable data counts:");
                        let hasData = false;
                        dataResult.rows.forEach((row) => {
                            console.log(
                                `   - ${row.table_name}: ${row.count} rows`,
                            );
                            if (parseInt(row.count) > 0) hasData = true;
                        });

                        if (!hasData) {
                            console.log(
                                "\n❗ No data found in main tables. Try creating some test data.",
                            );
                        }
                    } catch (error) {
                        console.error(
                            "Error checking table data:",
                            error.message,
                        );
                    }
                }
            } catch (error) {
                console.error(
                    `❌ Failed to set schema to ${config.schema}:`,
                    error.message,
                );
            }
        }
    } catch (error) {
        console.error("❌ Failed to connect to database:", error.message);
        console.log("\nPossible issues:");
        console.log("1. Incorrect username or password");
        console.log(
            "2. IP address not in allowlist (check Supabase Dashboard > Settings > Database > Connection Pooling)",
        );
        console.log("3. Database server is down or unreachable");
        console.log("4. Firewall blocking outbound connections on port 6543"); // Changed to 6543

        // Special handling for common errors
        if (error.message.includes("self signed certificate")) {
            console.log("\nSSL certificate issue detected:");
            console.log(
                "- For development, we've set rejectUnauthorized: false but it's still failing",
            );
            console.log(
                "- Try adding ?sslmode=require to your connection string",
            );
            console.log(
                "- Or check if your Supabase SSL certificate is properly set up",
            );
        } else if (
            error.message.includes("connection refused") ||
            error.message.includes("connect ETIMEDOUT")
        ) {
            console.log("\nConnection issue detected:");
            console.log("- Check your VPN connection status");
            console.log("- Verify that the hostname is correct");
            console.log(
                "- Make sure your IP address is in Supabase's allowlist",
            );
        }
    } finally {
        // Close the connection
        try {
            await client.end();
            console.log("Connection closed");
        } catch (error) {
            // Ignore errors on disconnect
        }
    }
}

testConnection().catch((err) => {
    console.error("Uncaught error:", err);
    process.exit(1);
});
