import { NextRequest, NextResponse } from "next/server";

// TODO: This is a placeholder. In the future, this will properly connect to the ledger database
// defined in app/lib/ledger-db.ts and use the schema in prisma/schema-ledger.prisma
// const { ledgerDb } = require("@/lib/ledger-db");

export type LedgerEntryResponse = {
    id: string;
    entryType: "BILL" | "TRANSACTION" | "CHEQUE" | "INVENTORY" | "BANK";
    transactionType?: string;
    description: string;
    party: string;
    reference?: string;
    entryDate: string;
    dueDate?: string;
    amount: string;
    remainingAmount: string;
    status: string;
};

export type LedgerApiResponse = {
    entries: LedgerEntryResponse[];
    meta: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
};

export async function GET(
    request: NextRequest,
): Promise<NextResponse<LedgerApiResponse>> {
    try {
        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const khataId = searchParams.get("khataId") || "1";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "50");

        // Parse filters
        const filters = {
            khataId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        };

        console.log("Ledger API request:", { filters, page, pageSize });

        // TODO: In the future, this will query the ledger database
        // For now, return sample data
        const sampleEntries = generateSampleEntries();

        // Apply filters (only date filtering for now)
        let filteredEntries = sampleEntries;

        if (filters.startDate || filters.endDate) {
            filteredEntries = sampleEntries.filter((entry) => {
                const entryDate = new Date(entry.entryDate);

                if (filters.startDate && entryDate < filters.startDate) {
                    return false;
                }

                if (filters.endDate && entryDate > filters.endDate) {
                    return false;
                }

                return true;
            });
        }

        // Calculate pagination
        const total = filteredEntries.length;
        const totalPages = Math.ceil(total / pageSize);
        const offset = (page - 1) * pageSize;
        const paginatedEntries = filteredEntries.slice(
            offset,
            offset + pageSize,
        );

        return NextResponse.json({
            entries: paginatedEntries,
            meta: {
                total,
                page,
                pageSize,
                totalPages,
            },
        });
    } catch (error) {
        console.error("Error in ledger API:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch ledger entries",
                details: error instanceof Error ? error.message : String(error),
                entries: [],
                meta: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
            },
            { status: 500 },
        );
    }
}

// Generate sample ledger entries for testing
function generateSampleEntries(): LedgerEntryResponse[] {
    return [
        {
            id: "bill-1",
            entryType: "BILL",
            transactionType: "PURCHASE",
            description: "Thread Purchase",
            party: "Textile Suppliers Ltd",
            reference: "BILL-12345",
            entryDate: new Date().toISOString(),
            dueDate: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "25000",
            remainingAmount: "25000",
            status: "PENDING",
        },
        {
            id: "trx-1",
            entryType: "TRANSACTION",
            transactionType: "BANK_DEPOSIT",
            description: "Bank Deposit",
            party: "National Bank",
            reference: "TRX-6789",
            entryDate: new Date().toISOString(),
            amount: "50000",
            remainingAmount: "0",
            status: "COMPLETED",
        },
        {
            id: "chq-1",
            entryType: "CHEQUE",
            transactionType: "CHEQUE_PAYMENT",
            description: "Supplier Payment",
            party: "Thread Company",
            reference: "CHQ-4567",
            entryDate: new Date(
                Date.now() - 15 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() + 15 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "12000",
            remainingAmount: "12000",
            status: "PENDING",
        },
        {
            id: "inv-1",
            entryType: "INVENTORY",
            transactionType: "INVENTORY_ADJUSTMENT",
            description: "Grey Cloth Stock",
            party: "Main Warehouse",
            reference: "INV-8901",
            entryDate: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "1000",
            remainingAmount: "1000",
            status: "COMPLETED",
        },
        {
            id: "bill-2",
            entryType: "BILL",
            transactionType: "SALE",
            description: "Cloth Sale",
            party: "Fashion Retailer",
            reference: "BILL-5678",
            entryDate: new Date(
                Date.now() - 20 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() + 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "35000",
            remainingAmount: "25000",
            status: "PARTIAL",
        },
        {
            id: "bank-1",
            entryType: "BANK",
            transactionType: "BANK_DEPOSIT",
            description: "Current Account",
            party: "National Bank",
            reference: "ACC-001",
            entryDate: new Date(
                Date.now() - 2 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "120000",
            remainingAmount: "120000",
            status: "COMPLETED",
        },
        {
            id: "bill-3",
            entryType: "BILL",
            transactionType: "PURCHASE",
            description: "Grey Cloth Purchase",
            party: "Fabric Manufacturer",
            reference: "BILL-7890",
            entryDate: new Date(
                Date.now() - 25 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() - 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "45000",
            remainingAmount: "45000",
            status: "PENDING",
        },
        {
            id: "trx-2",
            entryType: "TRANSACTION",
            transactionType: "BANK_WITHDRAWAL",
            description: "Cash Withdrawal",
            party: "National Bank",
            reference: "TRX-1234",
            entryDate: new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "15000",
            remainingAmount: "0",
            status: "COMPLETED",
        },
        {
            id: "chq-2",
            entryType: "CHEQUE",
            transactionType: "CHEQUE_RECEIPT",
            description: "Customer Payment",
            party: "Zeeshan Keerio - Manual Entry",
            reference: "CHQ-5678",
            entryDate: new Date(
                Date.now() - 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() - 2 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "17500",
            remainingAmount: "0",
            status: "CLEARED",
        },
        {
            id: "inv-2",
            entryType: "INVENTORY",
            transactionType: "INVENTORY_ADJUSTMENT",
            description: "Ready Cloth Stock",
            party: "Folding Department",
            reference: "INV-3456",
            entryDate: new Date(
                Date.now() - 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "2500",
            remainingAmount: "2500",
            status: "COMPLETED",
        },
        {
            id: "trx-3",
            entryType: "TRANSACTION",
            transactionType: "DYEING_EXPENSE",
            description: "Dyeing Materials Purchase",
            party: "Chemical Supplier",
            reference: "TRX-9876",
            entryDate: new Date(
                Date.now() - 12 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "8700",
            remainingAmount: "0",
            status: "COMPLETED",
        },
        {
            id: "chq-3",
            entryType: "CHEQUE",
            transactionType: "CHEQUE_RETURN",
            description: "Returned Cheque",
            party: "Wholesale Buyer - Manual Input",
            reference: "CHQ-9999",
            entryDate: new Date(
                Date.now() - 22 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() - 18 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "22000",
            remainingAmount: "22000",
            status: "BOUNCED",
        },
    ];
}
