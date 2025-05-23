// Comprehensive script to verify the ledger system functionality
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
};

console.log(
    `${colors.cyan}========================================${colors.reset}`,
);
console.log(
    `${colors.cyan}   LEDGER SYSTEM VERIFICATION SCRIPT    ${colors.reset}`,
);
console.log(
    `${colors.cyan}========================================${colors.reset}`,
);

// Track overall status
const status = {
    envVars: false,
    prismaClient: false,
    dbConnection: false,
    schemaValid: false,
    dataAccess: false,
};

// Step 1: Check environment variables
console.log(
    `\n${colors.blue}1. Checking environment variables...${colors.reset}`,
);
const requiredVars = ["LEDGER_DATABASE_URL", "LEDGER_DIRECT_URL"];
const missingVars = [];

requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
        missingVars.push(varName);
        console.log(`${colors.red}✖ Missing ${varName}${colors.reset}`);
    } else {
        const maskedUrl = process.env[varName].replace(/:[^:]*@/, ":****@");
        console.log(
            `${colors.green}✓ ${varName} is set: ${maskedUrl}${colors.reset}`,
        );
    }
});

if (missingVars.length === 0) {
    console.log(
        `${colors.green}✓ All required environment variables are set${colors.reset}`,
    );
    status.envVars = true;
} else {
    console.log(
        `${colors.red}✖ Missing environment variables: ${missingVars.join(", ")}${colors.reset}`,
    );
}

// Step 2: Check Prisma client
console.log(`\n${colors.blue}2. Checking Prisma client...${colors.reset}`);
const clientPath = path.join(
    __dirname,
    "node_modules",
    "@prisma",
    "ledger-client",
);

if (fs.existsSync(clientPath)) {
    const files = fs.readdirSync(clientPath);
    console.log(
        `${colors.green}✓ Prisma client directory exists${colors.reset}`,
    );
    console.log(
        `${colors.green}✓ Found ${files.length} files in the client directory${colors.reset}`,
    );

    // Check for index.js specifically
    if (fs.existsSync(path.join(clientPath, "index.js"))) {
        console.log(`${colors.green}✓ index.js exists${colors.reset}`);
        status.prismaClient = true;
    } else {
        console.log(`${colors.red}✖ index.js is missing${colors.reset}`);
    }
} else {
    console.log(
        `${colors.red}✖ Prisma client directory not found${colors.reset}`,
    );
    console.log(
        `${colors.yellow}ℹ Run 'npx prisma generate --schema=prisma/schema-ledger.prisma' to generate the client${colors.reset}`,
    );
}

// Step 3: Test database connection
console.log(`\n${colors.blue}3. Testing database connection...${colors.reset}`);

try {
    // Try to dynamically import the Prisma client
    let PrismaClient;
    try {
        // Try to require the ledger client
        PrismaClient = require("@prisma/ledger-client").PrismaClient;
        console.log(
            `${colors.green}✓ Successfully imported Prisma client${colors.reset}`,
        );
    } catch (importError) {
        console.log(
            `${colors.red}✖ Failed to import Prisma client: ${importError.message}${colors.reset}`,
        );
        process.exit(1);
    }

    // Test the connection
    (async () => {
        try {
            const prisma = new PrismaClient({
                log: ["error", "warn"],
            });

            console.log(
                `${colors.yellow}ℹ Connecting to database...${colors.reset}`,
            );
            await prisma.$connect();
            console.log(
                `${colors.green}✓ Database connection successful${colors.reset}`,
            );
            status.dbConnection = true;

            // Step 4: Verify schema
            console.log(
                `\n${colors.blue}4. Verifying database schema...${colors.reset}`,
            );

            try {
                // Check if khata table exists by querying it
                const khataCount =
                    await prisma.$queryRaw`SELECT COUNT(*) FROM "khata"`;
                console.log(
                    `${colors.green}✓ Khata table exists with ${khataCount[0].count} records${colors.reset}`,
                );
                status.schemaValid = true;
            } catch (schemaError) {
                console.log(
                    `${colors.red}✖ Schema verification failed: ${schemaError.message}${colors.reset}`,
                );
                console.log(
                    `${colors.yellow}ℹ Tables might not exist. Run 'npx prisma db push --schema=prisma/schema-ledger.prisma' to create them${colors.reset}`,
                );

                // Try to create tables
                console.log(
                    `${colors.yellow}ℹ Attempting to create tables directly...${colors.reset}`,
                );
                try {
                    await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "khata" (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `;
                    console.log(
                        `${colors.green}✓ Created khata table${colors.reset}`,
                    );
                    status.schemaValid = true;
                } catch (createError) {
                    console.log(
                        `${colors.red}✖ Failed to create tables: ${createError.message}${colors.reset}`,
                    );
                }
            }

            // Step 5: Test data access
            console.log(
                `\n${colors.blue}5. Testing data access...${colors.reset}`,
            );

            try {
                // Try to get all khatas
                const khatas = await prisma.khata.findMany({ take: 5 });
                console.log(
                    `${colors.green}✓ Successfully retrieved ${khatas.length} khatas${colors.reset}`,
                );

                if (khatas.length > 0) {
                    console.log(
                        `${colors.green}✓ Sample khata: ${JSON.stringify(khatas[0])}${colors.reset}`,
                    );
                } else {
                    console.log(
                        `${colors.yellow}ℹ No khatas found, creating a test khata...${colors.reset}`,
                    );

                    // Create a test khata
                    const newKhata = await prisma.khata.create({
                        data: {
                            name: `Test Khata ${new Date().toISOString()}`,
                            description: "Created during verification test",
                        },
                    });

                    console.log(
                        `${colors.green}✓ Created test khata: ${JSON.stringify(newKhata)}${colors.reset}`,
                    );
                }

                // Try to get all parties
                const parties = await prisma.party.findMany({ take: 5 });
                console.log(
                    `${colors.green}✓ Successfully retrieved ${parties.length} parties${colors.reset}`,
                );

                if (parties.length === 0) {
                    console.log(
                        `${colors.yellow}ℹ No parties found, creating a test party...${colors.reset}`,
                    );

                    // Get the first khata or create one
                    let khataId;
                    const khata = await prisma.khata.findFirst();
                    if (khata) {
                        khataId = khata.id;
                    } else {
                        const newKhata = await prisma.khata.create({
                            data: {
                                name: "Default Khata",
                                description: "Created during verification test",
                            },
                        });
                        khataId = newKhata.id;
                    }

                    // Create a test party
                    const newParty = await prisma.party.create({
                        data: {
                            name: `Test Vendor ${new Date().toISOString()}`,
                            type: "VENDOR",
                            khataId: khataId,
                        },
                    });

                    console.log(
                        `${colors.green}✓ Created test party: ${JSON.stringify(newParty)}${colors.reset}`,
                    );
                }

                status.dataAccess = true;
            } catch (dataError) {
                console.log(
                    `${colors.red}✖ Data access test failed: ${dataError.message}${colors.reset}`,
                );
            }

            // Disconnect from the database
            await prisma.$disconnect();

            // Print summary
            console.log(
                `\n${colors.cyan}========================================${colors.reset}`,
            );
            console.log(
                `${colors.cyan}           VERIFICATION SUMMARY          ${colors.reset}`,
            );
            console.log(
                `${colors.cyan}========================================${colors.reset}`,
            );
            console.log(
                `Environment Variables: ${status.envVars ? colors.green + "✓ PASS" : colors.red + "✖ FAIL"}${colors.reset}`,
            );
            console.log(
                `Prisma Client:         ${status.prismaClient ? colors.green + "✓ PASS" : colors.red + "✖ FAIL"}${colors.reset}`,
            );
            console.log(
                `Database Connection:   ${status.dbConnection ? colors.green + "✓ PASS" : colors.red + "✖ FAIL"}${colors.reset}`,
            );
            console.log(
                `Schema Validation:     ${status.schemaValid ? colors.green + "✓ PASS" : colors.red + "✖ FAIL"}${colors.reset}`,
            );
            console.log(
                `Data Access:           ${status.dataAccess ? colors.green + "✓ PASS" : colors.red + "✖ FAIL"}${colors.reset}`,
            );

            const allPassed = Object.values(status).every(Boolean);
            if (allPassed) {
                console.log(
                    `\n${colors.green}🎉 All tests passed! The ledger system is working correctly.${colors.reset}`,
                );
            } else {
                console.log(
                    `\n${colors.yellow}⚠️ Some tests failed. See details above for troubleshooting.${colors.reset}`,
                );
            }

            // Recommendations
            console.log(`\n${colors.blue}Recommendations:${colors.reset}`);
            if (!status.prismaClient) {
                console.log(
                    `${colors.yellow}- Run 'npx prisma generate --schema=prisma/schema-ledger.prisma' to generate the client${colors.reset}`,
                );
            }
            if (!status.schemaValid) {
                console.log(
                    `${colors.yellow}- Run 'npx prisma db push --schema=prisma/schema-ledger.prisma' to create the tables${colors.reset}`,
                );
            }
            if (!status.dataAccess) {
                console.log(
                    `${colors.yellow}- Run 'node create-test-ledger-data.js' to populate the database with test data${colors.reset}`,
                );
            }

            process.exit(allPassed ? 0 : 1);
        } catch (error) {
            console.log(
                `${colors.red}✖ Unexpected error: ${error.message}${colors.reset}`,
            );
            process.exit(1);
        }
    })();
} catch (error) {
    console.log(
        `${colors.red}✖ Failed to test database connection: ${error.message}${colors.reset}`,
    );
    process.exit(1);
}
