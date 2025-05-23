import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * GET /api/vendors/analytics
 * Fetch analytics for vendor data
 */
export async function GET() {
    try {
        // METRIC 1: Top vendors by purchase value
        const topVendorsByValue = await db.vendor.findMany({
            take: 5,
            include: {
                threadPurchases: {
                    select: {
                        totalCost: true,
                    },
                },
                _count: {
                    select: {
                        threadPurchases: true,
                    },
                },
            },
            orderBy: {
                threadPurchases: {
                    _count: "desc",
                },
            },
        });

        const formattedTopVendors = topVendorsByValue
            .map((vendor) => ({
                id: vendor.id,
                name: vendor.name,
                purchaseCount: vendor._count.threadPurchases,
                totalValue: vendor.threadPurchases.reduce(
                    (sum, purchase) => sum + Number(purchase.totalCost),
                    0,
                ),
            }))
            .sort((a, b) => b.totalValue - a.totalValue);

        // METRIC 2: Vendors with most orders
        const vendorsWithMostOrders = await db.vendor.findMany({
            take: 5,
            include: {
                _count: {
                    select: {
                        threadPurchases: true,
                    },
                },
            },
            orderBy: {
                threadPurchases: {
                    _count: "desc",
                },
            },
        });

        const formattedVendorsWithMostOrders = vendorsWithMostOrders.map(
            (vendor) => ({
                id: vendor.id,
                name: vendor.name,
                orderCount: vendor._count.threadPurchases,
            }),
        );

        // METRIC 3: Purchase trends over time
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const purchasesByMonth = await db.threadPurchase.groupBy({
            by: ["orderDate"],
            where: {
                orderDate: {
                    gte: sixMonthsAgo,
                },
            },
            _count: {
                id: true,
            },
            _sum: {
                totalCost: true,
            },
        });

        // Process monthly data
        const monthlyPurchaseMap = new Map<
            string,
            { month: string; count: number; value: number }
        >();
        purchasesByMonth.forEach((item) => {
            const month = item.orderDate.toISOString().substring(0, 7); // Format: YYYY-MM
            const monthName = new Date(item.orderDate).toLocaleString(
                "default",
                { month: "short" },
            );

            const existingData = monthlyPurchaseMap.get(month) || {
                month: monthName,
                count: 0,
                value: 0,
            };
            monthlyPurchaseMap.set(month, {
                month: monthName,
                count: existingData.count + item._count.id,
                value: existingData.value + Number(item._sum.totalCost || 0),
            });
        });

        // Convert Map to array and sort by date
        const purchaseTrends = Array.from(monthlyPurchaseMap.values()).sort(
            (a, b) => {
                const monthA = new Date(a.month + " 1, 2000").getMonth();
                const monthB = new Date(b.month + " 1, 2000").getMonth();
                return monthA - monthB;
            },
        );

        // METRIC 4: Payment status metrics
        const paymentStatuses = await db.payment.groupBy({
            by: ["mode"],
            _count: {
                id: true,
            },
            _sum: {
                amount: true,
            },
            where: {
                threadPurchaseId: {
                    not: null,
                },
            },
        });

        const paymentStatusData = paymentStatuses.map((item) => ({
            mode: item.mode,
            count: item._count.id,
            amount: Number(item._sum.amount || 0),
        }));

        // Calculate total payment amounts vs total purchase costs
        const totalPayments = await db.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                threadPurchaseId: {
                    not: null,
                },
            },
        });

        const totalPurchases = await db.threadPurchase.aggregate({
            _sum: {
                totalCost: true,
            },
        });

        const paymentMetrics = {
            totalPaid: Number(totalPayments._sum.amount || 0),
            totalPurchased: Number(totalPurchases._sum.totalCost || 0),
            paymentModes: paymentStatusData,
        };

        // METRIC 5: Distribution of vendors by city
        const vendorsByCity = await db.vendor.groupBy({
            by: ["city"],
            _count: {
                id: true,
            },
            where: {
                city: {
                    not: null,
                },
            },
        });

        const cityDistribution = vendorsByCity
            .filter((item) => item.city) // Filter out null cities
            .map((item) => ({
                city: item.city,
                count: item._count.id,
            }))
            .sort((a, b) => b.count - a.count);

        // METRIC 6: Overall vendor statistics
        const totalVendors = await db.vendor.count();
        const activeVendors = await db.vendor.count({
            where: {
                threadPurchases: {
                    some: {
                        orderDate: {
                            gte: sixMonthsAgo,
                        },
                    },
                },
            },
        });
        const vendorsWithPendingOrders = await db.vendor.count({
            where: {
                threadPurchases: {
                    some: {
                        received: false,
                    },
                },
            },
        });

        // Return comprehensive analytics data
        return NextResponse.json({
            success: true,
            data: {
                vendorStats: {
                    totalVendors,
                    activeVendors,
                    vendorsWithPendingOrders,
                },
                topVendorsByValue: formattedTopVendors,
                vendorsWithMostOrders: formattedVendorsWithMostOrders,
                purchaseTrends,
                paymentMetrics,
                cityDistribution,
            },
        });
    } catch (error) {
        console.error("Error fetching vendor analytics:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch vendor analytics data",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
