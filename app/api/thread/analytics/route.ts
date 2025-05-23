/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export async function GET() {
    try {
        // Get basic order stats
        const totalOrders = await db.threadPurchase.count();

        const pendingOrders = await db.threadPurchase.count({
            where: {
                received: false,
            },
        });

        const receivedOrders = await db.threadPurchase.count({
            where: {
                received: true,
            },
        });

        const dyedThreads = await db.threadPurchase.count({
            where: {
                dyeingProcesses: {
                    some: {},
                },
            },
        });

        // Get total quantity and value
        const quantityAndValue = await db.threadPurchase.aggregate({
            _sum: {
                quantity: true,
                totalCost: true,
            },
        });

        const totalQuantity = quantityAndValue._sum.quantity || 0;
        const totalValue = Number(quantityAndValue._sum.totalCost) || 0;

        // Get orders by color status
        const ordersByColorStatus = await db.threadPurchase.groupBy({
            by: ["colorStatus"],
            _count: {
                id: true,
            },
            _sum: {
                quantity: true,
                totalCost: true,
            },
            orderBy: {
                _count: {
                    id: "desc",
                },
            },
        });

        // Format the color status data
        const formattedColorStatus = ordersByColorStatus.map((status: any) => ({
            status: status.colorStatus,
            count: status._count.id,
            quantity: status._sum.quantity || 0,
            value: Number(status._sum.totalCost) || 0,
        }));

        // Get top thread types
        const topThreadTypes = await db.threadPurchase.groupBy({
            by: ["threadType"],
            _count: {
                id: true,
            },
            _sum: {
                quantity: true,
                totalCost: true,
            },
            orderBy: {
                _sum: {
                    quantity: "desc",
                },
            },
            take: 5,
        });

        // Format thread types data
        const formattedThreadTypes = topThreadTypes.map((thread: any) => ({
            type: thread.threadType,
            orderCount: thread._count.id,
            quantity: thread._sum.quantity || 0,
            value: Number(thread._sum.totalCost) || 0,
        }));

        // Get top vendors
        const topVendors = await db.threadPurchase.groupBy({
            by: ["vendorId"],
            _count: {
                id: true,
            },
            _sum: {
                quantity: true,
                totalCost: true,
            },
            orderBy: {
                _sum: {
                    totalCost: "desc",
                },
            },
            take: 5,
        });

        // Get vendor names and format vendor data
        const vendorData = await Promise.all(
            topVendors.map(async (vendor: any) => {
                const vendorDetails = await db.vendor.findUnique({
                    where: { id: vendor.vendorId },
                    select: { id: true, name: true },
                });

                return {
                    id: vendor.vendorId,
                    name: vendorDetails?.name || `Vendor ${vendor.vendorId}`,
                    orderCount: vendor._count.id,
                    quantity: vendor._sum.quantity || 0,
                    value: Number(vendor._sum.totalCost) || 0,
                };
            }),
        );

        // Get order trends for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const ordersByMonth = await db.threadPurchase.groupBy({
            by: ["orderDate"],
            _count: {
                id: true,
            },
            _sum: {
                quantity: true,
                totalCost: true,
            },
            where: {
                orderDate: {
                    gte: sixMonthsAgo,
                },
            },
            orderBy: [
                {
                    orderDate: "asc",
                },
            ],
        });
        // Format the monthly order trends
        const formattedOrderTrends = ordersByMonth.map((month: any) => {
            try {
                // Check if month property exists before splitting
                if (!month || !month.month) {
                    // Use the orderDate if available, or create a fallback date
                    const date =
                        month && month.orderDate
                            ? new Date(month.orderDate)
                            : new Date();
                    const formattedMonth = date.toLocaleString("default", {
                        month: "short",
                        year: "numeric",
                    });

                    return {
                        month: formattedMonth,
                        count: month?._count?.id || 0,
                        quantity: month?._sum?.quantity || 0,
                        value: Number(month?._sum?.totalCost) || 0,
                    };
                }

                // Original code for when month.month exists
                const [year, monthNum] = month.month.split("-");
                const date = new Date(
                    parseInt(year),
                    parseInt(monthNum) - 1,
                    1,
                );
                const formattedMonth = date.toLocaleString("default", {
                    month: "short",
                    year: "numeric",
                });

                return {
                    month: formattedMonth,
                    count: month._count.id,
                    quantity: month._sum.quantity || 0,
                    value: Number(month._sum.totalCost) || 0,
                };
            } catch (error) {
                console.error("Error processing month data:", month, error);
                // Return a fallback object to prevent the map function from failing
                return {
                    month: "Unknown",
                    count: 0,
                    quantity: 0,
                    value: 0,
                };
            }
        });

        // Get payment metrics
        const totalPurchasedAmount = await db.threadPurchase.aggregate({
            _sum: {
                totalCost: true,
            },
        });

        const totalPaidAmount = await db.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                threadPurchaseId: {
                    not: null,
                },
            },
        });

        // Calculate payment percentage
        const totalPurchased = Number(totalPurchasedAmount._sum.totalCost) || 0;
        const totalPaid = Number(totalPaidAmount._sum.amount) || 0;
        const paymentPercentage =
            totalPurchased > 0 ? (totalPaid / totalPurchased) * 100 : 0;

        // Get payment mode distribution
        const paymentModes = await db.payment.groupBy({
            by: [Prisma.PaymentScalarFieldEnum.mode],
            _count: {
                _all: true,
            },
            _sum: {
                amount: true,
            },
            where: {
                threadPurchaseId: {
                    not: null,
                },
            },
            orderBy: {
                _sum: {
                    amount: "desc",
                },
            },
        });

        // Format payment modes
        const formattedPaymentModes = paymentModes.map((mode: any) => ({
            mode: mode.paymentMode,
            count: mode._count._all,
            amount: Number(mode._sum.amount) || 0,
        }));

        // Get color distribution
        const colorDistribution = await db.threadPurchase.groupBy({
            by: ["color", "colorStatus"],
            _count: {
                id: true,
            },
            _sum: {
                quantity: true,
            },
            orderBy: {
                _sum: {
                    quantity: "desc",
                },
            },
            take: 10,
            where: {
                color: {
                    not: null,
                },
            },
        });

        // Format color distribution
        const formattedColorDistribution = colorDistribution.map(
            (color: any) => ({
                color: color.color || "Unspecified",
                status: color.colorStatus,
                count: color._count.id,
                quantity: color._sum.quantity || 0,
            }),
        );

        // Construct the analytics payload
        const analyticsData = {
            orderStats: {
                totalOrders,
                pendingOrders,
                receivedOrders,
                dyedThreads,
                totalQuantity,
                totalValue,
            },
            ordersByColorStatus: formattedColorStatus,
            topThreadTypes: formattedThreadTypes,
            topVendors: vendorData,
            orderTrends: formattedOrderTrends,
            paymentMetrics: {
                totalPaid,
                totalPurchased,
                paymentPercentage,
                paymentModes: formattedPaymentModes,
            },
            colorDistribution: formattedColorDistribution,
        };

        return NextResponse.json(
            { success: true, data: analyticsData },
            { status: 200 },
        );
    } catch (error) {
        console.error("Error fetching thread order analytics:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch thread order analytics" },
            { status: 500 },
        );
    }
}
