// Define Prisma client extension to include the ledger models
import { Prisma, PrismaClient } from "@prisma/client";

// Define Decimal type for Prisma
export interface Decimal {
    toString(): string;
    toNumber(): number;
    equals(_other: Decimal | number | string): boolean;
}

// Base types for our parameters
interface FindUniqueParams {
    where: Record<string, unknown>;
    select?: Record<string, boolean | object>;
    include?: Record<string, boolean | object>;
}

interface FindManyParams {
    where?: Record<string, unknown>;
    select?: Record<string, boolean | object>;
    include?: Record<string, boolean | object>;
    orderBy?: Record<string, string> | Array<Record<string, string>>;
    skip?: number;
    take?: number;
}

interface CreateParams {
    data: Record<string, unknown>;
    select?: Record<string, boolean | object>;
    include?: Record<string, boolean | object>;
}

interface UpdateParams {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    select?: Record<string, boolean | object>;
    include?: Record<string, boolean | object>;
}

interface DeleteParams {
    where: Record<string, unknown>;
    select?: Record<string, boolean | object>;
}

interface CountParams {
    where?: Record<string, unknown>;
}

// Define result types
interface LedgerEntry {
    id: number;
    entryType: string;
    entryDate: Date;
    dueDate?: Date | null;
    description: string;
    amount: Decimal;
    remainingAmount: Decimal;
    status: string;
    vendorId?: number | null;
    customerId?: number | null;
    reference?: string | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
    vendor?: Record<string, unknown> | null;
    customer?: Record<string, unknown> | null;
    transactions?: Array<Record<string, unknown>>;
}

interface LedgerTransaction {
    id: number;
    ledgerEntryId: number;
    transactionDate: Date;
    amount: Decimal;
    paymentMode: string;
    chequeNumber?: string | null;
    bankName?: string | null;
    referenceNumber?: string | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
    ledgerEntry?: LedgerEntry;
}

// Declare module that extends the PrismaClient type
declare module "@prisma/client" {
    interface PrismaClient {
        ledgerEntry: {
            findUnique: (
                _params: FindUniqueParams,
            ) => Promise<LedgerEntry | null>;
            findMany: (_params: FindManyParams) => Promise<LedgerEntry[]>;
            create: (_params: CreateParams) => Promise<LedgerEntry>;
            update: (_params: UpdateParams) => Promise<LedgerEntry>;
            delete: (_params: DeleteParams) => Promise<LedgerEntry>;
            count: (_params: CountParams) => Promise<number>;
        };
        ledgerTransaction: {
            create: (_params: CreateParams) => Promise<LedgerTransaction>;
            findMany: (_params: FindManyParams) => Promise<LedgerTransaction[]>;
        };
    }
}

export { Prisma, PrismaClient };
