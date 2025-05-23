// Direct wrapper for ledger functionality
import { db } from "../../lib/db";

// Re-export all the ledger types
export * from "./ledger-types";

// Create direct exports
export const ledgerDb = db;
export const isUsingRealLedgerClient = !!process.env.LEDGER_DATABASE_URL;
