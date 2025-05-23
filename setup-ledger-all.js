// Comprehensive script to set up ledger connection to Supabase
const { execSync } = require("child_process");
const fs = require("fs");
const readline = require("readline");

console.log("🚀 Starting ledger system setup...");

// Function to run a command with proper error handling
async function runCommand(command, description) {
    console.log(`\n📋 ${description}...`);
    try {
        execSync(command, { stdio: "inherit" });
        console.log(`✅ ${description} completed successfully`);
        return true;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return false;
    }
}

// Function to ask a yes/no question
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) =>
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans.toLowerCase().startsWith("y"));
        }),
    );
}

// Main setup function
async function setupLedger() {
    // Step 1: Check if .env file exists
    console.log("\n🔍 Checking environment variables...");
    if (!fs.existsSync(".env")) {
        console.error(
            "❌ .env file not found. Please create one first with your Supabase credentials.",
        );
        console.log(
            "Refer to connect-ledger-to-supabase.md for the required variables.",
        );
        return;
    }

    console.log("✅ .env file found");

    // Step 2: Generate ledger client
    const clientSuccess = await runCommand(
        "node fix-ledger-setup.js",
        "Generating ledger client",
    );
    if (!clientSuccess) {
        const continue1 = await askQuestion(
            "Continue despite the error? (y/n): ",
        );
        if (!continue1) return;
    }

    // Step 3: Push schema to database
    const pushSuccess = await runCommand(
        "npx prisma db push --schema=prisma/schema-ledger.prisma",
        "Pushing schema to database",
    );
    if (!pushSuccess) {
        console.log(
            "⚠️ Schema push failed. This might be due to connection issues or missing permissions.",
        );
        console.log(
            "Check your .env file and make sure your IP is in the Supabase allowlist.",
        );

        const forcePush = await askQuestion(
            "Try force-resetting the schema? (This will delete existing data!) (y/n): ",
        );
        if (forcePush) {
            await runCommand(
                "npx prisma db push --schema=prisma/schema-ledger.prisma --force-reset",
                "Force-resetting schema",
            );
        }
    }

    // Step 4: Test connection
    await runCommand(
        "node check-supabase-connection.js",
        "Testing database connection",
    );

    // Step 5: Offer to create test data
    const createData = await askQuestion(
        "Would you like to create test data? (y/n): ",
    );
    if (createData) {
        await runCommand(
            "node create-test-ledger-data.js",
            "Creating test data",
        );
    }

    // Step 6: Check if we need to modify ledger-db.ts
    console.log("\n🔍 Checking app/lib/ledger-db.ts for mock data setting...");
    try {
        const filePath = "app/lib/ledger-db.ts";
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, "utf8");
            if (content.includes("useMockDataForTesting = true")) {
                console.log(
                    "⚠️ Mock data mode is currently enabled in app/lib/ledger-db.ts",
                );
                const fixMock = await askQuestion(
                    "Disable mock data mode? (y/n): ",
                );
                if (fixMock) {
                    content = content.replace(
                        "useMockDataForTesting = true",
                        "useMockDataForTesting = false",
                    );
                    fs.writeFileSync(filePath, content);
                    console.log("✅ Mock data mode disabled");
                }
            } else {
                console.log("✅ Mock data mode is already disabled");
            }
        }
    } catch (error) {
        console.error(
            "❌ Error checking/modifying ledger-db.ts:",
            error.message,
        );
    }

    // Final step: Offer to start the development server
    console.log("\n🎉 Ledger system setup completed!");
    const startServer = await askQuestion(
        "Start the development server now? (y/n): ",
    );
    if (startServer) {
        await runCommand("npm run dev", "Starting development server");
    } else {
        console.log("You can start the server manually with: npm run dev");
    }
}

// Run the setup
setupLedger().catch((error) => {
    console.error("Uncaught error:", error);
    process.exit(1);
});
