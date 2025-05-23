import { NextResponse } from "next/server";

import {
    ChequeStatus,
    InventoryTransactionType,
    PaymentStatus,
    ProductType,
    ProductionStatus,
} from "@prisma/client";
import { endOfMonth, startOfMonth } from "date-fns";

import { db } from "@/lib/db";

export async function GET(request: Request) {
    try {
        // Get optional date range from query params
        const { searchParams } = new URL(request.url);
        const dateRangeParam = searchParams.get("range") || "month"; // Options: week, month, quarter, year

        // Calculate date ranges based on the requested parameter
        const now = new Date();
        let startDate: Date;
        let endDate = now;

        switch (dateRangeParam) {
            case "week":
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case "month":
            default:
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                break;
            case "quarter":
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 3);
                break;
            case "year":
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        // Prepare previous period date range for comparison
        const previousPeriodStart = new Date(startDate);
        const previousPeriodEnd = new Date(startDate);
        previousPeriodStart.setDate(
            previousPeriodStart.getDate() -
                (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
        );

        try {
            // Parallel fetch all dashboard data
            const [
                // Inventory metrics
                inventorySummary,
                lowStockItems,
                outOfStockItems,

                // Production metrics
                pendingThreadOrders,
                ongoingDyeingProcesses,
                activeFabricProduction,

                // Sales metrics
                recentSales,
                currentPeriodSales,
                previousPeriodSales,
                salesByProductType,

                // Financial metrics
                pendingPayments,
                pendingCheques,
                cashflowSummary,

                // Top items
                topSellingItems,
                topCustomers,
            ] = await Promise.all([
                // Total inventory count and value
                db.inventory.aggregate({
                    _count: { id: true },
                    _sum: {
                        currentQuantity: true,
                        costPerUnit: true,
                        salePrice: true,
                    },
                }),

                // Low stock items
                db.inventory
                    .findMany({
                        where: {
                            currentQuantity: { gt: 0 },
                            minStockLevel: { gt: 0 },
                        },
                    })
                    .then(
                        (items) =>
                            items.filter(
                                (item) =>
                                    item.currentQuantity <= item.minStockLevel,
                            ).length,
                    ),

                // Out of stock items
                db.inventory.count({
                    where: {
                        currentQuantity: { lte: 0 },
                    },
                }),

                // Pending thread orders
                db.threadPurchase.findMany({
                    where: {
                        received: false,
                    },
                    select: {
                        id: true,
                        threadType: true,
                        quantity: true,
                        unitOfMeasure: true,
                        vendor: {
                            select: {
                                name: true,
                            },
                        },
                        orderDate: true,
                        deliveryDate: true,
                    },
                    orderBy: {
                        orderDate: "desc",
                    },
                    take: 5,
                }),

                // Ongoing dyeing processes
                db.dyeingProcess.findMany({
                    where: {
                        completionDate: null,
                    },
                    select: {
                        id: true,
                        colorName: true,
                        colorCode: true,
                        dyeQuantity: true,
                        threadPurchase: {
                            select: {
                                threadType: true,
                                vendor: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                        dyeDate: true,
                    },
                    orderBy: {
                        dyeDate: "desc",
                    },
                    take: 5,
                }),

                // Active fabric production jobs
                db.fabricProduction.findMany({
                    where: {
                        status: {
                            in: [
                                ProductionStatus.PENDING,
                                ProductionStatus.IN_PROGRESS,
                            ],
                        },
                    },
                    select: {
                        id: true,
                        fabricType: true,
                        batchNumber: true,
                        dimensions: true,
                        quantityProduced: true,
                        status: true,
                        productionDate: true,
                    },
                    orderBy: {
                        productionDate: "desc",
                    },
                    take: 5,
                }),

                // Recent sales
                db.salesOrder.findMany({
                    take: 5,
                    orderBy: {
                        orderDate: "desc",
                    },
                    include: {
                        customer: true,
                        payments: true,
                    },
                }),

                // Current period sales
                db.salesOrder.aggregate({
                    where: {
                        orderDate: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    _count: { id: true },
                    _sum: {
                        totalSale: true,
                    },
                }),

                // Previous period sales for comparison
                db.salesOrder.aggregate({
                    where: {
                        orderDate: {
                            gte: previousPeriodStart,
                            lte: previousPeriodEnd,
                        },
                    },
                    _sum: {
                        totalSale: true,
                    },
                }),

                // Sales by product type
                db.salesOrderItem.groupBy({
                    by: ["productType"],
                    where: {
                        salesOrder: {
                            orderDate: {
                                gte: startDate,
                                lte: endDate,
                            },
                        },
                    },
                    _count: { id: true },
                    _sum: {
                        subtotal: true,
                    },
                }),

                // Pending payments
                db.salesOrder.findMany({
                    where: {
                        paymentStatus: {
                            in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL],
                        },
                    },
                    select: {
                        id: true,
                        orderNumber: true,
                        orderDate: true,
                        customer: {
                            select: {
                                name: true,
                            },
                        },
                        totalSale: true,
                        payments: {
                            select: {
                                amount: true,
                            },
                        },
                    },
                    orderBy: {
                        orderDate: "desc",
                    },
                    take: 5,
                }),

                // Pending cheques
                db.chequeTransaction.findMany({
                    where: {
                        chequeStatus: ChequeStatus.PENDING,
                    },
                    select: {
                        id: true,
                        chequeNumber: true,
                        bank: true,
                        chequeAmount: true,
                        issueDate: true,
                        payment: {
                            select: {
                                salesOrder: {
                                    select: {
                                        id: true,
                                        orderNumber: true,
                                        customer: {
                                            select: {
                                                name: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        issueDate: "desc",
                    },
                    take: 5,
                }),

                // Cashflow summary for current period
                db.payment.aggregate({
                    where: {
                        transactionDate: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    _sum: {
                        amount: true,
                    },
                }),

                // Top selling items
                db.inventoryTransaction.groupBy({
                    by: ["inventoryId"],
                    where: {
                        transactionType: InventoryTransactionType.SALES,
                        transactionDate: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    _sum: {
                        quantity: true,
                    },
                    orderBy: {
                        _sum: {
                            quantity: "desc",
                        },
                    },
                    take: 5,
                }),

                // Top customers
                db.salesOrder.groupBy({
                    by: ["customerId"],
                    where: {
                        orderDate: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    _count: { id: true },
                    _sum: {
                        totalSale: true,
                    },
                    orderBy: {
                        _sum: {
                            totalSale: "desc",
                        },
                    },
                    take: 5,
                }),
            ]);

            // Get inventory details for top selling items
            const topSellingItemsDetails = await db.inventory.findMany({
                where: {
                    id: {
                        in: topSellingItems.map((item) => item.inventoryId),
                    },
                },
                select: {
                    id: true,
                    itemCode: true,
                    description: true,
                    productType: true,
                    currentQuantity: true,
                    threadType: {
                        select: {
                            name: true,
                        },
                    },
                    fabricType: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            // Get customer details for top customers
            const topCustomersDetails = await db.customer.findMany({
                where: {
                    id: {
                        in: topCustomers.map((customer) => customer.customerId),
                    },
                },
                select: {
                    id: true,
                    name: true,
                    contact: true,
                    email: true,
                },
            });

            // Calculate sales growth percentage
            const currentPeriodTotal =
                currentPeriodSales._sum.totalSale?.toNumber() || 0;
            const previousPeriodTotal =
                previousPeriodSales._sum.totalSale?.toNumber() || 0;
            const salesGrowth =
                previousPeriodTotal === 0
                    ? 100
                    : ((currentPeriodTotal - previousPeriodTotal) /
                          previousPeriodTotal) *
                      100;

            // Format inventory stock items
            const inventoryValue =
                inventorySummary._sum.costPerUnit?.toNumber() || 0;
            const potentialSalesValue =
                inventorySummary._sum.salePrice?.toNumber() || 0;

            // Format recent sales
            const formattedRecentSales = recentSales.map((sale) => ({
                id: sale.id,
                orderNumber: sale.orderNumber,
                amount: sale.totalSale.toNumber(),
                date: sale.orderDate.toISOString(),
                customer: sale.customer
                    ? {
                          id: sale.customer.id,
                          name: sale.customer.name,
                          contact: sale.customer.contact,
                      }
                    : null,
                status: sale.paymentStatus,
                paymentMode: sale.payments[0]?.mode || null,
            }));

            // Format pending payments
            const formattedPendingPayments = pendingPayments.map((order) => {
                const paidAmount = order.payments.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (sum: number, payment: any) => sum + Number(payment.amount),
                    0,
                );
                const remainingAmount = Number(order.totalSale) - paidAmount;

                return {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    date: order.orderDate.toISOString(),
                    customer: order.customer?.name || "Unknown",
                    totalAmount: order.totalSale.toNumber(),
                    paidAmount,
                    remainingAmount,
                };
            });

            // Format pending cheques
            const formattedPendingCheques = pendingCheques.map((cheque) => ({
                id: cheque.id,
                chequeNumber: cheque.chequeNumber,
                bank: cheque.bank,
                amount: cheque.chequeAmount.toNumber(),
                issueDate: cheque.issueDate.toISOString(),
                orderNumber: cheque.payment?.salesOrder?.orderNumber || null,
                customer:
                    cheque.payment?.salesOrder?.customer?.name || "Unknown",
            }));

            // Format top selling items
            const formattedTopSellingItems = topSellingItems.map((item) => {
                const details = topSellingItemsDetails.find(
                    (i) => i.id === item.inventoryId,
                );
                return {
                    id: item.inventoryId,
                    itemCode: details?.itemCode || "",
                    description: details?.description || "",
                    productType: details?.productType || "",
                    typeName:
                        details?.productType === ProductType.THREAD
                            ? details.threadType?.name
                            : details?.fabricType?.name || "",
                    quantitySold: item._sum.quantity || 0,
                    currentStock: details?.currentQuantity || 0,
                };
            });

            // Format top customers
            const formattedTopCustomers = topCustomers.map((customer) => {
                const details = topCustomersDetails.find(
                    (c) => c.id === customer.customerId,
                );
                return {
                    id: customer.customerId,
                    name: details?.name || "Unknown",
                    contact: details?.contact || "",
                    email: details?.email || "",
                    orderCount: customer._count.id,
                    totalSpent: customer._sum.totalSale?.toNumber() || 0,
                };
            });

            // Format sales by product type
            const formattedSalesByType = salesByProductType.map((item) => ({
                productType: item.productType,
                orderCount: item._count.id,
                salesAmount: item._sum.subtotal?.toNumber() || 0,
                percentage:
                    ((item._sum.subtotal?.toNumber() || 0) /
                        (currentPeriodTotal || 1)) *
                    100,
            }));

            // Return the dashboard data
            return NextResponse.json({
                success: true,
                period: {
                    range: dateRangeParam,
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                },
                inventorySummary: {
                    totalItems: inventorySummary._count.id || 0,
                    totalQuantity: inventorySummary._sum.currentQuantity || 0,
                    inventoryValue,
                    potentialSalesValue,
                    lowStockItems,
                    outOfStockItems,
                },
                productionSummary: {
                    pendingThreadOrders: pendingThreadOrders.length,
                    ongoingDyeingProcesses: ongoingDyeingProcesses.length,
                    activeFabricProduction: activeFabricProduction.length,
                    pendingThreadOrdersDetails: pendingThreadOrders.map(
                        (order) => ({
                            id: order.id,
                            threadType: order.threadType,
                            quantity: order.quantity,
                            unitOfMeasure: order.unitOfMeasure,
                            vendor: order.vendor?.name || "Unknown",
                            orderDate: order.orderDate.toISOString(),
                            deliveryDate:
                                order.deliveryDate?.toISOString() || null,
                        }),
                    ),
                    ongoingDyeingProcessesDetails: ongoingDyeingProcesses.map(
                        (process) => ({
                            id: process.id,
                            colorName: process.colorName || "",
                            colorCode: process.colorCode || "",
                            quantity: process.dyeQuantity,
                            threadType:
                                process.threadPurchase?.threadType || "",
                            vendor:
                                process.threadPurchase?.vendor?.name ||
                                "Unknown",
                            startDate: process.dyeDate.toISOString(),
                        }),
                    ),
                    activeFabricProductionDetails: activeFabricProduction.map(
                        (production) => ({
                            id: production.id,
                            fabricType: production.fabricType,
                            batchNumber: production.batchNumber,
                            dimensions: production.dimensions,
                            quantity: production.quantityProduced,
                            status: production.status,
                            startDate: production.productionDate.toISOString(),
                        }),
                    ),
                },
                salesSummary: {
                    currentPeriod: currentPeriodTotal,
                    previousPeriod: previousPeriodTotal,
                    growth: salesGrowth,
                    orderCount: currentPeriodSales._count.id || 0,
                    recentSales: formattedRecentSales,
                    salesByProductType: formattedSalesByType,
                },
                financialSummary: {
                    pendingPaymentsCount: formattedPendingPayments.length,
                    pendingPaymentsTotal: formattedPendingPayments.reduce(
                        (sum, payment) => sum + payment.remainingAmount,
                        0,
                    ),
                    pendingChequesCount: formattedPendingCheques.length,
                    pendingChequesTotal: formattedPendingCheques.reduce(
                        (sum, cheque) => sum + cheque.amount,
                        0,
                    ),
                    cashflowTotal: cashflowSummary._sum.amount?.toNumber() || 0,
                    pendingPaymentsDetails: formattedPendingPayments,
                    pendingChequesDetails: formattedPendingCheques,
                },
                topItems: {
                    sellingItems: formattedTopSellingItems,
                    customers: formattedTopCustomers,
                },
            });
        } catch (fetchError) {
            console.error(
                "Error in Promise.all for dashboard data:",
                fetchError,
            );
            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to fetch dashboard components",
                    details:
                        fetchError instanceof Error
                            ? fetchError.message
                            : String(fetchError),
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch dashboard data",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
