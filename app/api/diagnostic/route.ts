import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * Diagnostic API endpoint to check database constraints
 * This is used to debug foreign key constraint issues
 */
export async function GET() {
    try {
        // Get counts of key tables
        const threadPurchasesCount = await db.threadPurchase.count();
        const fabricProductionsCount = await db.fabricProduction.count();
        const salesOrdersCount = await db.salesOrder.count();
        const inventoryCount = await db.inventory.count();

        // Get the first few records from each table
        const threadPurchases = await db.threadPurchase.findMany({
            take: 5,
            orderBy: { id: "asc" },
            select: { id: true, threadType: true, colorStatus: true },
        });

        const fabricProductions = await db.fabricProduction.findMany({
            take: 5,
            orderBy: { id: "asc" },
            select: { id: true, fabricType: true },
        });

        // Check for cross-references in sales orders
        const threadSalesCount = await db.salesOrder.count({
            where: { productType: "THREAD" },
        });

        const fabricSalesCount = await db.salesOrder.count({
            where: { productType: "FABRIC" },
        });

        // Get sales orders with info about product IDs
        const salesOrders = await db.salesOrder.findMany({
            take: 5,
            orderBy: { id: "asc" },
            select: {
                id: true,
                productType: true,
                productId: true,
                orderNumber: true,
            },
        });

        // Check if there are any thread purchases with IDs matching fabric productions
        // This would help identify potential constraint issues
        let conflictingIds: number[] = [];
        if (threadPurchases.length > 0 && fabricProductions.length > 0) {
            const threadIds = threadPurchases.map((t) => t.id);
            const fabricIds = fabricProductions.map((f) => f.id);

            conflictingIds = threadIds.filter((id) => fabricIds.includes(id));
        }

        // Create a diagnostic report
        const diagnosticData = {
            counts: {
                threadPurchases: threadPurchasesCount,
                fabricProductions: fabricProductionsCount,
                salesOrders: salesOrdersCount,
                inventory: inventoryCount,
                threadSales: threadSalesCount,
                fabricSales: fabricSalesCount,
            },
            samples: {
                threadPurchases,
                fabricProductions,
                salesOrders,
            },
            analysis: {
                hasFabricProductions: fabricProductionsCount > 0,
                hasThreadPurchases: threadPurchasesCount > 0,
                conflictingIds,
                constraintIssuesPossible: fabricProductionsCount === 0,
            },
            recommendation:
                fabricProductionsCount === 0
                    ? "You need to create at least one fabric production record to resolve the FabricSalesFK constraint issue"
                    : "Database appears to have the necessary records to satisfy constraints",
        };

        return NextResponse.json(diagnosticData);
    } catch (error) {
        console.error("Diagnostic error:", error);
        return NextResponse.json(
            {
                error: "Failed to run diagnostics",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
