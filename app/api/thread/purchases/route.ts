import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

// GET handler to fetch thread purchases
export async function GET(req: NextRequest) {
    try {
        // Get query parameters
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get("id");

        // If ID is provided, fetch specific thread purchase
        if (id) {
            const numericId = parseInt(id);

            if (isNaN(numericId)) {
                return NextResponse.json(
                    {
                        error: "Invalid thread purchase ID. Must be a valid number.",
                    },
                    { status: 400 },
                );
            }

            // Try to fetch the thread purchase
            const threadPurchase = await db.threadPurchase.findUnique({
                where: { id: numericId },
                include: {
                    vendor: true,
                },
            });

            if (!threadPurchase) {
                // If not found by direct id, try looking up through inventory
                const inventoryItem = await db.inventory.findUnique({
                    where: { id: numericId },
                    include: {
                        transactions: {
                            where: {
                                threadPurchaseId: { not: null },
                            },
                            take: 1,
                            orderBy: {
                                transactionDate: "desc",
                            },
                        },
                    },
                });

                // If we found an inventory item with related thread purchase transaction
                if (
                    inventoryItem &&
                    inventoryItem.transactions.length > 0 &&
                    inventoryItem.transactions[0].threadPurchaseId
                ) {
                    const relatedThreadId =
                        inventoryItem.transactions[0].threadPurchaseId;

                    // Fetch the related thread purchase
                    const relatedThreadPurchase =
                        await db.threadPurchase.findUnique({
                            where: { id: relatedThreadId },
                            include: {
                                vendor: true,
                            },
                        });

                    if (relatedThreadPurchase) {
                        return NextResponse.json([relatedThreadPurchase]);
                    }
                }

                return NextResponse.json(
                    {
                        success: false,
                        error: `No thread purchase found with ID: ${id}. The thread may have been deleted.`,
                    },
                    { status: 404 },
                );
            }

            return NextResponse.json([threadPurchase]);
        }

        // Otherwise, fetch all thread purchases with pagination
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const threadPurchases = await db.threadPurchase.findMany({
            skip,
            take: limit,
            orderBy: {
                orderDate: "desc",
            },
            include: {
                vendor: true,
            },
        });

        const total = await db.threadPurchase.count();

        return NextResponse.json({
            data: threadPurchases,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching thread purchases:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread purchases" },
            { status: 500 },
        );
    }
}
