/**
 * This file provides a fallback implementation of the @prisma/ledger-client module
 * to prevent build errors when the actual module is not available.
 */
import { PrismaClient as OriginalPrismaClient } from '@prisma/client';

// Create a class that extends the main PrismaClient as a fallback
export class PrismaClient extends OriginalPrismaClient {
  constructor(options = {}) {
    super(options);
    console.log("Using fallback ledger client implementation");
  }
}

// Export for CommonJS require compatibility
module.exports = {
  PrismaClient
}; 