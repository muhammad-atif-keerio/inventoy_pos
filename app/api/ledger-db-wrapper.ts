/* eslint-disable no-unused-vars */
// Direct wrapper for ledger functionality
import { db } from "../../lib/db";

// Create direct exports
export const ledgerDb = db;
export const isUsingRealLedgerClient = !!process.env.LEDGER_DATABASE_URL;

// Define types directly to avoid import issues
export enum BillStatus {
    PENDING = "PENDING",
    PARTIAL = "PARTIAL",
    PAID = "PAID",
    CANCELLED = "CANCELLED",
}

export enum BillType {
    PURCHASE = "PURCHASE",
    SALE = "SALE",
    EXPENSE = "EXPENSE",
    INCOME = "INCOME",
    OTHER = "OTHER",
}

export enum PartyType {
    VENDOR = "VENDOR",
    CUSTOMER = "CUSTOMER",
    EMPLOYEE = "EMPLOYEE",
    OTHER = "OTHER",
}

export enum TransactionType {
    PURCHASE = "PURCHASE",
    SALE = "SALE",
    BANK_DEPOSIT = "BANK_DEPOSIT",
    BANK_WITHDRAWAL = "BANK_WITHDRAWAL",
    CASH_PAYMENT = "CASH_PAYMENT",
    CASH_RECEIPT = "CASH_RECEIPT",
    CHEQUE_PAYMENT = "CHEQUE_PAYMENT",
    CHEQUE_RECEIPT = "CHEQUE_RECEIPT",
    CHEQUE_RETURN = "CHEQUE_RETURN",
    DYEING_EXPENSE = "DYEING_EXPENSE",
    INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT",
    EXPENSE = "EXPENSE",
    INCOME = "INCOME",
    TRANSFER = "TRANSFER",
    OTHER = "OTHER",
}

export interface Bill {
    id: number;
    billNumber: string;
    khataId: number;
    partyId: number | null;
    billDate: Date;
    dueDate: Date | null;
    amount: number;
    paidAmount: number;
    description: string | null;
    billType: BillType;
    status: BillStatus;
    createdAt: Date;
    updatedAt: Date;
    party?: Party;
    transactions?: Transaction[];
}

export interface Party {
    id: number;
    name: string;
    type: PartyType;
    khataId: number;
    contact: string | null;
    phoneNumber: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    description: string | null;
    customerId: number | null;
    vendorId: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Transaction {
    id: number;
    khataId: number;
    partyId: number | null;
    billId: number | null;
    bankAccountId: number | null;
    amount: number;
    description: string;
    transactionType: TransactionType;
    transactionDate: Date;
    createdAt: Date;
    updatedAt: Date;
    party?: Party | null;
}

export interface Khata {
    id: number;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
