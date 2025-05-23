// Test script with alternative connection methods for Supabase
require("dotenv").config();
const { Client } = require("pg");

console.log("🔄 Testing alternative connection methods for Supabase...");

async function testConnection() {
    // Try various connection configurations

    // Get credentials from the environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("❌ DATABASE_URL not found in environment");
        return;
    }

    // Parse the connection string to get credentials
    const url = new URL(dbUrl);
    const username = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || "6543";
    const database = url.pathname.replace(/^\//, "");

    console.log(`Base connection details:`);
    console.log(`- Host: ${host}`);
    console.log(`- Port: ${port}`);
    console.log(`- Database: ${database}`);
    console.log(`- Username: ${username}`);

    // Try connection with direct credentials (no URL)
    await tryConnection(
        {
            user: username,
            password: password,
            host: host,
            port: port,
            database: database,
            ssl: false,
        },
        "No SSL",
    );

    // Try with SSL required
    await tryConnection(
        {
            user: username,
            password: password,
            host: host,
            port: port,
            database: database,
            ssl: {
                rejectUnauthorized: false,
            },
        },
        "SSL with rejectUnauthorized: false",
    );

    // Try connecting to direct URL (not connection pool)
    if (process.env.DIRECT_URL) {
        const directUrl = new URL(process.env.DIRECT_URL);
        await tryConnection(
            {
                user: directUrl.username,
                password: directUrl.password,
                host: directUrl.hostname,
                port: directUrl.port || "5432",
                database: directUrl.pathname.replace(/^\//, ""),
                ssl: {
                    rejectUnauthorized: false,
                },
            },
            "Direct connection (not pooled)",
        );
    }

    // Try using string connection
    await tryConnectionString(
        `postgresql://${username}:${password}@${host}:${port}/${database}?sslmode=disable`,
        "Connection string with sslmode=disable",
    );

    // Try direct connection to ledger schema
    if (process.env.LEDGER_DIRECT_URL) {
        await tryConnectionString(
            process.env.LEDGER_DIRECT_URL,
            "Ledger direct URL",
        );
    }
}

async function tryConnection(config, label) {
    console.log(`\n🔄 Testing: ${label}`);

    try {
        // Create client with this config
        const client = new Client(config);

        // Set a short timeout
        const connectPromise = client.connect();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 5000),
        );

        // Connect with timeout
        await Promise.race([connectPromise, timeoutPromise]);

        console.log("✅ Connected successfully!");

        // Try a simple query
        const result = await client.query(
            "SELECT current_database() as db, current_schema() as schema",
        );
        console.log(
            `✅ Query successful: Database=${result.rows[0].db}, Schema=${result.rows[0].schema}`,
        );

        await client.end();
        return true;
    } catch (error) {
        console.error(`❌ Connection failed:`, error.message);
        return false;
    }
}

async function tryConnectionString(connectionString, label) {
    console.log(`\n🔄 Testing: ${label}`);
    console.log(
        `Connection string: ${connectionString.replace(/:[^:]*@/, ":****@")}`,
    );

    try {
        // Create client with connection string
        const client = new Client({ connectionString });

        // Set a short timeout
        const connectPromise = client.connect();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 5000),
        );

        // Connect with timeout
        await Promise.race([connectPromise, timeoutPromise]);

        console.log("✅ Connected successfully!");

        // Try a simple query
        const result = await client.query(
            "SELECT current_database() as db, current_schema() as schema",
        );
        console.log(
            `✅ Query successful: Database=${result.rows[0].db}, Schema=${result.rows[0].schema}`,
        );

        await client.end();
        return true;
    } catch (error) {
        console.error(`❌ Connection failed:`, error.message);
        return false;
    }
}

// Run the test
testConnection().catch((err) => {
    console.error("Uncaught error:", err);
});
