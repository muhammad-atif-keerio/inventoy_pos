import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

import { Decimal } from "@/types/prismaTypes";

// Interface for transaction data
interface Transaction {
    id: number;
    ledgerEntryId: number;
    amount: Decimal; // Using Decimal type
    transactionDate: Date;
    paymentMode: string;
    chequeNumber?: string | null;
    bankName?: string | null;
    referenceNumber?: string | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// GET /api/ledger/:id/transactions - Get transactions for a specific ledger entry
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        // Ensure we properly await params before accessing
        const { id: idParam } = await Promise.resolve(context.params);
        const id = parseInt(idParam);

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid ID format" },
                { status: 400 },
            );
        }

        // Check if the ledger entry exists
        const entryExists = await db.ledgerEntry.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!entryExists) {
            return NextResponse.json(
                { error: "Ledger entry not found" },
                { status: 404 },
            );
        }

        // Get all transactions for this ledger entry
        const transactions = await db.ledgerTransaction.findMany({
            where: { ledgerEntryId: id },
            orderBy: { transactionDate: "desc" },
        });

        // Format the response data
        const formattedTransactions = transactions.map((txn: Transaction) => ({
            ...txn,
            amount: txn.amount.toString(),
            transactionDate: txn.transactionDate.toISOString(),
            createdAt: txn.createdAt.toISOString(),
            updatedAt: txn.updatedAt.toISOString(),
        }));

        return NextResponse.json({
            transactions: formattedTransactions,
        });
    } catch (error) {
        console.error("Error fetching ledger transactions:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch ledger transactions",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
