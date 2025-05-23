import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * GET /api/inventory/transactions/all - Get all transactions for verifying import status
 */
export async function GET() {
    try {
        // This is an internal API to get all transactions with source references
        // to determine what items have already been imported

        // Limit to only the fields we need to check imported status
        const transactions = await db.inventoryTransaction.findMany({
            select: {
                id: true,
                inventoryId: true,
                transactionType: true,
                threadPurchaseId: true,
                dyeingProcessId: true,
                fabricProductionId: true,
                salesOrderId: true,
            },
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Error fetching all inventory transactions:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch all inventory transactions",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
