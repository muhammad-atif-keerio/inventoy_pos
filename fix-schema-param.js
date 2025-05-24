// Script to fix schema parameter in the connection string
require("dotenv").config();
const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing schema parameter in connection string...");

try {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found!");
    process.exit(1);
  }
  
  let envContent = fs.readFileSync(envPath, "utf8");
  
  // Check if we need to update the LEDGER_DATABASE_URL to include schema=ledger
  if (!envContent.includes("LEDGER_DATABASE_URL") || !envContent.match(/LEDGER_DATABASE_URL="[^"]*schema=ledger/)) {
    console.log("Adding schema=ledger parameter to LEDGER_DATABASE_URL...");
    
    const mainDbMatch = envContent.match(/DATABASE_URL="([^"]*)"/);
    if (mainDbMatch && mainDbMatch[1]) {
      const mainDbUrl = mainDbMatch[1];
      
      // Add schema=ledger parameter
      const separator = mainDbUrl.includes("?") ? "&" : "?";
      const newUrl = `${mainDbUrl}${separator}schema=ledger&sslmode=disable`;
      
      // Update or add LEDGER_DATABASE_URL
      if (envContent.includes("LEDGER_DATABASE_URL")) {
        envContent = envContent.replace(
          /LEDGER_DATABASE_URL="([^"]*)"/,
          `LEDGER_DATABASE_URL="${newUrl}"`
        );
      } else {
        envContent += `\nLEDGER_DATABASE_URL="${newUrl}"`;
      }
      
      // Also update LEDGER_DIRECT_URL if it exists
      if (envContent.includes("LEDGER_DIRECT_URL")) {
        const mainDirectMatch = envContent.match(/DIRECT_URL="([^"]*)"/);
        if (mainDirectMatch && mainDirectMatch[1]) {
          const mainDirectUrl = mainDirectMatch[1];
          const directSeparator = mainDirectUrl.includes("?") ? "&" : "?";
          const newDirectUrl = `${mainDirectUrl}${directSeparator}schema=ledger&sslmode=disable`;
          
          envContent = envContent.replace(
            /LEDGER_DIRECT_URL="([^"]*)"/,
            `LEDGER_DIRECT_URL="${newDirectUrl}"`
          );
        }
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Updated .env file with schema=ledger parameter");
      
      // Create a schema in the database
      console.log("\nTrying to generate Prisma client with updated connection URL...");
      require("child_process").execSync("npx prisma generate --schema=prisma/schema-ledger-schema.prisma", {
        stdio: "inherit"
      });
      
      console.log("\nPushing schema to database...");
      try {
        require("child_process").execSync("npx prisma db push --schema=prisma/schema-ledger-schema.prisma", {
          stdio: "inherit"
        });
        console.log("✅ Successfully pushed schema to database");
      } catch (error) {
        console.error("❌ Error pushing schema to database:", error.message);
        console.log("The application will use mock data in development mode");
      }
    } else {
      console.error("❌ Could not find DATABASE_URL in .env file");
    }
  } else {
    console.log("✅ LEDGER_DATABASE_URL already has schema=ledger parameter");
  }
} catch (error) {
  console.error("❌ Error updating .env file:", error.message);
} 