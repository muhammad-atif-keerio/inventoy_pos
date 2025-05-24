// Script to create ledger schema with prefixed tables to avoid conflicts
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔧 Setting up ledger schema with prefixed tables...");

// Update .env file to set schema to public (no schema parameter)
function updateEnvFile() {
  console.log("\n📋 Updating .env file...");
  
  try {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) {
      console.error("❌ .env file not found!");
      return false;
    }
    
    let envContent = fs.readFileSync(envPath, "utf8");
    
    // Extract the main database URL without schema parameter
    const mainDbMatch = envContent.match(/DATABASE_URL="([^"]*)"/);
    if (mainDbMatch && mainDbMatch[1]) {
      const mainDbUrl = mainDbMatch[1];
      
      // Create clean URLs without schema parameter (we'll use table prefixes instead)
      let newUrl = mainDbUrl;
      if (newUrl.includes("schema=")) {
        newUrl = newUrl.replace(/[&?]schema=[^&]+/, "");
      }
      
      // Add sslmode=disable for better compatibility if not already present
      if (!newUrl.includes("sslmode=")) {
        const separator = newUrl.includes("?") ? "&" : "?";
        newUrl += `${separator}sslmode=disable`;
      }
      
      // Update the environment variables
      envContent = envContent.replace(
        /LEDGER_DATABASE_URL="([^"]*)"/,
        `LEDGER_DATABASE_URL="${newUrl}"`
      );
      
      const mainDirectMatch = envContent.match(/DIRECT_URL="([^"]*)"/);
      if (mainDirectMatch && mainDirectMatch[1]) {
        let newDirectUrl = mainDirectMatch[1];
        if (newDirectUrl.includes("schema=")) {
          newDirectUrl = newDirectUrl.replace(/[&?]schema=[^&]+/, "");
        }
        
        if (!newDirectUrl.includes("sslmode=")) {
          const separator = newDirectUrl.includes("?") ? "&" : "?";
          newDirectUrl += `${separator}sslmode=disable`;
        }
        
        envContent = envContent.replace(
          /LEDGER_DIRECT_URL="([^"]*)"/,
          `LEDGER_DIRECT_URL="${newDirectUrl}"`
        );
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Updated .env file with clean URLs (no schema parameter)");
      return true;
    } else {
      console.error("❌ Could not find DATABASE_URL in .env file");
      return false;
    }
  } catch (error) {
    console.error("❌ Error updating .env file:", error.message);
    return false;
  }
}

// Generate client and push schema
function setupLedgerSchema() {
  console.log("\n📋 Setting up ledger schema with prefixed tables...");
  
  try {
    // Generate the client
    console.log("Generating Prisma client from prefixed schema...");
    execSync("npx prisma generate --schema=prisma/schema-ledger-schema.prisma", {
      stdio: "inherit",
    });
    
    // Push the schema
    console.log("\nPushing prefixed schema to database...");
    execSync("npx prisma db push --schema=prisma/schema-ledger-schema.prisma", {
      stdio: "inherit",
    });
    
    console.log("✅ Successfully pushed ledger schema to database");
    return true;
  } catch (error) {
    console.error("❌ Error setting up ledger schema:", error.message);
    return false;
  }
}

// Update ledger-db.ts to use the new prefixed models
function updateLedgerDbCode() {
  console.log("\n📋 Updating code to work with prefixed models...");
  
  try {
    // Create an adapter file that maps the prefixed model names to the expected interface
    const adapterPath = path.join(__dirname, "app", "lib", "ledger-adapter.ts");
    const adapterContent = `// Adapter to map prefixed ledger models to expected interfaces
import { PrismaClient } from "@prisma/ledger-client";

// Import types
import {
  Khata,
  Bill,
  Party,
  Transaction,
  BankAccount,
  Cheque,
  Inventory,
  BillType,
  BillStatus,
  PartyType,
  TransactionType,
  ChequeStatus,
  InventoryType,
  LedgerDbClient
} from "./ledger-db";

// Create an adapter that maps the prefixed models to the expected interfaces
export class LedgerClientAdapter implements LedgerDbClient {
  private client: PrismaClient;
  
  constructor() {
    this.client = new PrismaClient();
  }
  
  // Khata adapter
  get khata() {
    return {
      create: async (args: any) => {
        const result = await this.client.ledgerKhata.create(args);
        return result as unknown as Khata;
      },
      findMany: async (args?: any) => {
        const results = await this.client.ledgerKhata.findMany(args);
        return results as unknown as Khata[];
      },
      findUnique: async (args: any) => {
        const result = await this.client.ledgerKhata.findUnique(args);
        return result as unknown as Khata | null;
      },
      findFirst: async (args: any) => {
        const result = await this.client.ledgerKhata.findFirst(args);
        return result as unknown as Khata | null;
      },
      update: async (args: any) => {
        const result = await this.client.ledgerKhata.update(args);
        return result as unknown as Khata;
      },
      upsert: async (args: any) => {
        const result = await this.client.ledgerKhata.upsert(args);
        return result as unknown as Khata;
      },
      delete: async (args: any) => {
        const result = await this.client.ledgerKhata.delete(args);
        return result as unknown as Khata;
      },
      count: async (args?: any) => {
        return this.client.ledgerKhata.count(args);
      }
    };
  }
  
  // Bill adapter
  get bill() {
    return {
      create: async (args: any) => {
        // Convert billType and status if needed
        if (args.data?.billType) {
          args.data.billType = this.convertEnumValue(args.data.billType);
        }
        if (args.data?.status) {
          args.data.status = this.convertEnumValue(args.data.status);
        }
        const result = await this.client.ledgerBill.create(args);
        return result as unknown as Bill;
      },
      findMany: async (args?: any) => {
        const results = await this.client.ledgerBill.findMany(args);
        return results as unknown as Bill[];
      },
      findUnique: async (args: any) => {
        const result = await this.client.ledgerBill.findUnique(args);
        return result as unknown as Bill | null;
      },
      findFirst: async (args: any) => {
        const result = await this.client.ledgerBill.findFirst(args);
        return result as unknown as Bill | null;
      },
      update: async (args: any) => {
        if (args.data?.billType) {
          args.data.billType = this.convertEnumValue(args.data.billType);
        }
        if (args.data?.status) {
          args.data.status = this.convertEnumValue(args.data.status);
        }
        const result = await this.client.ledgerBill.update(args);
        return result as unknown as Bill;
      },
      upsert: async (args: any) => {
        const result = await this.client.ledgerBill.upsert(args);
        return result as unknown as Bill;
      },
      delete: async (args: any) => {
        const result = await this.client.ledgerBill.delete(args);
        return result as unknown as Bill;
      },
      count: async (args?: any) => {
        return this.client.ledgerBill.count(args);
      }
    };
  }
  
  // Similarly implement party, transaction, bankAccount, cheque, and inventory
  // Simplified implementations for other models
  get party() {
    return this.createModelProxy(this.client.ledgerParty);
  }
  
  get transaction() {
    return this.createModelProxy(this.client.ledgerTransaction);
  }
  
  get bankAccount() {
    return this.createModelProxy(this.client.ledgerBankAccount);
  }
  
  get cheque() {
    return this.createModelProxy(this.client.ledgerCheque);
  }
  
  get inventory() {
    return this.createModelProxy(this.client.ledgerInventory);
  }
  
  // Helper method to create model proxies
  private createModelProxy(model: any) {
    return {
      create: async (args: any) => model.create(args),
      findMany: async (args?: any) => model.findMany(args),
      findUnique: async (args: any) => model.findUnique(args),
      findFirst: async (args: any) => model.findFirst(args),
      update: async (args: any) => model.update(args),
      upsert: async (args: any) => model.upsert(args),
      delete: async (args: any) => model.delete(args),
      count: async (args?: any) => model.count(args)
    };
  }
  
  // Helper to convert enum values
  private convertEnumValue(value: any): any {
    // For most enum values, just return the same value
    // The adapter handles the mapping between interfaces
    return value;
  }
  
  // Connection methods
  async $connect(): Promise<void> {
    await this.client.$connect();
  }
  
  async $disconnect(): Promise<void> {
    await this.client.$disconnect();
  }
}
`;
    
    fs.writeFileSync(adapterPath, adapterContent);
    console.log("✅ Created ledger-adapter.ts file");
    
    // Update ledger-db.ts to use the adapter
    const ledgerDbPath = path.join(__dirname, "app", "lib", "ledger-db.ts");
    let ledgerDbContent = fs.readFileSync(ledgerDbPath, "utf8");
    
    // Add import for the adapter
    const adapterImport = `import { LedgerClientAdapter } from "./ledger-adapter";`;
    ledgerDbContent = ledgerDbContent.replace(
      /import { cache } from "react";/,
      `import { cache } from "react";\n${adapterImport}`
    );
    
    // Modify the prismaClientSingleton function to use the adapter
    const adapterCode = `
      try {
        // Use our adapter to map prefixed models to expected interfaces
        const client = new LedgerClientAdapter();
        console.log("Created adapter for ledger database client");
        return client;
      } catch (error) {`;
    
    ledgerDbContent = ledgerDbContent.replace(
      /try {.*?const client = new LedgerDbAdapter\(prismaClient\);.*?console\.log\("Created real ledger database client"\);.*?return client;.*?} catch \(error\) {/s,
      adapterCode
    );
    
    fs.writeFileSync(ledgerDbPath, ledgerDbContent);
    console.log("✅ Updated ledger-db.ts file to use adapter");
    
    return true;
  } catch (error) {
    console.error("❌ Error updating code:", error.message);
    return false;
  }
}

// Create a default khata to start with
function createDefaultKhata() {
  console.log("\n📋 Creating default khata script...");
  
  try {
    const scriptPath = path.join(__dirname, "create-default-khata-prefixed.js");
    const scriptContent = `// Script to create a default khata with prefixed models
require('dotenv').config();
const { PrismaClient } = require('@prisma/ledger-client');

async function createDefaultKhata() {
  console.log('Creating default khata with prefixed tables...');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn']
  });
  
  try {
    await prisma.$connect();
    console.log('Connected to the database');
    
    // Check if any khata exists
    const khataCount = await prisma.ledgerKhata.count();
    console.log(\`Found \${khataCount} existing khata records\`);
    
    if (khataCount === 0) {
      console.log('No khata records found, creating a default one...');
      
      const defaultKhata = await prisma.ledgerKhata.create({
        data: {
          name: 'Default Khata',
          description: 'System generated default khata'
        }
      });
      
      console.log(\`✅ Created default khata with ID: \${defaultKhata.id}\`);
    } else {
      console.log('✅ At least one khata already exists');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from the database');
  }
}

createDefaultKhata()
  .catch(console.error)
  .finally(() => console.log('Script completed'));
`;
    
    fs.writeFileSync(scriptPath, scriptContent);
    console.log("✅ Created default khata script");
    return true;
  } catch (error) {
    console.error("❌ Error creating default khata script:", error.message);
    return false;
  }
}

// Main function to run all steps
async function main() {
  console.log("🛠️ Starting ledger setup process with prefixed tables...");
  
  // Step 1: Update .env file
  const envUpdated = updateEnvFile();
  
  // Step 2: Set up ledger schema
  const schemaSetup = setupLedgerSchema();
  
  // Step 3: Update code to work with prefixed models
  const codeUpdated = updateLedgerDbCode();
  
  // Step 4: Create default khata script
  const defaultKhataScript = createDefaultKhata();
  
  console.log("\n📋 Summary:");
  console.log(`- Environment Update: ${envUpdated ? "✅ Success" : "❌ Failed"}`);
  console.log(`- Schema Setup: ${schemaSetup ? "✅ Success" : "❌ Failed"}`);
  console.log(`- Code Update: ${codeUpdated ? "✅ Success" : "❌ Failed"}`);
  console.log(`- Default Khata Script: ${defaultKhataScript ? "✅ Success" : "❌ Failed"}`);
  
  console.log("\n📌 Next steps:");
  console.log("1. Run the default khata script: node create-default-khata-prefixed.js");
  console.log("2. Restart your Next.js development server");
  console.log("3. Test the ledger functionality");
}

// Execute the main function
main().catch(error => {
  console.error("Uncaught error:", error);
  process.exit(1);
}); 