/* eslint-disable no-unused-vars */
import {
    LedgerEntryStatus as PrismaLedgerEntryStatus,
    LedgerEntryType as PrismaLedgerEntryType,
} from "@prisma/client";

// Re-export Prisma enum types
export { PrismaLedgerEntryType, PrismaLedgerEntryStatus };

// These are UI-specific enum types that mirror the Prisma ones but are separate
// Use these for UI components but use the Prisma ones for database operations
export enum UiLedgerEntryType {
    PAYABLE = "PAYABLE",
    RECEIVABLE = "RECEIVABLE",
    KHATA = "KHATA",
    BILL = "BILL",
    TRANSACTION = "TRANSACTION",
    CHEQUE = "CHEQUE",
    INVENTORY = "INVENTORY",
    BANK = "BANK",
}

export enum UiLedgerEntryStatus {
    PENDING = "PENDING",
    PARTIAL = "PARTIAL",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    PAID = "PAID",
    CLEARED = "CLEARED",
    BOUNCED = "BOUNCED",
    REPLACED = "REPLACED",
}

// Define a base DataItem interface for table compatibility
export interface DataItem {
    entryType?: string;
    status?: string;
    [key: string]: unknown;
}

// Export other common types used across the application
export interface LedgerEntryRow extends DataItem {
    id: string;
    entryType: string;
    description: string;
    entryDate: string;
    dueDate?: string;
    amount: string;
    remainingAmount: string;
    status: string;
    reference?: string;
    vendor?: { id: number; name: string };
    customer?: { id: number; name: string };
    party?: string;
    manualPartyName?: string;
    transactionType?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions?: any[];
    vendorId?: number;
    customerId?: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

// Add other types as needed
