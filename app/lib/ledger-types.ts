// Shared types for the ledger system

/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Custom error class for ledger operations with additional context information
 */
export class LedgerError extends Error {
  public operation: string;
  public entityType?: string;
  public entityId?: number | string;
  public originalError?: Error | unknown;

  constructor(
    message: string,
    options: {
      operation: string;
      entityType?: string;
      entityId?: number | string;
      originalError?: Error | unknown;
    }
  ) {
    super(message);
    this.name = 'LedgerError';
    this.operation = options.operation;
    this.entityType = options.entityType;
    this.entityId = options.entityId;
    this.originalError = options.originalError;

    // Maintains proper stack trace for the error (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LedgerError);
    }
  }
}

export interface Khata {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
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

export interface BankAccount {
  id: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string | null;
  khataId: number;
  balance: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cheque {
  id: number;
  chequeNumber: string;
  bankAccountId: number;
  billId: number | null;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  status: ChequeStatus;
  description: string | null;
  isReplacement: boolean;
  replacedChequeId: number | null;
  createdAt: Date;
  updatedAt: Date;
  bankAccount: BankAccount;
  bill?: {
    party?: Party;
  };
}

export interface Inventory {
  id: number;
  name: string;
  inventoryType: InventoryType;
  quantity: number;
  unit: string;
  description: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum BillType {
  PURCHASE = "PURCHASE",
  SALE = "SALE",
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
  OTHER = "OTHER"
}

export enum BillStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  CANCELLED = "CANCELLED"
}

export enum PartyType {
  VENDOR = "VENDOR",
  CUSTOMER = "CUSTOMER",
  EMPLOYEE = "EMPLOYEE",
  OTHER = "OTHER"
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
  OTHER = "OTHER"
}

export enum ChequeStatus {
  PENDING = "PENDING",
  CLEARED = "CLEARED",
  BOUNCED = "BOUNCED",
  REPLACED = "REPLACED",
  CANCELLED = "CANCELLED"
}

export enum InventoryType {
  WAREHOUSE = "WAREHOUSE",
  FOLDING = "FOLDING",
  THREAD = "THREAD",
  GREY_CLOTH = "GREY_CLOTH",
  READY_CLOTH = "READY_CLOTH",
  DYEING_MATERIAL = "DYEING_MATERIAL",
  OTHER = "OTHER"
}

export interface ModelProxy<T> {
  create: (args: any) => Promise<T>;
  findMany: (args?: any) => Promise<T[]>;
  findUnique: (args: any) => Promise<T | null>;
  findFirst: (args: any) => Promise<T | null>;
  update: (args: any) => Promise<T>;
  upsert: (args: any) => Promise<T>;
  delete: (args: any) => Promise<T>;
  count: (args?: any) => Promise<number>;
}

export interface LedgerDbClient {
  khata: ModelProxy<Khata>;
  bill: ModelProxy<Bill>;
  party: ModelProxy<Party>;
  bankAccount: ModelProxy<BankAccount>;
  transaction: ModelProxy<Transaction>;
  cheque: ModelProxy<Cheque>;
  inventory: ModelProxy<Inventory>;
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
}

/**
 * Data validation utilities for ledger entities
 */
export class LedgerValidator {
  /**
   * Validate a bill entity
   * @param bill Bill data to validate
   * @returns Validation result with errors if any
   */
  static validateBill(bill: Partial<Bill>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!bill.billNumber) errors.push('Bill number is required');
    if (!bill.khataId) errors.push('Khata ID is required');
    if (!bill.billDate) errors.push('Bill date is required');
    if (bill.amount === undefined || bill.amount < 0) errors.push('Valid amount is required');
    if (!bill.billType) errors.push('Bill type is required');
    if (!bill.status) errors.push('Bill status is required');

    // Field constraints
    if (bill.paidAmount !== undefined && bill.paidAmount < 0) 
      errors.push('Paid amount cannot be negative');
      
    if (bill.paidAmount !== undefined && bill.amount !== undefined && bill.paidAmount > bill.amount)
      errors.push('Paid amount cannot exceed bill amount');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a transaction entity
   * @param transaction Transaction data to validate
   * @returns Validation result with errors if any
   */
  static validateTransaction(transaction: Partial<Transaction>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!transaction.khataId) errors.push('Khata ID is required');
    if (!transaction.transactionDate) errors.push('Transaction date is required');
    if (transaction.amount === undefined || transaction.amount <= 0) 
      errors.push('Valid positive amount is required');
    if (!transaction.transactionType) errors.push('Transaction type is required');
    if (!transaction.description) errors.push('Description is required');

    // At least one of partyId, billId, or bankAccountId should be present
    if (!transaction.partyId && !transaction.billId && !transaction.bankAccountId)
      errors.push('At least one of party, bill, or bank account must be specified');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a party entity
   * @param party Party data to validate
   * @returns Validation result with errors if any
   */
  static validateParty(party: Partial<Party>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!party.name) errors.push('Party name is required');
    if (!party.type) errors.push('Party type is required');
    if (!party.khataId) errors.push('Khata ID is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 