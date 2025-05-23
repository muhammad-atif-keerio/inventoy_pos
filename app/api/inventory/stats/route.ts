import { NextRequest, NextResponse } from "next/server";

import { InventoryTransactionType, ProductType } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/inventory/stats - Fetch inventory statistics and analytics
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productType = searchParams.get("productType");
        const timePeriod = searchParams.get("period") || "30"; // Default to 30 days

        // Date range for transactions
        const periodDays = parseInt(timePeriod);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Build where clause for product type if specified
        const whereInventory: Record<string, unknown> = {};
        if (productType) {
            whereInventory.productType = productType as ProductType;
        }

        // Get inventory summary stats
        const inventorySummary = await db.inventory.aggregate({
            where: whereInventory,
            _count: { id: true },
            _sum: { currentQuantity: true },
        });

        // Get product type distribution
        const productTypeDistribution = await db.inventory.groupBy({
            by: ["productType"],
            _count: { id: true },
            _sum: { currentQuantity: true },
        });

        // Get low stock items count
        const lowStockItems = await db.inventory.count({
            where: {
                ...whereInventory,
                currentQuantity: { gt: 0 },
                minStockLevel: { gt: 0 },
                AND: {
                    currentQuantity: {
                        lte: db.inventory.fields.minStockLevel,
                    },
                },
            },
        });

        // Get out of stock items count
        const outOfStockItems = await db.inventory.count({
            where: {
                ...whereInventory,
                currentQuantity: { lte: 0 },
            },
        });

        // Get transaction stats for the period
        const transactionStats = await db.inventoryTransaction.groupBy({
            by: ["transactionType"],
            where: {
                transactionDate: { gte: startDate },
                inventory: whereInventory,
            },
            _count: { id: true },
            _sum: { quantity: true },
        });

        // Get top thread types
        const topThreadTypes = await db.inventory.findMany({
            where: {
                productType: ProductType.THREAD,
                ...whereInventory,
            },
            select: {
                id: true,
                threadType: {
                    select: {
                        name: true,
                    },
                },
                currentQuantity: true,
                itemCode: true,
                description: true,
            },
            orderBy: {
                currentQuantity: "desc",
            },
            take: 5,
        });

        // Get top fabric types
        const topFabricTypes = await db.inventory.findMany({
            where: {
                productType: ProductType.FABRIC,
                ...whereInventory,
            },
            select: {
                id: true,
                fabricType: {
                    select: {
                        name: true,
                    },
                },
                currentQuantity: true,
                itemCode: true,
                description: true,
            },
            orderBy: {
                currentQuantity: "desc",
            },
            take: 5,
        });

        // Get weekly transaction volume
        const today = new Date();
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 7);

        const weeklyTransactions = await db.inventoryTransaction.groupBy({
            by: ["transactionDate"],
            where: {
                transactionDate: { gte: lastWeekStart },
                inventory: whereInventory,
            },
            _count: { id: true },
            _sum: { quantity: true },
        });

        // Process weekly data into daily buckets
        const dailyTransactions: {
            [key: string]: { count: number; quantity: number };
        } = {};

        // Initialize all days with zeros
        for (let i = 0; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];
            dailyTransactions[dateStr] = { count: 0, quantity: 0 };
        }

        // Fill with actual data
        type WeeklyTransaction = {
            transactionDate: Date;
            _count: { id: number };
            _sum: { quantity: number | null };
        };

        weeklyTransactions.forEach((tx: WeeklyTransaction) => {
            const dateStr = tx.transactionDate.toISOString().split("T")[0];
            if (dailyTransactions[dateStr]) {
                dailyTransactions[dateStr] = {
                    count: tx._count.id,
                    quantity: tx._sum.quantity || 0,
                };
            }
        });

        // Format transaction stats
        type TransactionStat = {
            transactionType: InventoryTransactionType;
            _count: { id: number };
            _sum: { quantity: number | null };
        };

        const formattedTransactionStats = transactionStats.map(
            (stat: TransactionStat) => ({
                type: stat.transactionType,
                count: stat._count.id,
                quantity: stat._sum.quantity || 0,
            }),
        );

        // Format product type distribution
        type ProductTypeDist = {
            productType: ProductType;
            _count: { id: number };
            _sum: { currentQuantity: number | null };
        };

        const formattedProductTypeDistribution = productTypeDistribution.map(
            (dist: ProductTypeDist) => ({
                type: dist.productType,
                count: dist._count.id,
                quantity: dist._sum.currentQuantity || 0,
            }),
        );

        // Format top thread types
        const formattedTopThreadTypes = topThreadTypes.map((item) => ({
            id: String(item.id),
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.currentQuantity,
            typeName: item.threadType?.name || "Unknown",
        }));

        // Format top fabric types
        const formattedTopFabricTypes = topFabricTypes.map((item) => ({
            id: String(item.id),
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.currentQuantity,
            typeName: item.fabricType?.name || "Unknown",
        }));

        // Assemble and return response
        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalItems: inventorySummary._count.id || 0,
                    totalQuantity: inventorySummary._sum.currentQuantity || 0,
                    lowStockItems,
                    outOfStockItems,
                },
                distribution: {
                    byProductType: formattedProductTypeDistribution,
                },
                transactions: {
                    byType: formattedTransactionStats,
                    daily: Object.entries(dailyTransactions)
                        .map(([date, data]) => ({
                            date,
                            ...data,
                        }))
                        .sort((a, b) => a.date.localeCompare(b.date)),
                },
                topItems: {
                    threadTypes: formattedTopThreadTypes,
                    fabricTypes: formattedTopFabricTypes,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching inventory statistics:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch inventory statistics",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
