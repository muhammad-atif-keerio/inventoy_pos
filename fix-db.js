// Database fix script - this will attempt to resolve common database issues
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { promisify } = require("util");

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = promisify(rl.question).bind(rl);

async function main() {
    console.log("🔧 Prisma Database Fix Tool");
    console.log("========================");
    console.log(
        "This tool will attempt to fix database connectivity and schema issues",
    );
    console.log("");

    // Step 1: Check current environment
    console.log("Step 1: Checking environment...");
    try {
        const nodeEnv = process.env.NODE_ENV || "development";
        console.log(`› Node environment: ${nodeEnv}`);

        const envPath = path.resolve(".env");
        const envExists = fs.existsSync(envPath);
        console.log(
            `› .env file ${envExists ? "exists" : "does not exist"} at ${envPath}`,
        );

        if (!envExists) {
            console.log(
                "❌ No .env file found. Creating a template .env file...",
            );
            fs.writeFileSync(
                envPath,
                'DATABASE_URL="postgresql://username:password@localhost:5432/mydatabase"\n',
            );
            console.log(
                "✅ Created .env file template. Please update it with your database credentials.",
            );
            process.exit(1);
        }

        // Read DATABASE_URL from .env file
        const envContent = fs.readFileSync(envPath, "utf8");
        const databaseUrlMatch = envContent.match(/DATABASE_URL=["'](.*)["']/);
        const databaseUrl = databaseUrlMatch ? databaseUrlMatch[1] : null;

        if (!databaseUrl) {
            console.log("❌ DATABASE_URL not found in .env file");
            const newDbUrl = await question(
                "Please enter your Supabase database URL: ",
            );
            const updatedEnv = envContent + `\nDATABASE_URL="${newDbUrl}"\n`;
            fs.writeFileSync(envPath, updatedEnv);
            console.log("✅ Added DATABASE_URL to .env file");
        } else {
            console.log(
                `› Database URL found in .env file (showing partial): ${databaseUrl.substring(0, 15)}...`,
            );

            // Check if it's Supabase
            if (databaseUrl.includes("supabase")) {
                console.log("› Detected Supabase database");

                // Check if we need to add connection pooling parameter
                if (
                    !databaseUrl.includes("pgbouncer=true") &&
                    databaseUrl.includes("pooler.supabase")
                ) {
                    console.log(
                        "› Adding pgbouncer=true parameter for Supabase connection pooling",
                    );
                    const updatedUrl = databaseUrl.includes("?")
                        ? `${databaseUrl}&pgbouncer=true`
                        : `${databaseUrl}?pgbouncer=true`;

                    const updatedEnv = envContent.replace(
                        /DATABASE_URL=["'](.*)["']/,
                        `DATABASE_URL="${updatedUrl}"`,
                    );
                    fs.writeFileSync(envPath, updatedEnv);
                    console.log(
                        "✅ Updated DATABASE_URL with pgbouncer parameter",
                    );
                }

                // Check for DIRECT_URL
                if (!envContent.includes("DIRECT_URL")) {
                    console.log(
                        "› Adding DIRECT_URL for Supabase direct connections",
                    );
                    const directUrl = databaseUrl.replace(
                        "pooler.supabase.com",
                        "supabase.co",
                    );
                    const updatedEnv =
                        envContent + `\nDIRECT_URL="${directUrl}"\n`;
                    fs.writeFileSync(envPath, updatedEnv);
                    console.log("✅ Added DIRECT_URL to .env file");
                }
            }
        }
    } catch (error) {
        console.error("Error checking environment:", error);
    }

    // Step 2: Check schema.prisma file
    console.log("\nStep 2: Checking schema.prisma file...");
    try {
        const schemaPath = path.resolve("prisma", "schema.prisma");
        const schemaExists = fs.existsSync(schemaPath);
        console.log(
            `› schema.prisma file ${schemaExists ? "exists" : "does not exist"} at ${schemaPath}`,
        );

        if (!schemaExists) {
            console.log("❌ No schema.prisma file found");
            process.exit(1);
        }

        const schemaContent = fs.readFileSync(schemaPath, "utf8");

        // Check if directUrl is configured
        if (!schemaContent.includes("directUrl")) {
            console.log(
                "› Adding directUrl to schema.prisma for better Supabase support",
            );
            const datasourceMatch = schemaContent.match(
                /datasource\s+db\s*{[^}]+}/s,
            );
            if (datasourceMatch) {
                const datasourceBlock = datasourceMatch[0];
                const updatedDatasource = datasourceBlock.replace(
                    /(\s+url\s*=\s*env\s*\(\s*["']DATABASE_URL["']\s*\))/,
                    '$1\n  directUrl = env("DIRECT_URL")',
                );
                const updatedSchema = schemaContent.replace(
                    datasourceBlock,
                    updatedDatasource,
                );
                fs.writeFileSync(schemaPath, updatedSchema);
                console.log("✅ Updated schema.prisma with directUrl");
            }
        }
    } catch (error) {
        console.error("Error checking schema.prisma:", error);
    }

    // Step 3: Try to fix database connectivity
    console.log("\nStep 3: Attempting to fix database connectivity...");
    try {
        // Attempt 1: Generate Prisma client
        console.log("› Generating Prisma client...");
        execSync("npx prisma generate", { stdio: "inherit" });

        // Attempt 2: Try to connect using directly using npx
        console.log("› Testing database connection...");
        try {
            execSync("npx prisma db pull --force", { stdio: "inherit" });
            console.log("✅ Successfully connected to the database!");
        } catch (error) {
            console.log("❌ Connection failed. Trying alternative methods...");

            // Attempt 3: Try with direct URL
            console.log("› Trying with direct connection URL...");
            try {
                // Read the DIRECT_URL from .env
                const envContent = fs.readFileSync(
                    path.resolve(".env"),
                    "utf8",
                );
                const directUrlMatch = envContent.match(
                    /DIRECT_URL=["'](.*)["']/,
                );

                if (directUrlMatch) {
                    const tempEnvPath = path.resolve(".env.temp");
                    fs.writeFileSync(
                        tempEnvPath,
                        `DATABASE_URL=${directUrlMatch[1]}\n`,
                    );

                    execSync("npx dotenv -e .env.temp -- prisma db pull", {
                        stdio: "inherit",
                    });
                    fs.unlinkSync(tempEnvPath);

                    console.log(
                        "✅ Successfully connected using direct URL! Your schema should now be updated.",
                    );
                    console.log(
                        "› Please check your .env file for the correct connection settings.",
                    );
                }
            } catch (directError) {
                console.log("❌ Direct connection also failed.");
                console.log(
                    "› You may need to check Supabase dashboard to verify your database is active and IP restrictions are properly set.",
                );
            }
        }

        // Attempt 4: Try to push the schema
        console.log("\n› Attempting to deploy schema to database...");
        try {
            execSync("npx prisma db push", { stdio: "inherit" });
            console.log("✅ Successfully pushed schema to database!");
        } catch (error) {
            console.log("❌ Schema push failed.");
            console.log(
                "› Trying with --accept-data-loss flag (use with caution)",
            );

            try {
                const proceed = await question(
                    "This may result in data loss. Do you want to continue? (y/N): ",
                );
                if (proceed.toLowerCase() === "y") {
                    execSync("npx prisma db push --accept-data-loss", {
                        stdio: "inherit",
                    });
                    console.log(
                        "✅ Successfully pushed schema to database with --accept-data-loss flag!",
                    );
                } else {
                    console.log(
                        "› Skipped pushing schema with data loss risk.",
                    );
                }
            } catch (forcePushError) {
                console.log("❌ Force schema push also failed.");
            }
        }
    } catch (error) {
        console.error("Error fixing database connectivity:", error);
    }

    // Step 4: Final checks and recovery
    console.log("\nStep 4: Running final checks...");
    try {
        // Generate client one more time
        console.log("› Regenerating Prisma client...");
        execSync("npx prisma generate", { stdio: "inherit" });

        // Check if migrations folder exists
        const migrationsPath = path.resolve("prisma", "migrations");
        const migrationsExist = fs.existsSync(migrationsPath);

        if (!migrationsExist) {
            console.log(
                "› No migrations folder found. Creating initial migration...",
            );
            try {
                execSync(
                    "npx prisma migrate dev --name init_recovery --create-only",
                    { stdio: "inherit" },
                );
                console.log("✅ Created initial migration file.");
            } catch (error) {
                console.log(
                    "❌ Failed to create migration file:",
                    error.message,
                );
            }
        } else {
            console.log("› Migrations folder exists.");
        }

        // Perform a basic query test
        console.log("\n› Testing database query...");
        const testScript = `
      const { PrismaClient } = require('@prisma/client');
      async function test() {
        const prisma = new PrismaClient();
        try {
          const result = await prisma.$queryRaw\`SELECT current_timestamp\`;
          console.log('Database query successful:', result);
          await prisma.$disconnect();
          return process.exit(0);
        } catch (error) {
          console.error('Database query failed:', error);
          await prisma.$disconnect();
          return process.exit(1);
        }
      }
      test();
    `;

        const testScriptPath = path.resolve("test-db-query.js");
        fs.writeFileSync(testScriptPath, testScript);

        try {
            execSync("node test-db-query.js", { stdio: "inherit" });
            console.log("✅ Database query test passed!");

            // Clean up test file
            fs.unlinkSync(testScriptPath);
        } catch (error) {
            console.log("❌ Database query test failed.");

            // Clean up test file
            if (fs.existsSync(testScriptPath)) {
                fs.unlinkSync(testScriptPath);
            }

            console.log("\n⚠️ Database connection issues persist.");
            console.log("Please try the following manual steps:");
            console.log(
                "1. Check your Supabase project dashboard to make sure the database is active",
            );
            console.log(
                "2. Verify that your IP address is allowed in the Supabase connection settings",
            );
            console.log(
                "3. Try connecting with a database client like pgAdmin or Supabase Studio",
            );
        }
    } catch (error) {
        console.error("Error during final checks:", error);
    }

    // Summary and next steps
    console.log("\n=====================");
    console.log("🏁 Fix process complete");
    console.log("=====================");
    console.log("If database connection is now working:");
    console.log("1. Start your application: npm run dev");
    console.log("2. Check that all database operations work correctly");
    console.log("");
    console.log("If issues persist:");
    console.log("1. Check the Supabase dashboard for database status");
    console.log(
        "2. Make sure your IP is allowed in the Supabase connection settings",
    );
    console.log("3. Try running: node check-db.js for diagnostics");

    rl.close();
}

main().catch(console.error);
