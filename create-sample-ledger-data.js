// Script to populate the ledger system with sample data
require('dotenv').config();
const { PrismaClient } = require('@prisma/ledger-client');

async function createSampleData() {
  console.log('Creating sample data for the ledger system...');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  });
  
  try {
    await prisma.$connect();
    console.log('Connected to the database');
    
    // Check if we already have data
    const khataCount = await prisma.ledgerKhata.count();
    console.log(`Found ${khataCount} existing khatas`);
    
    if (khataCount > 0) {
      console.log('Sample data already exists. Skipping creation.');
      return;
    }
    
    // Create a main khata
    console.log('Creating main khata...');
    const mainKhata = await prisma.ledgerKhata.create({
      data: {
        name: 'Main Business Khata',
        description: 'Primary khata for all business transactions'
      }
    });
    console.log(`Created main khata with ID: ${mainKhata.id}`);
    
    // Create parties
    console.log('Creating sample parties...');
    const vendor1 = await prisma.ledgerParty.create({
      data: {
        name: 'Textile Suppliers Ltd.',
        type: 'VENDOR',
        khataId: mainKhata.id,
        contact: 'John Smith',
        phoneNumber: '123-456-7890',
        email: 'john@textilesuppliers.com',
        address: '123 Supplier Street',
        city: 'Fabric City',
        description: 'Main supplier for raw materials'
      }
    });
    
    const vendor2 = await prisma.ledgerParty.create({
      data: {
        name: 'Dye Works Inc.',
        type: 'VENDOR',
        khataId: mainKhata.id,
        contact: 'Jane Doe',
        phoneNumber: '987-654-3210',
        email: 'jane@dyeworks.com',
        address: '456 Color Avenue',
        city: 'Dye Town',
        description: 'Supplier for dyes and chemicals'
      }
    });
    
    const customer1 = await prisma.ledgerParty.create({
      data: {
        name: 'Fashion Retailers',
        type: 'CUSTOMER',
        khataId: mainKhata.id,
        contact: 'Michael Johnson',
        phoneNumber: '555-123-4567',
        email: 'michael@fashionretailers.com',
        address: '789 Fashion Boulevard',
        city: 'Style City',
        description: 'Regular bulk customer'
      }
    });
    
    const customer2 = await prisma.ledgerParty.create({
      data: {
        name: 'Boutique Elegance',
        type: 'CUSTOMER',
        khataId: mainKhata.id,
        contact: 'Sarah Williams',
        phoneNumber: '555-987-6543',
        email: 'sarah@boutiqueelegance.com',
        address: '101 Elegance Street',
        city: 'Boutique Town',
        description: 'High-end boutique customer'
      }
    });
    
    console.log('Created 4 parties (2 vendors, 2 customers)');
    
    // Create bank accounts
    console.log('Creating bank accounts...');
    const bankAccount1 = await prisma.ledgerBankAccount.create({
      data: {
        accountName: 'Business Current Account',
        accountNumber: 'CA-12345678',
        bankName: 'First National Bank',
        branchName: 'Main Branch',
        khataId: mainKhata.id,
        balance: 50000,
        description: 'Main business account'
      }
    });
    
    const bankAccount2 = await prisma.ledgerBankAccount.create({
      data: {
        accountName: 'Business Savings Account',
        accountNumber: 'SA-87654321',
        bankName: 'First National Bank',
        branchName: 'Main Branch',
        khataId: mainKhata.id,
        balance: 100000,
        description: 'Savings account for business'
      }
    });
    
    console.log('Created 2 bank accounts');
    
    // Create bills
    console.log('Creating bills...');
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Purchase bill
    const purchaseBill1 = await prisma.ledgerBill.create({
      data: {
        billNumber: 'PUR-001',
        khataId: mainKhata.id,
        partyId: vendor1.id,
        billDate: oneMonthAgo,
        dueDate: twoWeeksAgo,
        amount: 25000,
        paidAmount: 25000,
        description: 'Purchase of raw materials',
        billType: 'PURCHASE',
        status: 'PAID'
      }
    });
    
    const purchaseBill2 = await prisma.ledgerBill.create({
      data: {
        billNumber: 'PUR-002',
        khataId: mainKhata.id,
        partyId: vendor2.id,
        billDate: twoWeeksAgo,
        dueDate: nextMonth,
        amount: 15000,
        paidAmount: 5000,
        description: 'Purchase of dyes and chemicals',
        billType: 'PURCHASE',
        status: 'PARTIAL'
      }
    });
    
    // Sale bill
    const saleBill1 = await prisma.ledgerBill.create({
      data: {
        billNumber: 'SALE-001',
        khataId: mainKhata.id,
        partyId: customer1.id,
        billDate: twoWeeksAgo,
        dueDate: oneWeekAgo,
        amount: 35000,
        paidAmount: 35000,
        description: 'Sale of finished goods',
        billType: 'SALE',
        status: 'PAID'
      }
    });
    
    const saleBill2 = await prisma.ledgerBill.create({
      data: {
        billNumber: 'SALE-002',
        khataId: mainKhata.id,
        partyId: customer2.id,
        billDate: oneWeekAgo,
        dueDate: nextMonth,
        amount: 45000,
        paidAmount: 0,
        description: 'Sale of premium finished goods',
        billType: 'SALE',
        status: 'PENDING'
      }
    });
    
    console.log('Created 4 bills (2 purchases, 2 sales)');
    
    // Create transactions
    console.log('Creating transactions...');
    
    // Transaction for paid purchase
    const transaction1 = await prisma.ledgerTransaction.create({
      data: {
        khataId: mainKhata.id,
        transactionDate: twoWeeksAgo,
        amount: 25000,
        description: 'Payment for raw materials',
        transactionType: 'CASH_PAYMENT',
        partyId: vendor1.id,
        billId: purchaseBill1.id
      }
    });
    
    // Partial payment for purchase
    const transaction2 = await prisma.ledgerTransaction.create({
      data: {
        khataId: mainKhata.id,
        transactionDate: oneWeekAgo,
        amount: 5000,
        description: 'Partial payment for dyes',
        transactionType: 'BANK_WITHDRAWAL',
        partyId: vendor2.id,
        billId: purchaseBill2.id,
        bankAccountId: bankAccount1.id
      }
    });
    
    // Payment received for sale
    const transaction3 = await prisma.ledgerTransaction.create({
      data: {
        khataId: mainKhata.id,
        transactionDate: oneWeekAgo,
        amount: 35000,
        description: 'Payment received for goods',
        transactionType: 'BANK_DEPOSIT',
        partyId: customer1.id,
        billId: saleBill1.id,
        bankAccountId: bankAccount1.id
      }
    });
    
    // Bank transfer
    const transaction4 = await prisma.ledgerTransaction.create({
      data: {
        khataId: mainKhata.id,
        transactionDate: today,
        amount: 10000,
        description: 'Transfer to savings account',
        transactionType: 'TRANSFER',
        bankAccountId: bankAccount1.id
      }
    });
    
    console.log('Created 4 transactions');
    
    // Create inventory items
    console.log('Creating inventory items...');
    
    const inventory1 = await prisma.ledgerInventory.create({
      data: {
        name: 'Raw Cotton',
        inventoryType: 'WAREHOUSE',
        quantity: 1000,
        unit: 'kg',
        description: 'Raw cotton material',
        location: 'Warehouse A'
      }
    });
    
    const inventory2 = await prisma.ledgerInventory.create({
      data: {
        name: 'Blue Dye',
        inventoryType: 'DYEING_MATERIAL',
        quantity: 50,
        unit: 'liters',
        description: 'Blue dye for cotton',
        location: 'Chemical Storage'
      }
    });
    
    const inventory3 = await prisma.ledgerInventory.create({
      data: {
        name: 'Cotton Thread',
        inventoryType: 'THREAD',
        quantity: 500,
        unit: 'spools',
        description: 'Cotton thread for stitching',
        location: 'Thread Section'
      }
    });
    
    const inventory4 = await prisma.ledgerInventory.create({
      data: {
        name: 'Finished Blue Fabric',
        inventoryType: 'READY_CLOTH',
        quantity: 200,
        unit: 'meters',
        description: 'Blue dyed cotton fabric',
        location: 'Finished Goods'
      }
    });
    
    console.log('Created 4 inventory items');
    
    console.log('✅ Successfully created sample data for the ledger system');
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from the database');
  }
}

createSampleData()
  .catch(console.error)
  .finally(() => console.log('Script completed')); 