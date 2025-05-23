// Script to create ledger schema in the database and then apply our schema
require("dotenv").config();
const { Client } = require("pg");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔧 Setting up ledger schema...");

// Extract connection string components
function parseConnectionString(url) {
    try {
        // Parse the connection URL into parts
        const match = url.match(
            /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/,
        );
        if (!match) throw new Error("Invalid connection string format");

        const [, user, password, host, port, dbname] = match;

        return {
            user,
            password,
            host,
            port: parseInt(port),
            database: dbname,
            ssl: { rejectUnauthorized: false },
        };
    } catch (error) {
        console.error("❌ Error parsing connection string:", error.message);
        return null;
    }
}

// Create the ledger schema in the database
async function createLedgerSchema() {
    console.log("\n📋 Creating ledger schema in the database...");

    // Get the database URL from .env
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error("❌ DATABASE_URL not found in environment variables");
        return false;
    }

    // Parse the connection string
    const config = parseConnectionString(databaseUrl);
    if (!config) return false;

    console.log(
        `Connecting to database at ${config.host}:${config.port}/${config.database}...`,
    );

    const client = new Client(config);

    try {
        await client.connect();
        console.log("✅ Connected to database");

        // Create the ledger schema if it doesn't exist
        console.log("Creating ledger schema if it doesn't exist...");
        await client.query('CREATE SCHEMA IF NOT EXISTS "ledger";');
        console.log("✅ Ledger schema created (or already exists)");

        // Check if schema exists
        const result = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = 'ledger';
    `);

        if (result.rows.length > 0) {
            console.log("✅ Confirmed ledger schema exists");
            return true;
        } else {
            console.error("❌ Failed to create ledger schema");
            return false;
        }
    } catch (error) {
        console.error("❌ Error creating schema:", error.message);
        return false;
    } finally {
        await client.end();
        console.log("Database connection closed");
    }
}

// Push the schema to the database
function pushSchema() {
    console.log("\n📋 Pushing schema to database...");

    try {
        console.log("Generating Prisma client...");
        execSync(
            "npx prisma generate --schema=prisma/schema-ledger-schema.prisma",
            {
                stdio: "inherit",
            },
        );

        console.log("\nPushing schema to database...");
        execSync(
            "npx prisma db push --schema=prisma/schema-ledger-schema.prisma --accept-data-loss",
            {
                stdio: "inherit",
            },
        );

        console.log("✅ Schema pushed successfully");
        return true;
    } catch (error) {
        console.error("❌ Error pushing schema:", error.message);
        return false;
    }
}

// Create a test script for the new schema
function createTestScript() {
    console.log("\n📋 Creating test script...");

    try {
        const scriptPath = path.join(__dirname, "test-ledger-schema.js");
        const scriptContent = `// Script to test the ledger schema
require('dotenv').config();
const { PrismaClient } = require('@prisma/ledger-client');

async function testLedgerSchema() {
  console.log('Testing ledger schema...');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn']
  });
  
  try {
    await prisma.$connect();
    console.log('Connected to database');
    
    // Create a test khata
    console.log('Creating test khata...');
    const khata = await prisma.ledgerKhata.create({
      data: {
        name: 'Test Khata',
        description: 'Created by test script'
      }
    });
    
    console.log(\`✅ Created khata with ID: \${khata.id}\`);
    
    // Create a test party
    console.log('Creating test party...');
    const party = await prisma.ledgerParty.create({
      data: {
        name: 'Test Party',
        type: 'VENDOR',
        khataId: khata.id,
        contact: 'Contact Person',
        phoneNumber: '123-456-7890'
      }
    });
    
    console.log(\`✅ Created party with ID: \${party.id}\`);
    
    // Create a test bill
    console.log('Creating test bill...');
    const bill = await prisma.ledgerBill.create({
      data: {
        billNumber: \`BILL-\${Date.now()}\`,
        khataId: khata.id,
        partyId: party.id,
        billDate: new Date(),
        amount: 1000,
        billType: 'PURCHASE',
        description: 'Test bill'
      }
    });
    
    console.log(\`✅ Created bill with ID: \${bill.id}\`);
    
    // List all khatas
    console.log('Listing all khatas:');
    const khatas = await prisma.ledgerKhata.findMany();
    khatas.forEach(k => console.log(\`- \${k.id}: \${k.name}\`));
    
    console.log('✅ Schema test successful');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from database');
  }
}

testLedgerSchema()
  .catch(console.error)
  .finally(() => console.log('Test completed'));
`;

        fs.writeFileSync(scriptPath, scriptContent);
        console.log("✅ Created test script at test-ledger-schema.js");
        return true;
    } catch (error) {
        console.error("❌ Error creating test script:", error.message);
        return false;
    }
}

// Main function
async function main() {
    console.log("🛠️ Setting up ledger schema...");

    // Step 1: Create the ledger schema
    const schemaCreated = await createLedgerSchema();

    // Step 2: Push the Prisma schema
    const schemaPushed = schemaCreated ? pushSchema() : false;

    // Step 3: Create test script
    const testScriptCreated = schemaPushed ? createTestScript() : false;

    // Summary
    console.log("\n📋 Summary:");
    console.log(
        `- Schema Creation: ${schemaCreated ? "✅ Success" : "❌ Failed"}`,
    );
    console.log(`- Schema Push: ${schemaPushed ? "✅ Success" : "❌ Failed"}`);
    console.log(
        `- Test Script: ${testScriptCreated ? "✅ Success" : "❌ Failed"}`,
    );

    if (schemaPushed) {
        console.log("\n📌 Next steps:");
        console.log("1. Run the test script: node test-ledger-schema.js");
        console.log("2. Restart your Next.js development server");
    } else {
        console.log("\n📌 Troubleshooting:");
        console.log("1. Check database connection settings");
        console.log("2. Verify you have permission to create schemas");
        console.log(
            "3. The application will fall back to mock data in development mode",
        );
    }
}

// Run the main function
main().catch((error) => {
    console.error("Uncaught error:", error);
    process.exit(1);
});
