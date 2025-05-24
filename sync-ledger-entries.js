// Script to add khata references to existing ledger entries
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncLedgerEntries() {
  console.log('Starting ledger entry synchronization...');
  
  try {
    // Get all ledger entries without khata references
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        entryType: 'BILL',
        OR: [
          {
            reference: {
              not: {
                contains: 'khata:'
              }
            }
          },
          {
            reference: null
          }
        ]
      }
    });
    
    console.log(`Found ${entries.length} entries without khata references`);
    
    // Default khata ID to use
    const defaultKhataId = 1;
    
    let updatedCount = 0;
    
    // Update each entry with a khata reference
    for (const entry of entries) {
      try {
        await prisma.ledgerEntry.update({
          where: {
            id: entry.id
          },
          data: {
            reference: `${entry.reference || ''} khata:${defaultKhataId}`.trim(),
            notes: `${entry.notes || ''}${entry.notes ? '\n' : ''}khata:${defaultKhataId}`.trim()
          }
        });
        
        updatedCount++;
        console.log(`Updated entry ${entry.id} with khata reference`);
      } catch (updateError) {
        console.error(`Error updating entry ${entry.id}:`, updateError);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} entries with khata references`);
  } catch (error) {
    console.error('Error synchronizing ledger entries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncLedgerEntries().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
