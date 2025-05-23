import { NextRequest, NextResponse } from "next/server";

import { PaymentMode } from "@prisma/client";

import { db } from "@/lib/db";

// Define types for the analytics data
interface DailyCashflow {
    inflow: number;
    outflow: number;
    net: number;
    date: string;
    balance?: number;
}

interface PaymentModeData {
    count: number;
    amount: number;
}

interface ProductTypeData {
    count: number;
    amount: number;
}

/**
 * GET /api/cashflow/analytics - Get analytics data for cashflow
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period") || "30"; // Default to last 30 days
        const periodDays = parseInt(period);

        if (isNaN(periodDays) || periodDays <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid period. Must be a positive number.",
                },
                { status: 400 },
            );
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Get all payments within the period
        const payments = await db.payment.findMany({
            where: {
                transactionDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                salesOrder: {
                    select: {
                        id: true,
                        productType: true,
                    },
                },
                threadPurchase: {
                    select: {
                        id: true,
                    },
                },
                chequeTransaction: {
                    select: {
                        chequeStatus: true,
                        chequeAmount: true,
                    },
                },
            },
            orderBy: {
                transactionDate: "asc",
            },
        });

        // Calculate summaries
        const totalInflow = payments
            .filter((p) => p.salesOrder)
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const totalOutflow = payments
            .filter((p) => p.threadPurchase)
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const netCashflow = totalInflow - totalOutflow;

        // Group by payment mode
        const paymentsByMode: Record<PaymentMode, PaymentModeData> = {
            [PaymentMode.CASH]: { count: 0, amount: 0 },
            [PaymentMode.CHEQUE]: { count: 0, amount: 0 },
            [PaymentMode.ONLINE]: { count: 0, amount: 0 },
        };

        payments.forEach((payment) => {
            if (!paymentsByMode[payment.mode]) {
                paymentsByMode[payment.mode] = { count: 0, amount: 0 };
            }

            paymentsByMode[payment.mode].count++;
            paymentsByMode[payment.mode].amount += Number(payment.amount);
        });

        // Cheque status breakdown
        const chequeStatusCount = {
            PENDING: 0,
            CLEARED: 0,
            BOUNCED: 0,
        };

        const chequePayments = payments.filter(
            (p) => p.mode === PaymentMode.CHEQUE && p.chequeTransaction,
        );
        chequePayments.forEach((payment) => {
            if (payment.chequeTransaction?.chequeStatus) {
                chequeStatusCount[payment.chequeTransaction.chequeStatus]++;
            }
        });

        // Create daily cashflow time series data
        const dailyCashflow: Record<string, DailyCashflow> = {};
        const daysInPeriod = Math.min(periodDays, 90); // Cap at 90 days to prevent excessive data

        // Initialize all days with zeros
        for (let i = 0; i < daysInPeriod; i++) {
            const date = new Date(endDate);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split("T")[0];

            dailyCashflow[dateString] = {
                inflow: 0,
                outflow: 0,
                net: 0,
                date: dateString,
            };
        }

        // Fill with actual data
        payments.forEach((payment) => {
            const dateString = payment.transactionDate
                .toISOString()
                .split("T")[0];
            if (dailyCashflow[dateString]) {
                if (payment.salesOrder) {
                    dailyCashflow[dateString].inflow += Number(payment.amount);
                } else if (payment.threadPurchase) {
                    dailyCashflow[dateString].outflow += Number(payment.amount);
                }

                dailyCashflow[dateString].net =
                    dailyCashflow[dateString].inflow -
                    dailyCashflow[dateString].outflow;
            }
        });

        // Convert to array and sort by date
        const timeSeriesData = Object.values(dailyCashflow).sort((a, b) =>
            a.date.localeCompare(b.date),
        );

        // Calculate running balance
        let runningBalance = 0;
        const balanceTimeSeries = timeSeriesData.map((day) => {
            runningBalance += day.net;
            return {
                ...day,
                balance: runningBalance,
            };
        });

        // Calculate top sales by product type
        const salesByProductType: Record<string, ProductTypeData> = {};

        payments.forEach((payment) => {
            if (payment.salesOrder) {
                const productType = payment.salesOrder.productType;
                if (!salesByProductType[productType]) {
                    salesByProductType[productType] = { count: 0, amount: 0 };
                }

                salesByProductType[productType].count++;
                salesByProductType[productType].amount += Number(
                    payment.amount,
                );
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                periodDays,
                summary: {
                    totalInflow,
                    totalOutflow,
                    netCashflow,
                    totalTransactions: payments.length,
                },
                paymentMethods: Object.entries(paymentsByMode).map(
                    ([mode, data]) => ({
                        mode,
                        count: data.count,
                        amount: data.amount,
                        percentage:
                            payments.length > 0
                                ? (data.count / payments.length) * 100
                                : 0,
                    }),
                ),
                chequeStatus: Object.entries(chequeStatusCount).map(
                    ([status, count]) => ({
                        status,
                        count,
                        percentage:
                            chequePayments.length > 0
                                ? (count / chequePayments.length) * 100
                                : 0,
                    }),
                ),
                salesByProductType: Object.entries(salesByProductType).map(
                    ([type, data]) => ({
                        productType: type,
                        count: data.count,
                        amount: data.amount,
                    }),
                ),
                timeSeries: balanceTimeSeries,
            },
        });
    } catch (error) {
        console.error("Error retrieving cashflow analytics:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to retrieve cashflow analytics",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
