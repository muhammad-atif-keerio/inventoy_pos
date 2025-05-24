/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { NextRequest, NextResponse } from "next/server";

import { PaymentMode, PaymentStatus, ProductType } from "@prisma/client";
import {
    endOfMonth,
    format,
    startOfMonth,
    subDays,
    subMonths,
    subYears,
} from "date-fns";

import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const timeRange = searchParams.get("range") || "30days";

        // Calculate date range based on the selected time range
        const endDate = new Date();
        let startDate = new Date();
        let prevPeriodStartDate = new Date();
        let prevPeriodEndDate = new Date();

        switch (timeRange) {
            case "7days":
                startDate = subDays(endDate, 7);
                prevPeriodStartDate = subDays(startDate, 7);
                prevPeriodEndDate = subDays(startDate, 1);
                break;
            case "30days":
                startDate = subDays(endDate, 30);
                prevPeriodStartDate = subDays(startDate, 30);
                prevPeriodEndDate = subDays(startDate, 1);
                break;
            case "1year":
                startDate = subYears(endDate, 1);
                prevPeriodStartDate = subYears(startDate, 1);
                prevPeriodEndDate = subDays(startDate, 1);
                break;
            default:
                startDate = subDays(endDate, 30);
                prevPeriodStartDate = subDays(startDate, 30);
                prevPeriodEndDate = subDays(startDate, 1);
        }

        // Fetch sales data from the database within the date range
        const salesOrders = await db.salesOrder.findMany({
            where: {
                orderDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                items: {
                    include: {
                        threadPurchase: {
                            select: {
                                id: true,
                                threadType: true,
                                color: true,
                                colorStatus: true,
                            },
                        },
                        fabricProduction: {
                            select: {
                                id: true,
                                fabricType: true,
                                dimensions: true,
                                batchNumber: true,
                            },
                        },
                    },
                },
                payments: {
                    include: {
                        chequeTransaction: true,
                    },
                },
            },
            orderBy: {
                orderDate: "asc",
            },
        });

        // Also get previous period orders for trend calculation
        const prevPeriodSalesOrders = await db.salesOrder.findMany({
            where: {
                orderDate: {
                    gte: prevPeriodStartDate,
                    lte: prevPeriodEndDate,
                },
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Calculate total revenue
        const totalRevenue = salesOrders.reduce(
            (sum, sale) => sum + Number(sale.totalSale),
            0,
        );

        // Calculate previous period revenue
        const prevPeriodRevenue = prevPeriodSalesOrders.reduce(
            (sum, sale) => sum + Number(sale.totalSale),
            0,
        );

        // Calculate revenue trend percentage
        let revenueTrend = 0;
        if (prevPeriodRevenue > 0) {
            revenueTrend = ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100;
        }

        // Calculate order count trend
        const totalOrders = salesOrders.length;
        const prevPeriodTotalOrders = prevPeriodSalesOrders.length;
        let orderTrend = 0;
        if (prevPeriodTotalOrders > 0) {
            orderTrend = ((totalOrders - prevPeriodTotalOrders) / prevPeriodTotalOrders) * 100;
        }

        // Calculate average order size
        const averageOrderSize =
            salesOrders.length > 0 ? totalRevenue / salesOrders.length : 0;

        // Payment distribution
        const paymentCounts = {
            [PaymentMode.CASH]: 0,
            [PaymentMode.CHEQUE]: 0,
            [PaymentMode.ONLINE]: 0,
        };

        salesOrders.forEach((sale) => {
            if (sale.paymentMode) {
                paymentCounts[sale.paymentMode]++;
            }
        });

        const paymentDistribution = Object.entries(paymentCounts)
            .filter(([_, count]) => count > 0)
            .map(([mode, count]) => ({
                mode,
                count,
            }));

        // Product type distribution
        const productTotals = {
            [ProductType.THREAD]: 0,
            [ProductType.FABRIC]: 0,
        };

        salesOrders.forEach((sale) => {
            sale.items.forEach((item) => {
                if (item.productType in productTotals) {
                    productTotals[item.productType as ProductType] += Number(
                        item.subtotal,
                    );
                }
            });
        });

        const totalSales = Object.values(productTotals).reduce(
            (sum, value) => sum + value,
            0,
        );

        const productDistribution = Object.entries(productTotals)
            .filter(([_, value]) => value > 0)
            .map(([type, value]) => ({
                type,
                value:
                    totalSales > 0 ? Math.round((value / totalSales) * 100) : 0,
            }));

        // Calculate sales over time periods
        const salesByTimeframe = [];

        if (timeRange === "7days") {
            // For 7 days, show each day
            for (let i = 6; i >= 0; i--) {
                const day = subDays(endDate, i);
                const dayStart = new Date(day.setHours(0, 0, 0, 0));
                const dayEnd = new Date(day.setHours(23, 59, 59, 999));

                const daySales = salesOrders.filter(
                    (sale) =>
                        sale.orderDate >= dayStart && sale.orderDate <= dayEnd,
                );

                const totalDaySales = daySales.reduce(
                    (sum, sale) => sum + Number(sale.totalSale),
                    0,
                );

                salesByTimeframe.push({
                    label: format(day, "EEE"),
                    value: totalDaySales,
                });
            }
        } else if (timeRange === "30days") {
            // For 30 days, show weeks
            for (let i = 3; i >= 0; i--) {
                const weekEnd = subDays(endDate, i * 7);
                const weekStart = subDays(weekEnd, 6);

                const weekSales = salesOrders.filter(
                    (sale) =>
                        sale.orderDate >= weekStart &&
                        sale.orderDate <= weekEnd,
                );

                const totalWeekSales = weekSales.reduce(
                    (sum, sale) => sum + Number(sale.totalSale),
                    0,
                );

                salesByTimeframe.push({
                    label: `Week ${4 - i}`,
                    value: totalWeekSales,
                });
            }
        } else {
            // For 1 year, show months
            for (let i = 11; i >= 0; i--) {
                const monthEnd = endOfMonth(subMonths(endDate, i));
                const monthStart = startOfMonth(subMonths(endDate, i));

                const monthSales = salesOrders.filter(
                    (sale) =>
                        sale.orderDate >= monthStart &&
                        sale.orderDate <= monthEnd,
                );

                const totalMonthSales = monthSales.reduce(
                    (sum, sale) => sum + Number(sale.totalSale),
                    0,
                );

                salesByTimeframe.push({
                    label: format(monthStart, "MMM"),
                    value: totalMonthSales,
                });
            }
        }

        // Calculate payment status distribution
        const statusCounts = {
            [PaymentStatus.PAID]: 0,
            [PaymentStatus.PARTIAL]: 0,
            [PaymentStatus.PENDING]: 0,
            [PaymentStatus.CANCELLED]: 0,
        };

        salesOrders.forEach((sale) => {
            statusCounts[sale.paymentStatus]++;
        });

        const paymentStatusDistribution = Object.entries(statusCounts)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => ({
                status,
                count,
            }));

        // Calculate top customers
        const customerTotals = new Map<
            string,
            { total: number; count: number }
        >();

        salesOrders.forEach((sale) => {
            const customerName = sale.customer?.name || "Unknown Customer";
            const current = customerTotals.get(customerName) || {
                total: 0,
                count: 0,
            };
            customerTotals.set(customerName, {
                total: current.total + Number(sale.totalSale),
                count: current.count + 1,
            });
        });

        const topCustomers = Array.from(customerTotals.entries())
            .map(([name, data]) => ({
                name,
                total: data.total,
                count: data.count,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // Return the formatted response
        return NextResponse.json({
            success: true,
            data: {
                totalRevenue,
                totalOrders,
                averageOrderSize,
                salesByTimeframe,
                paymentDistribution,
                productDistribution,
                paymentStatusDistribution,
                topCustomers,
                revenueTrend,
                orderTrend,
            },
        });
    } catch (error) {
        console.error("Error fetching sales analytics:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch sales analytics",
            },
            { status: 500 },
        );
    }
}
