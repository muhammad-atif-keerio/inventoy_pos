import { NextRequest, NextResponse } from "next/server";

import {
    ChequeTransaction,
    PaymentMode,
    PaymentStatus,
    Prisma,
    ProductType,
    SalesOrder,
} from "@prisma/client";
import {
    endOfMonth,
    format,
    startOfMonth,
    subDays,
    subMonths,
    subYears,
} from "date-fns";

import { db } from "@/lib/db";

// Define specific types for item properties that may vary
interface ThreadPurchaseDetails {
    id: number;
    threadType: string;
    color: string | null;
    colorStatus: string;
}

interface FabricProductionDetails {
    id: number;
    fabricType: string;
    dimensions?: string;
    batchNumber?: string;
}

// Define extended type for orders with relations
type SalesOrderWithRelations = SalesOrder & {
    items: Array<{
        productType: ProductType;
        subtotal: Prisma.Decimal;
        threadPurchase?: ThreadPurchaseDetails | null;
        fabricProduction?: FabricProductionDetails | null;
    }>;
    payments: Array<{
        mode: PaymentMode;
        amount: Prisma.Decimal;
        chequeTransaction?: ChequeTransaction | null;
        referenceNumber?: string | null;
        description: string;
    }>;
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const timeRange = searchParams.get("range") || "30days";

        // Calculate date range based on the selected time range
        const endDate = new Date();
        let startDate = new Date();

        switch (timeRange) {
            case "7days":
                startDate = subDays(endDate, 7);
                break;
            case "30days":
                startDate = subDays(endDate, 30);
                break;
            case "1year":
                startDate = subYears(endDate, 1);
                break;
            default:
                startDate = subDays(endDate, 30);
        }

        // Fetch sales data from the database within the date range - use type assertion for our extended type
        const salesOrders = (await db.salesOrder.findMany({
            where: {
                orderDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                items: true,
                payments: {
                    include: {
                        chequeTransaction: true,
                    },
                },
            },
            orderBy: {
                orderDate: "asc",
            },
        })) as unknown as SalesOrderWithRelations[];

        // Calculate total revenue
        const totalRevenue = salesOrders.reduce(
            (sum, sale) => sum + sale.totalSale.toNumber(),
            0,
        );

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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
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

        // Process each sale's items instead of direct productType on SalesOrder
        salesOrders.forEach((sale) => {
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach((item) => {
                    if (item.productType in productTotals) {
                        productTotals[item.productType as ProductType] +=
                            item.subtotal.toNumber();
                    }
                });
            }
        });

        const totalSales = Object.values(productTotals).reduce(
            (sum, value) => sum + value,
            0,
        );

        const productDistribution = Object.entries(productTotals)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
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
                const dayEnd = new Date(
                    new Date(day).setHours(23, 59, 59, 999),
                );

                const daySales = salesOrders.filter(
                    (sale) =>
                        sale.orderDate >= dayStart && sale.orderDate <= dayEnd,
                );

                const totalDaySales = daySales.reduce(
                    (sum, sale) => sum + sale.totalSale.toNumber(),
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
                    (sum, sale) => sum + sale.totalSale.toNumber(),
                    0,
                );

                salesByTimeframe.push({
                    label: `Week ${4 - i}`,
                    value: totalWeekSales,
                });
            }
        } else if (timeRange === "1year") {
            // For 1 year, show months
            for (let i = 11; i >= 0; i--) {
                const monthDate = subMonths(endDate, i);
                const monthStart = startOfMonth(monthDate);
                const monthEnd = endOfMonth(monthDate);

                const monthSales = salesOrders.filter(
                    (sale) =>
                        sale.orderDate >= monthStart &&
                        sale.orderDate <= monthEnd,
                );

                const totalMonthSales = monthSales.reduce(
                    (sum, sale) => sum + sale.totalSale.toNumber(),
                    0,
                );

                salesByTimeframe.push({
                    label: format(monthDate, "MMM"),
                    value: totalMonthSales,
                });
            }
        }

        // Recent payment statuses
        const paymentStatuses = {
            [PaymentStatus.PAID]: 0,
            [PaymentStatus.PARTIAL]: 0,
            [PaymentStatus.PENDING]: 0,
            [PaymentStatus.CANCELLED]: 0,
        };

        salesOrders.forEach((sale) => {
            paymentStatuses[sale.paymentStatus]++;
        });

        const paymentStatusDistribution = Object.entries(paymentStatuses)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => ({
                status,
                count,
            }));

        // Top customers
        const customerSales: Record<
            number,
            { name: string; total: number; count: number }
        > = {};

        for (const sale of salesOrders) {
            const customerId = sale.customerId;
            if (!customerSales[customerId]) {
                const customer = await db.customer.findUnique({
                    where: { id: customerId },
                    select: { name: true },
                });

                customerSales[customerId] = {
                    name: customer?.name || `Customer #${customerId}`,
                    total: 0,
                    count: 0,
                };
            }

            customerSales[customerId].total += sale.totalSale.toNumber();
            customerSales[customerId].count += 1;
        }

        const topCustomers = Object.values(customerSales)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map((customer) => ({
                name: customer.name,
                total: customer.total,
                count: customer.count,
            }));

        return NextResponse.json({
            totalRevenue,
            averageOrderSize,
            salesByTimeframe,
            paymentDistribution,
            productDistribution,
            paymentStatusDistribution,
            topCustomers,
        });
    } catch (error) {
        console.error("Error generating analytics:", error);
        return NextResponse.json(
            {
                error: "Failed to generate analytics",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
