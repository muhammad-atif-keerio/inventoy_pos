// Test script for the safelyFetchLedgerEntry function
// Use a relative path to import
const path = require('path');
try {
  console.log('Trying to load ledger-db module...');
  const ledgerDb = require(path.join(__dirname, 'app', 'lib', 'ledger-db'));
  
  async function test() {
    console.log('Testing safelyFetchLedgerEntry...');
    
    // Test with a non-existent ID
    try {
      console.log('Test with non-existent ID:');
      const nonExistentEntry = await ledgerDb.safelyFetchLedgerEntry('bill', 9999);
      console.log('Non-existent entry result:', nonExistentEntry);
    } catch (error) {
      console.error('Error with non-existent ID test:', error);
    }
    
    // Test with a valid ID (assuming ID 1 exists in development with mock data)
    try {
      console.log('\nTest with valid ID 1:');
      const validEntry = await ledgerDb.safelyFetchLedgerEntry('bill', 1);
      console.log('Valid entry result:', validEntry);
    } catch (error) {
      console.error('Error with valid ID test:', error);
    }
    
    // Test with error case forcing mock data
    try {
      console.log('\nTest with forced error (should use mock data):');
      const mockDataEntry = await ledgerDb.safelyFetchLedgerEntry('bill', 'invalid-id');
      console.log('Mock data result:', mockDataEntry);
    } catch (error) {
      console.error('Error with invalid ID test (should not happen with safe fetch):', error);
    }
    
    console.log('\nTests completed.');
  }

  // Run the tests
  test();
} catch (error) {
  console.error('Failed to load module:', error);
  console.log('Current directory:', __dirname);
  console.log('Module paths:', module.paths);
} 