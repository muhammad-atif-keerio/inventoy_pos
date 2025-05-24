// Script to test schema compatibility without applying changes
require("dotenv").config();
const { execSync } = require("child_process");

console.log("🔍 Testing schema compatibility...");

try {
  // Run Prisma db pull to get the current schema
  console.log("\n📋 Pulling current schema from database...");
  execSync("npx prisma db pull --schema=./prisma/current-schema.prisma --print", {
    stdio: "inherit"
  });
  
  // Compare the modified schema with the current schema (dry run)
  console.log("\n📋 Running schema push in preview mode (dry run)...");
  execSync("npx prisma db push --schema=./prisma/schema-ledger-modified.prisma --preview-feature", {
    stdio: "inherit"
  });
  
  console.log("\n✅ Schema compatibility test complete");
} catch (error) {
  console.error("\n❌ Error testing schema compatibility:", error.message);
} finally {
  console.log("\n📌 Next steps:");
  console.log("1. Review any warnings or errors from the schema compatibility test");
  console.log("2. If everything looks good, run: node fix-ledger-connection-safe.js");
  console.log("3. Otherwise, adjust the schema-ledger-modified.prisma file as needed");
} 