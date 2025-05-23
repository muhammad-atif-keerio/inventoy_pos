import { NextRequest, NextResponse } from "next/server";

import { PaymentMode, Prisma, TransactionType } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/cashflow - Retrieve cashflow data with optional filtering
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Get query parameters
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const mode = searchParams.get("mode") as PaymentMode | null;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Build the where clause for filtering
        const whereClause: Prisma.PaymentWhereInput = {};

        // Filter by date range
        if (startDate || endDate) {
            whereClause.transactionDate = {};

            if (startDate) {
                whereClause.transactionDate.gte = new Date(startDate);
            }

            if (endDate) {
                whereClause.transactionDate.lte = new Date(endDate);
            }
        }

        // Filter by payment mode
        if (mode) {
            whereClause.mode = mode;
        }

        // Get payments with pagination and related data
        const [payments, totalCount] = await Promise.all([
            db.payment.findMany({
                where: whereClause,
                include: {
                    salesOrder: {
                        select: {
                            orderNumber: true,
                            customer: { select: { name: true } },
                            productType: true,
                            totalSale: true,
                        },
                    },
                    threadPurchase: {
                        select: {
                            reference: true,
                            vendor: { select: { name: true } },
                            threadType: true,
                            totalCost: true,
                        },
                    },
                    chequeTransaction: true,
                },
                orderBy: {
                    transactionDate: "desc",
                },
                skip,
                take: limit,
            }),
            db.payment.count({ where: whereClause }),
        ]);

        // Format the response
        const formattedPayments = payments.map((payment) => {
            // Determine transaction type based on what's associated
            const isInflow = !!payment.salesOrder;
            const transactionType = isInflow
                ? TransactionType.IN
                : TransactionType.OUT;

            return {
                id: payment.id,
                transactionDate: payment.transactionDate.toISOString(),
                amount: payment.amount.toNumber(),
                mode: payment.mode,
                transactionType,
                referenceNumber: payment.referenceNumber,
                description: payment.description,
                remarks: payment.remarks,
                createdAt: payment.createdAt.toISOString(),
                updatedAt: payment.updatedAt.toISOString(),

                // Sales order details (inflow)
                salesOrder: payment.salesOrder
                    ? {
                          id: payment.salesOrderId,
                          orderNumber: payment.salesOrder.orderNumber,
                          customerName: payment.salesOrder.customer?.name,
                          productType: payment.salesOrder.productType,
                          totalAmount: payment.salesOrder.totalSale.toNumber(),
                      }
                    : null,

                // Thread purchase details (outflow)
                threadPurchase: payment.threadPurchase
                    ? {
                          id: payment.threadPurchaseId,
                          reference: payment.threadPurchase.reference,
                          vendorName: payment.threadPurchase.vendor?.name,
                          threadType: payment.threadPurchase.threadType,
                          totalAmount:
                              payment.threadPurchase.totalCost.toNumber(),
                      }
                    : null,

                // Cheque details if applicable
                chequeDetails: payment.chequeTransaction
                    ? {
                          id: payment.chequeTransaction.id,
                          chequeNumber: payment.chequeTransaction.chequeNumber,
                          bank: payment.chequeTransaction.bank,
                          branch: payment.chequeTransaction.branch,
                          chequeAmount:
                              payment.chequeTransaction.chequeAmount.toNumber(),
                          issueDate:
                              payment.chequeTransaction.issueDate.toISOString(),
                          clearanceDate:
                              payment.chequeTransaction.clearanceDate?.toISOString(),
                          chequeStatus: payment.chequeTransaction.chequeStatus,
                      }
                    : null,
            };
        });

        // Calculate summary of inflows and outflows
        const inflows = formattedPayments.filter(
            (p) => p.transactionType === TransactionType.IN,
        );
        const outflows = formattedPayments.filter(
            (p) => p.transactionType === TransactionType.OUT,
        );

        const totalInflow = inflows.reduce((sum, p) => sum + p.amount, 0);
        const totalOutflow = outflows.reduce((sum, p) => sum + p.amount, 0);
        const netCashflow = totalInflow - totalOutflow;

        return NextResponse.json({
            success: true,
            data: {
                transactions: formattedPayments,
                summary: {
                    totalInflow,
                    totalOutflow,
                    netCashflow,
                },
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                },
            },
        });
    } catch (error) {
        console.error("Error fetching cashflow data:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch cashflow data",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/cashflow - Create a new cashflow record (payment)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Extract required fields
        const {
            amount,
            mode,
            transactionType,
            description,
            referenceNumber,
            remarks,
            salesOrderId,
            threadPurchaseId,
            chequeDetails,
        } = body;

        // Validate required fields
        if (!amount || !mode || !description) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields: amount, mode, and description are required",
                },
                { status: 400 },
            );
        }

        // Validate transaction type
        if (
            transactionType &&
            ![TransactionType.IN, TransactionType.OUT].includes(transactionType)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid transactionType. Must be IN or OUT`,
                },
                { status: 400 },
            );
        }

        // Validate payment mode
        if (
            ![
                PaymentMode.CASH,
                PaymentMode.CHEQUE,
                PaymentMode.ONLINE,
            ].includes(mode as PaymentMode)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid payment mode. Must be CASH, CHEQUE, or ONLINE`,
                },
                { status: 400 },
            );
        }

        // Validate amount
        if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
            return NextResponse.json(
                { success: false, error: "Amount must be a positive number" },
                { status: 400 },
            );
        }

        // Validate relatedTransactionId based on transaction type
        if (transactionType === TransactionType.IN && !salesOrderId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "salesOrderId is required for inflow transactions",
                },
                { status: 400 },
            );
        }

        if (transactionType === TransactionType.OUT && !threadPurchaseId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "threadPurchaseId is required for outflow transactions",
                },
                { status: 400 },
            );
        }

        // Check that we have the right cheque details if mode is CHEQUE
        if (
            mode === PaymentMode.CHEQUE &&
            (!chequeDetails ||
                !chequeDetails.chequeNumber ||
                !chequeDetails.bank)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cheque details (chequeNumber and bank) are required for cheque payments",
                },
                { status: 400 },
            );
        }

        // Use a transaction to create payment and cheque details if necessary
        const result = await db.$transaction(async (tx) => {
            // Create payment record
            const payment = await tx.payment.create({
                data: {
                    transactionDate: body.transactionDate
                        ? new Date(body.transactionDate)
                        : new Date(),
                    amount: amount,
                    mode: mode as PaymentMode,
                    salesOrderId: salesOrderId || null,
                    threadPurchaseId: threadPurchaseId || null,
                    referenceNumber: referenceNumber || null,
                    description: description,
                    remarks: remarks || null,
                },
            });

            // Create cheque transaction if payment mode is CHEQUE
            let chequeTransaction = null;
            if (mode === PaymentMode.CHEQUE && chequeDetails) {
                chequeTransaction = await tx.chequeTransaction.create({
                    data: {
                        paymentId: payment.id,
                        chequeNumber: chequeDetails.chequeNumber,
                        bank: chequeDetails.bank,
                        branch: chequeDetails.branch || null,
                        chequeAmount: amount,
                        issueDate: new Date(),
                        clearanceDate: chequeDetails.clearanceDate
                            ? new Date(chequeDetails.clearanceDate)
                            : null,
                        chequeStatus: chequeDetails.chequeStatus || "PENDING",
                        remarks: chequeDetails.remarks || null,
                    },
                });
            }

            // If this is a payment for a sales order, update the payment status
            if (salesOrderId) {
                const salesOrder = await tx.salesOrder.findUnique({
                    where: { id: Number(salesOrderId) },
                    select: { totalSale: true, paymentStatus: true },
                });

                if (salesOrder) {
                    // Check if payment amount equals or exceeds the total sale amount
                    const isPaid = amount >= salesOrder.totalSale.toNumber();
                    const isPartial =
                        amount > 0 && amount < salesOrder.totalSale.toNumber();

                    // Update the payment status if needed
                    if (
                        (isPaid && salesOrder.paymentStatus !== "PAID") ||
                        (isPartial && salesOrder.paymentStatus !== "PARTIAL")
                    ) {
                        await tx.salesOrder.update({
                            where: { id: Number(salesOrderId) },
                            data: {
                                paymentStatus: isPaid ? "PAID" : "PARTIAL",
                            },
                        });
                    }
                }
            }

            return {
                payment,
                chequeTransaction,
            };
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    payment: {
                        id: result.payment.id,
                        transactionDate:
                            result.payment.transactionDate.toISOString(),
                        amount: result.payment.amount.toNumber(),
                        mode: result.payment.mode,
                        referenceNumber: result.payment.referenceNumber,
                        description: result.payment.description,
                        remarks: result.payment.remarks,
                    },
                    chequeTransaction: result.chequeTransaction
                        ? {
                              id: result.chequeTransaction.id,
                              chequeNumber:
                                  result.chequeTransaction.chequeNumber,
                              bank: result.chequeTransaction.bank,
                              chequeStatus:
                                  result.chequeTransaction.chequeStatus,
                          }
                        : null,
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating cashflow record:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to create cashflow record",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
