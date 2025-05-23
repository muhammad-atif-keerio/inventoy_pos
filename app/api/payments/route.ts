import { NextRequest, NextResponse } from "next/server";

import { PaymentMode, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        // Get query parameters
        const searchParams = req.nextUrl.searchParams;
        const mode = searchParams.get("mode") as PaymentMode | null;
        const salesOrderId = searchParams.get("salesOrderId")
            ? parseInt(searchParams.get("salesOrderId")!)
            : null;
        const threadPurchaseId = searchParams.get("threadPurchaseId")
            ? parseInt(searchParams.get("threadPurchaseId")!)
            : null;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const limit = searchParams.get("limit")
            ? parseInt(searchParams.get("limit")!)
            : undefined;
        const offset = searchParams.get("offset")
            ? parseInt(searchParams.get("offset")!)
            : undefined;

        // Build the query filters
        const whereClause: Prisma.PaymentWhereInput = {};

        if (mode) {
            whereClause.mode = mode;
        }

        if (salesOrderId) {
            whereClause.salesOrderId = salesOrderId;
        }

        if (threadPurchaseId) {
            whereClause.threadPurchaseId = threadPurchaseId;
        }

        // Handle date range
        if (startDate || endDate) {
            whereClause.transactionDate = {};

            if (startDate) {
                whereClause.transactionDate = {
                    ...(whereClause.transactionDate as Prisma.DateTimeFilter),
                    gte: new Date(startDate),
                };
            }

            if (endDate) {
                whereClause.transactionDate = {
                    ...(whereClause.transactionDate as Prisma.DateTimeFilter),
                    lte: new Date(endDate),
                };
            }
        }

        // Fetch payments with related data
        const payments = await db.payment.findMany({
            where: whereClause,
            include: {
                salesOrder: {
                    select: {
                        id: true,
                        orderNumber: true,
                        orderDate: true,
                        customer: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        totalSale: true,
                    },
                },
                threadPurchase: {
                    select: {
                        id: true,
                        orderDate: true,
                        vendor: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        totalCost: true,
                    },
                },
                chequeTransaction: true,
            },
            orderBy: {
                transactionDate: "desc",
            },
            take: limit,
            skip: offset,
        });

        // Count total records for pagination
        const totalCount = await db.payment.count({
            where: whereClause,
        });

        // Return the payments with pagination info
        return NextResponse.json({
            data: payments,
            meta: {
                total: totalCount,
                page: offset ? Math.floor(offset / (limit || 10)) + 1 : 1,
                limit: limit || 10,
            },
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json(
            { error: "Failed to fetch payments" },
            { status: 500 },
        );
    }
}
