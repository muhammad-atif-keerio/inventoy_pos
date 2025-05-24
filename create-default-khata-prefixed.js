// Script to create a default khata with prefixed models
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
    console.log(`Found ${khataCount} existing khata records`);
    
    if (khataCount === 0) {
      console.log('No khata records found, creating a default one...');
      
      const defaultKhata = await prisma.ledgerKhata.create({
        data: {
          name: 'Default Khata',
          description: 'System generated default khata'
        }
      });
      
      console.log(`✅ Created default khata with ID: ${defaultKhata.id}`);
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
