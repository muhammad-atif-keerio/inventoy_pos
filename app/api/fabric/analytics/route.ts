import { NextResponse } from "next/server";

import { ProductType, ProductionStatus } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/fabric/analytics
 * Fetch analytics for fabric production and sales
 */
export async function GET() {
    try {
        // METRIC 1: Get fabric inventory summary
        const fabricInventory = await db.inventory.aggregate({
            where: {
                productType: ProductType.FABRIC,
            },
            _sum: {
                currentQuantity: true,
            },
            _avg: {
                costPerUnit: true,
                salePrice: true,
            },
            _count: {
                id: true,
            },
        });

        // METRIC 2: Get fabric in production
        const fabricInProduction = await db.fabricProduction.aggregate({
            where: {
                status: ProductionStatus.IN_PROGRESS,
            },
            _sum: {
                quantityProduced: true,
            },
            _count: {
                id: true,
            },
        });

        // METRIC 3: Get pending fabric production
        const pendingFabricProduction = await db.fabricProduction.aggregate({
            where: {
                status: ProductionStatus.PENDING,
            },
            _sum: {
                quantityProduced: true,
            },
            _count: {
                id: true,
            },
        });

        // METRIC 4: Get completed fabric production
        const completedFabricProduction = await db.fabricProduction.aggregate({
            where: {
                status: ProductionStatus.COMPLETED,
            },
            _sum: {
                quantityProduced: true,
                threadUsed: true,
                totalCost: true,
            },
            _count: {
                id: true,
            },
        });

        // METRIC 5: Get fabric types distribution
        const fabricTypesData = await db.fabricProduction.groupBy({
            by: ["fabricType"],
            _sum: {
                quantityProduced: true,
            },
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: "desc",
                },
            },
            take: 5,
        });

        // METRIC 6: Get fabric sales data
        const fabricSales = await db.salesOrder.aggregate({
            where: {
                productType: ProductType.FABRIC,
            },
            _sum: {
                quantitySold: true,
                totalSale: true,
            },
            _count: {
                id: true,
            },
        });

        // METRIC 7: Get payment status distribution for fabric sales
        const paymentStatusData = await db.salesOrder.groupBy({
            by: ["paymentStatus"],
            where: {
                productType: ProductType.FABRIC,
            },
            _count: {
                id: true,
            },
        });

        // METRIC 8: Get monthly fabric production trends
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyProduction = await db.fabricProduction.groupBy({
            by: ["productionDate"],
            where: {
                productionDate: {
                    gte: sixMonthsAgo,
                },
                status: ProductionStatus.COMPLETED,
            },
            _sum: {
                quantityProduced: true,
            },
        });

        // Process monthly data
        const monthlyProductionMap = new Map<
            string,
            { month: string; quantity: number }
        >();
        monthlyProduction.forEach((item) => {
            const month = item.productionDate.toISOString().substring(0, 7); // Format: YYYY-MM
            const monthName = new Date(item.productionDate).toLocaleString(
                "default",
                { month: "short" },
            );
            monthlyProductionMap.set(month, {
                month: monthName,
                quantity:
                    (monthlyProductionMap.get(month)?.quantity || 0) +
                    (item._sum.quantityProduced || 0),
            });
        });

        // Convert Map to array and sort by date
        const productionTrends = Array.from(monthlyProductionMap.values()).sort(
            (a, b) => {
                const monthA = new Date(a.month + " 1, 2000").getMonth();
                const monthB = new Date(b.month + " 1, 2000").getMonth();
                return monthA - monthB;
            },
        );

        // METRIC 9: Get monthly fabric sales trends
        const monthlySales = await db.salesOrder.groupBy({
            by: ["orderDate"],
            where: {
                orderDate: {
                    gte: sixMonthsAgo,
                },
                productType: ProductType.FABRIC,
            },
            _sum: {
                quantitySold: true,
                totalSale: true,
            },
        });

        // Process monthly sales data
        const monthlySalesMap = new Map<
            string,
            { month: string; quantity: number; revenue: number }
        >();
        monthlySales.forEach((item) => {
            const month = item.orderDate.toISOString().substring(0, 7); // Format: YYYY-MM
            const monthName = new Date(item.orderDate).toLocaleString(
                "default",
                { month: "short" },
            );

            const existingData = monthlySalesMap.get(month) || {
                month: monthName,
                quantity: 0,
                revenue: 0,
            };
            monthlySalesMap.set(month, {
                month: monthName,
                quantity: existingData.quantity + (item._sum.quantitySold || 0),
                revenue:
                    existingData.revenue + Number(item._sum.totalSale || 0),
            });
        });

        // Convert sales Map to array and sort by date
        const salesTrends = Array.from(monthlySalesMap.values()).sort(
            (a, b) => {
                const monthA = new Date(a.month + " 1, 2000").getMonth();
                const monthB = new Date(b.month + " 1, 2000").getMonth();
                return monthA - monthB;
            },
        );

        // METRIC 10: Efficiency metrics - thread usage ratio
        // Lower number is better - less thread waste
        const threadUsageRatio =
            completedFabricProduction._sum.threadUsed &&
            completedFabricProduction._sum.quantityProduced
                ? Number(completedFabricProduction._sum.threadUsed) /
                  Number(completedFabricProduction._sum.quantityProduced)
                : 0;

        // METRIC 11: Average cost per meter of fabric
        const avgCostPerUnit =
            completedFabricProduction._sum.totalCost &&
            completedFabricProduction._sum.quantityProduced
                ? Number(completedFabricProduction._sum.totalCost) /
                  Number(completedFabricProduction._sum.quantityProduced)
                : 0;

        // Format the payment status distribution
        const paymentStatusDistribution = paymentStatusData.map((item) => ({
            status: item.paymentStatus,
            count: item._count.id,
        }));

        // Format the fabric types distribution
        const fabricTypesDistribution = fabricTypesData.map((item) => ({
            fabricType: item.fabricType,
            count: item._count.id,
            quantity: item._sum.quantityProduced || 0,
        }));

        // Return comprehensive analytics data
        return NextResponse.json({
            summary: {
                totalProductions:
                    (fabricInProduction._count.id || 0) +
                    (pendingFabricProduction._count.id || 0) +
                    (completedFabricProduction._count.id || 0),
                completedProductions: completedFabricProduction._count.id || 0,
                inProgressProductions: fabricInProduction._count.id || 0,
                pendingProductions: pendingFabricProduction._count.id || 0,
                totalFabricProduced:
                    completedFabricProduction._sum.quantityProduced || 0,
                totalThreadUsed: completedFabricProduction._sum.threadUsed || 0,
                totalValue: completedFabricProduction._sum.totalCost
                    ? Number(completedFabricProduction._sum.totalCost)
                    : 0,
            },
            byStatus: [
                {
                    status: "Completed",
                    count: completedFabricProduction._count.id || 0,
                },
                {
                    status: "In Progress",
                    count: fabricInProduction._count.id || 0,
                },
                {
                    status: "Pending",
                    count: pendingFabricProduction._count.id || 0,
                },
            ],
            byFabricType: fabricTypesDistribution,
            productionTimeline: productionTrends.map((item) => ({
                month: item.month,
                count: 1, // Default count, replace with actual count if available
                quantity: item.quantity,
            })),
            // Also include the original data structure for backward compatibility
            data: {
                inventorySummary: {
                    fabricInStock: fabricInventory._sum.currentQuantity || 0,
                    distinctFabricItems: fabricInventory._count.id || 0,
                    averageCostPrice: fabricInventory._avg.costPerUnit
                        ? Number(fabricInventory._avg.costPerUnit)
                        : 0,
                    averageSalePrice: fabricInventory._avg.salePrice
                        ? Number(fabricInventory._avg.salePrice)
                        : 0,
                },
                productionMetrics: {
                    inProgress: {
                        count: fabricInProduction._count.id || 0,
                        quantity: fabricInProduction._sum.quantityProduced || 0,
                    },
                    pending: {
                        count: pendingFabricProduction._count.id || 0,
                        quantity:
                            pendingFabricProduction._sum.quantityProduced || 0,
                    },
                    completed: {
                        count: completedFabricProduction._count.id || 0,
                        quantity:
                            completedFabricProduction._sum.quantityProduced ||
                            0,
                        threadUsed:
                            completedFabricProduction._sum.threadUsed || 0,
                        totalCost: completedFabricProduction._sum.totalCost
                            ? Number(completedFabricProduction._sum.totalCost)
                            : 0,
                    },
                    threadUsageRatio,
                    avgCostPerUnit,
                },
                salesMetrics: {
                    totalSales: fabricSales._count.id || 0,
                    totalQuantitySold: fabricSales._sum.quantitySold || 0,
                    totalRevenue: fabricSales._sum.totalSale
                        ? Number(fabricSales._sum.totalSale)
                        : 0,
                },
                trends: {
                    production: productionTrends,
                    sales: salesTrends,
                },
                distributions: {
                    fabricTypes: fabricTypesDistribution,
                    paymentStatus: paymentStatusDistribution,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching fabric analytics:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch fabric analytics data",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
