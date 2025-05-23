import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * POST handler for bulk deletion of thread purchases
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
            return NextResponse.json(
                { error: "No thread purchase IDs provided" },
                { status: 400 },
            );
        }

        // Convert string IDs to numbers
        const ids = body.ids.map((id: string) => parseInt(id));

        // Check if any of the thread purchases have fabric productions
        const threadsWithFabricProductions = await db.fabricProduction.count({
            where: {
                sourceThreadId: {
                    in: ids,
                },
            },
        });

        if (threadsWithFabricProductions > 0) {
            return NextResponse.json(
                {
                    error: "Cannot delete thread purchases that have been used in fabric production",
                    count: threadsWithFabricProductions,
                },
                { status: 400 },
            );
        }

        // First, delete any related dyeing processes
        await db.dyeingProcess.deleteMany({
            where: {
                threadPurchaseId: {
                    in: ids,
                },
            },
        });

        // Delete related payment transactions
        await db.payment.deleteMany({
            where: {
                threadPurchaseId: {
                    in: ids,
                },
            },
        });

        // Delete related inventory transactions
        await db.inventoryTransaction.deleteMany({
            where: {
                threadPurchaseId: {
                    in: ids,
                },
            },
        });

        // Finally, delete the thread purchases
        const result = await db.threadPurchase.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });

        return NextResponse.json({
            success: true,
            deleted: result.count,
        });
    } catch (error) {
        console.error("Error performing bulk operation:", error);
        return NextResponse.json(
            {
                error: "Failed to perform bulk operation",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
