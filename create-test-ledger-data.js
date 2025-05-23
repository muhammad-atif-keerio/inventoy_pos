// Script to create test data in the ledger database
require("dotenv").config();
const { Client } = require("pg");

// Extract database credentials from connection string
function parseConnectionString(connString) {
    try {
        const url = new URL(connString);

        // Add sslmode=disable to the URL if not already present
        const searchParams = new URLSearchParams(url.search);
        if (!searchParams.has("sslmode")) {
            searchParams.append("sslmode", "disable");
            url.search = searchParams.toString();
            connString = url.toString();
        }

        return {
            connectionString: connString, // Use the full connection string with sslmode=disable
            user: url.username,
            password: url.password,
            host: url.hostname,
            port: url.port || "6543", // Default to 6543 for Supabase pooler
            database: url.pathname.replace(/^\//, ""),
            schema: url.searchParams.get("schema") || "ledger",
            ssl: false, // Disable SSL
        };
    } catch (err) {
        console.error("Failed to parse connection string:", err);
        return null;
    }
}

async function createTestData() {
    console.log("Starting test data creation...");

    // Get connection string
    const connString =
        process.env.LEDGER_DATABASE_URL || process.env.DATABASE_URL;
    if (!connString) {
        console.error("❌ No connection string found in .env file");
        return;
    }

    // Parse connection string
    const config = parseConnectionString(connString);
    if (!config) return;

    console.log(
        `Connecting to ${config.host}:${config.port}/${config.database} (schema: ${config.schema})...`,
    );

    // Create client
    const client = new Client({
        connectionString: config.connectionString, // Use the full connectionString with sslmode=disable
        ssl: false, // Explicitly disable SSL
    });

    try {
        await client.connect();
        console.log("✅ Connected to database");

        // Set schema
        await client.query(`SET search_path TO ${config.schema};`);
        console.log(`Schema set to ${config.schema}`);

        // Check if tables exist
        const tablesResult = await client.query(
            `
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1
    `,
            [config.schema],
        );

        if (tablesResult.rows.length === 0) {
            console.error(`❌ No tables found in schema ${config.schema}`);
            console.log("Running schema migration...");

            try {
                // Try to create tables directly (simple versions if needed)
                await client.query(`
          CREATE TABLE IF NOT EXISTS ${config.schema}.khata (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS ${config.schema}.party (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            "khataId" INTEGER NOT NULL,
            contact TEXT,
            "phoneNumber" TEXT,
            email TEXT,
            address TEXT, 
            city TEXT,
            description TEXT,
            "customerId" INTEGER,
            "vendorId" INTEGER,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS ${config.schema}.bill (
            id SERIAL PRIMARY KEY,
            "billNumber" TEXT NOT NULL,
            "khataId" INTEGER NOT NULL,
            "partyId" INTEGER,
            "billDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "dueDate" TIMESTAMP WITH TIME ZONE,
            amount DECIMAL(10,2) NOT NULL,
            "paidAmount" DECIMAL(10,2) DEFAULT 0,
            description TEXT,
            "billType" TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS ${config.schema}.transaction (
            id SERIAL PRIMARY KEY,
            "khataId" INTEGER NOT NULL,
            "partyId" INTEGER,
            "billId" INTEGER,
            "bankAccountId" INTEGER,
            amount DECIMAL(10,2) NOT NULL,
            description TEXT NOT NULL,
            "transactionType" TEXT NOT NULL,
            "transactionDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS ${config.schema}.bank_account (
            id SERIAL PRIMARY KEY,
            "accountName" TEXT NOT NULL,
            "accountNumber" TEXT NOT NULL,
            "bankName" TEXT NOT NULL,
            "branchName" TEXT,
            "khataId" INTEGER NOT NULL,
            balance DECIMAL(10,2) DEFAULT 0,
            description TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);

                console.log("✅ Created basic tables directly in the database");
            } catch (tableError) {
                console.error(
                    "❌ Failed to create tables directly:",
                    tableError.message,
                );
                console.log(
                    "\nRun this command in a separate terminal to create tables:",
                );
                console.log(
                    "npx prisma db push --schema=prisma/schema-ledger.prisma --force-reset",
                );
                return;
            }
        } else {
            console.log(`✅ Found ${tablesResult.rows.length} tables:`);
            tablesResult.rows.slice(0, 5).forEach((row) => {
                console.log(`   - ${row.table_name}`);
            });
            if (tablesResult.rows.length > 5) {
                console.log(
                    `   - ... and ${tablesResult.rows.length - 5} more`,
                );
            }
        }

        // Create a test khata (account book)
        console.log("\nCreating test khata...");
        try {
            const khataResult = await client.query(`
        INSERT INTO ${config.schema}.khata (name, description, "createdAt", "updatedAt")
        VALUES ('Test Khata', 'Created for testing', NOW(), NOW())
        RETURNING id
      `);

            const khataId = khataResult.rows[0]?.id || 1;
            console.log(`✅ Created khata with ID: ${khataId}`);

            // Create a test party
            const partyResult = await client.query(
                `
        INSERT INTO ${config.schema}.party (name, type, "khataId", "createdAt", "updatedAt")
        VALUES ('Test Vendor', 'VENDOR', $1, NOW(), NOW())
        RETURNING id
      `,
                [khataId],
            );

            const partyId = partyResult.rows[0].id;
            console.log(`✅ Created party with ID: ${partyId}`);

            // Create a test bill
            const billNumber = `BILL-TEST-${Math.floor(Math.random() * 10000)}`;
            const billResult = await client.query(
                `
        INSERT INTO ${config.schema}.bill (
          "billNumber", "khataId", "partyId", "billDate", "dueDate", 
          amount, "paidAmount", description, "billType", status, "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, $3, NOW(), NOW() + INTERVAL '30 days',
          5000.00, 0, 'Test bill entry', 'PURCHASE', 'PENDING', NOW(), NOW()
        )
        RETURNING id
      `,
                [billNumber, khataId, partyId],
            );

            const billId = billResult.rows[0].id;
            console.log(`✅ Created bill with ID: ${billId}`);

            // Create a test transaction
            const txnResult = await client.query(
                `
        INSERT INTO ${config.schema}.transaction (
          "khataId", "partyId", "amount", description, "transactionType", 
          "transactionDate", "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, 1000.00, 'Test transaction', 'CASH_PAYMENT',
          NOW(), NOW(), NOW()
        )
        RETURNING id
      `,
                [khataId, partyId],
            );

            const txnId = txnResult.rows[0].id;
            console.log(`✅ Created transaction with ID: ${txnId}`);

            // Try to create a bank account if the table exists
            try {
                const bankResult = await client.query(
                    `
          INSERT INTO ${config.schema}.bank_account (
            "accountName", "accountNumber", "bankName", "khataId", 
            balance, description, "createdAt", "updatedAt"
          )
          VALUES (
            'Test Bank Account', 'ACC12345', 'Test Bank', $1,
            10000.00, 'Test bank account', NOW(), NOW()
          )
          RETURNING id
        `,
                    [khataId],
                );

                const bankId = bankResult.rows[0]?.id;
                console.log(`✅ Created bank account with ID: ${bankId}`);
            } catch (error) {
                console.log(
                    `⚠️ Could not create bank account: ${error.message}`,
                );
            }

            console.log(
                "\n✅ Successfully created test data in the ledger database",
            );
            console.log("You should now be able to see data in the ledger UI");
        } catch (insertError) {
            console.error(`❌ Error inserting data: ${insertError.message}`);

            // Try to find specific error
            if (insertError.message.includes("duplicate key")) {
                console.log(
                    "⚠️ Some data already exists. Try adding more data with different identifiers.",
                );
            } else if (
                insertError.message.includes("violates foreign key constraint")
            ) {
                console.log(
                    "⚠️ Foreign key constraint violation. Ensure the referenced record exists.",
                );
            } else if (
                insertError.message.includes("relation") &&
                insertError.message.includes("does not exist")
            ) {
                console.log(
                    "⚠️ Table does not exist. Run Prisma migration first.",
                );
            }
        }
    } catch (error) {
        console.error("❌ Error creating test data:", error.message);

        // Detect common table existence errors
        if (
            error.message.includes("does not exist") &&
            error.message.includes("relation")
        ) {
            console.log("\nTables not found. Run the schema migration with:");
            console.log(
                "npx prisma db push --schema=prisma/schema-ledger.prisma",
            );
        }
    } finally {
        await client.end();
        console.log("Connection closed");
    }
}

createTestData().catch((err) => {
    console.error("Uncaught error:", err);
    process.exit(1);
});
