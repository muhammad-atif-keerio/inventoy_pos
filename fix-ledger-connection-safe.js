// Script to safely fix ledger database connection without affecting existing data
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔧 Starting safe ledger connection fix...");

// Check and update connection string in .env file
function updateConnectionStrings() {
  console.log("\n📋 Checking database connection strings...");
  
  try {
    // Read .env file
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) {
      console.error("❌ .env file not found!");
      return false;
    }
    
    let envContent = fs.readFileSync(envPath, "utf8");
    let updated = false;
    
    // Update the ledger database URL to use schema parameter instead of creating new schema
    if (envContent.includes("LEDGER_DATABASE_URL")) {
      // Extract the main database URL
      const mainDbMatch = envContent.match(/DATABASE_URL="([^"]*)"/);
      if (mainDbMatch && mainDbMatch[1]) {
        const mainDbUrl = mainDbMatch[1];
        
        // Create a new URL with schema=ledger parameter
        let newUrl = mainDbUrl;
        if (!newUrl.includes("schema=")) {
          const separator = newUrl.includes("?") ? "&" : "?";
          newUrl += `${separator}schema=ledger`;
        }
        
        // Add sslmode=disable for better compatibility if not already present
        if (!newUrl.includes("sslmode=")) {
          const separator = newUrl.includes("?") ? "&" : "?";
          newUrl += `${separator}sslmode=disable`;
        }
        
        // Replace the LEDGER_DATABASE_URL with the new URL
        const updatedContent = envContent.replace(
          /LEDGER_DATABASE_URL="([^"]*)"/,
          `LEDGER_DATABASE_URL="${newUrl}"`
        );
        
        if (updatedContent !== envContent) {
          fs.writeFileSync(envPath, updatedContent);
          envContent = updatedContent;
          console.log("✅ Updated LEDGER_DATABASE_URL with schema parameter");
          updated = true;
        }
      }
    } else {
      // If LEDGER_DATABASE_URL doesn't exist, add it
      const mainDbMatch = envContent.match(/DATABASE_URL="([^"]*)"/);
      if (mainDbMatch && mainDbMatch[1]) {
        const mainDbUrl = mainDbMatch[1];
        const separator = mainDbUrl.includes("?") ? "&" : "?";
        const newUrl = `${mainDbUrl}${separator}schema=ledger&sslmode=disable`;
        
        envContent += `\nLEDGER_DATABASE_URL="${newUrl}"`;
        fs.writeFileSync(envPath, envContent);
        console.log("✅ Added LEDGER_DATABASE_URL with schema parameter");
        updated = true;
      }
    }
    
    // Same for LEDGER_DIRECT_URL
    if (envContent.includes("LEDGER_DIRECT_URL")) {
      const mainDirectMatch = envContent.match(/DIRECT_URL="([^"]*)"/);
      if (mainDirectMatch && mainDirectMatch[1]) {
        const mainDirectUrl = mainDirectMatch[1];
        
        let newUrl = mainDirectUrl;
        if (!newUrl.includes("schema=")) {
          const separator = newUrl.includes("?") ? "&" : "?";
          newUrl += `${separator}schema=ledger`;
        }
        
        if (!newUrl.includes("sslmode=")) {
          const separator = newUrl.includes("?") ? "&" : "?";
          newUrl += `${separator}sslmode=disable`;
        }
        
        const updatedContent = envContent.replace(
          /LEDGER_DIRECT_URL="([^"]*)"/,
          `LEDGER_DIRECT_URL="${newUrl}"`
        );
        
        if (updatedContent !== envContent) {
          fs.writeFileSync(envPath, updatedContent);
          console.log("✅ Updated LEDGER_DIRECT_URL with schema parameter");
          updated = true;
        }
      }
    } else {
      // If LEDGER_DIRECT_URL doesn't exist, add it
      const mainDirectMatch = envContent.match(/DIRECT_URL="([^"]*)"/);
      if (mainDirectMatch && mainDirectMatch[1]) {
        const mainDirectUrl = mainDirectMatch[1];
        const separator = mainDirectUrl.includes("?") ? "&" : "?";
        const newUrl = `${mainDirectUrl}${separator}schema=ledger&sslmode=disable`;
        
        envContent += `\nLEDGER_DIRECT_URL="${newUrl}"`;
        fs.writeFileSync(envPath, envContent);
        console.log("✅ Added LEDGER_DIRECT_URL with schema parameter");
        updated = true;
      }
    }
    
    if (!updated) {
      console.log("ℹ️ No changes needed to connection strings");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error updating connection strings:", error.message);
    return false;
  }
}

// Use the modified schema to push safely to the database
function pushModifiedSchema() {
  console.log("\n📋 Pushing modified schema to database...");
  
  try {
    // Generate the client
    console.log("Generating Prisma client from modified schema...");
    execSync("npx prisma generate --schema=prisma/schema-ledger-modified.prisma", {
      stdio: "inherit",
    });
    
    // Push the schema
    console.log("\nPushing modified schema to database...");
    execSync("npx prisma db push --schema=prisma/schema-ledger-modified.prisma", {
      stdio: "inherit",
    });
    
    console.log("✅ Successfully pushed modified schema to database");
    return true;
  } catch (error) {
    console.error("❌ Error pushing modified schema:", error.message);
    return false;
  }
}

// Create a migration script to update existing inventory records
function createMigrationScript() {
  console.log("\n📋 Creating migration script for existing data...");
  
  const scriptPath = path.join(__dirname, "migrate-inventory-data.js");
  const scriptContent = `// Script to migrate existing inventory data
require("dotenv").config();
const { PrismaClient } = require('@prisma/ledger-client');

async function migrateInventoryData() {
  console.log("Starting inventory data migration...");
  
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log("Connected to database");
    
    // Get all inventory records
    const inventories = await prisma.inventory.findMany();
    console.log(\`Found \${inventories.length} inventory records\`);
    
    // Update each inventory record with improved data
    for (const inventory of inventories) {
      console.log(\`Updating inventory #\${inventory.id}\`);
      
      await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          // Only update the name if it's still the default migrated value
          name: inventory.name === "Migrated Item" ? 
            \`Item #\${inventory.id}\` : inventory.name,
          // Add more specific updates as needed
          description: inventory.description || \`Automatically migrated inventory item #\${inventory.id}\`
        }
      });
    }
    
    console.log("✅ Successfully migrated inventory data");
  } catch (error) {
    console.error("❌ Error migrating inventory data:", error.message);
    console.log("The application will continue to work with the default values");
  } finally {
    await prisma.$disconnect();
  }
}

migrateInventoryData()
  .catch(console.error)
  .finally(() => console.log("Migration script completed"));
`;
  
  fs.writeFileSync(scriptPath, scriptContent);
  console.log("✅ Created migration script at migrate-inventory-data.js");
  return true;
}

// Main function to run all steps
async function main() {
  console.log("🛠️ Starting safe ledger connection fix process...");
  
  // Step 1: Update connection strings to use schema parameter
  const connectionsUpdated = updateConnectionStrings();
  if (!connectionsUpdated) {
    console.error("❌ Failed to update connection strings");
    process.exit(1);
  }
  
  // Step 2: Create modified schema with default values
  // Already done - we created schema-ledger-modified.prisma
  
  // Step 3: Push the modified schema
  const schemaPushed = pushModifiedSchema();
  
  // Step 4: Create migration script for existing data
  const migrationCreated = createMigrationScript();
  
  console.log("\n📋 Summary:");
  console.log(`- Connection Strings Update: ${connectionsUpdated ? "✅ Success" : "❌ Failed"}`);
  console.log(`- Schema Push: ${schemaPushed ? "✅ Success" : "❌ Failed"}`);
  console.log(`- Migration Script Creation: ${migrationCreated ? "✅ Success" : "❌ Failed"}`);
  
  console.log("\n📌 Next steps:");
  console.log("1. Run migration script: node migrate-inventory-data.js");
  console.log("2. Generate the client with the original schema: npx prisma generate --schema=prisma/schema-ledger.prisma");
  console.log("3. Restart your Next.js development server");
}

// Execute the main function
main().catch(error => {
  console.error("Uncaught error:", error);
  process.exit(1);
}); 