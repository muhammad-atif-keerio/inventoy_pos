// Script to migrate existing inventory data
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
    console.log(`Found ${inventories.length} inventory records`);
    
    // Update each inventory record with improved data
    for (const inventory of inventories) {
      console.log(`Updating inventory #${inventory.id}`);
      
      await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          // Only update the name if it's still the default migrated value
          name: inventory.name === "Migrated Item" ? 
            `Item #${inventory.id}` : inventory.name,
          // Add more specific updates as needed
          description: inventory.description || `Automatically migrated inventory item #${inventory.id}`
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
