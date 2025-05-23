import { NextResponse } from "next/server";

import { ChequeStatus, PaymentMode, TransactionType } from "@prisma/client";

import { db } from "@/lib/db";

// POST /api/cashflow/record - Record a new cashflow entry
export async function POST(req: Request) {
    try {
        // Parse the request body
        const body = await req.json();

        // Extract and validate required fields
        const {
            transactionType,
            amount,
            mode,
            salesOrderId,
            threadPurchaseId,
            description,
            referenceNumber,
            remarks,
            chequeDetails,
        } = body;

        // Basic validation for required fields
        if (!transactionType || !amount || !mode || !description) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields: transactionType, amount, mode, and description are required",
                },
                { status: 400 },
            );
        }

        // Validate transaction type
        if (
            ![TransactionType.IN, TransactionType.OUT].includes(transactionType)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid transactionType. Must be one of: ${Object.values(TransactionType).join(", ")}`,
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
            ].includes(mode)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid payment mode. Must be one of: ${Object.values(PaymentMode).join(", ")}`,
                },
                { status: 400 },
            );
        }

        // Validate amount
        if (typeof amount !== "number" || amount <= 0) {
            return NextResponse.json(
                { success: false, error: "Amount must be a positive number" },
                { status: 400 },
            );
        }

        // Validate related transaction based on transaction type
        if (transactionType === TransactionType.IN && !salesOrderId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "salesOrderId is required for inflow transactions",
                },
                { status: 400 },
            );
        } else if (
            transactionType === TransactionType.OUT &&
            !threadPurchaseId
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "threadPurchaseId is required for outflow transactions",
                },
                { status: 400 },
            );
        }

        // Check for cheque details if payment mode is CHEQUE
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

        // Use a transaction to handle related records
        const result = await db.$transaction(async (tx) => {
            try {
                // Validate related entity exists
                if (salesOrderId) {
                    const salesOrder = await tx.salesOrder.findUnique({
                        where: { id: Number(salesOrderId) },
                    });

                    if (!salesOrder) {
                        return {
                            success: false,
                            error: "Related sales order not found",
                        };
                    }
                }

                if (threadPurchaseId) {
                    const threadPurchase = await tx.threadPurchase.findUnique({
                        where: { id: Number(threadPurchaseId) },
                    });

                    if (!threadPurchase) {
                        return {
                            success: false,
                            error: "Related thread purchase not found",
                        };
                    }
                }

                // Create new payment record
                const payment = await tx.payment.create({
                    data: {
                        transactionDate: body.transactionDate
                            ? new Date(body.transactionDate)
                            : new Date(),
                        amount,
                        mode,
                        salesOrderId: salesOrderId
                            ? Number(salesOrderId)
                            : null,
                        threadPurchaseId: threadPurchaseId
                            ? Number(threadPurchaseId)
                            : null,
                        referenceNumber: referenceNumber || null,
                        description,
                        remarks: remarks || null,
                    },
                });

                // Create cheque transaction if applicable
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
                            chequeStatus:
                                chequeDetails.chequeStatus ||
                                ChequeStatus.PENDING,
                            remarks: chequeDetails.remarks || null,
                        },
                    });
                }

                // Update payment status for sales order if needed
                if (salesOrderId) {
                    const salesOrder = await tx.salesOrder.findUnique({
                        where: { id: Number(salesOrderId) },
                        select: { totalSale: true, paymentStatus: true },
                    });

                    if (salesOrder) {
                        // Calculate whether payment is full or partial
                        const isPaid =
                            amount >= salesOrder.totalSale.toNumber();
                        const isPartial =
                            amount > 0 &&
                            amount < salesOrder.totalSale.toNumber();

                        // Update payment status as needed
                        if (
                            (isPaid && salesOrder.paymentStatus !== "PAID") ||
                            (isPartial &&
                                salesOrder.paymentStatus !== "PARTIAL")
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
                    success: true,
                    payment,
                    chequeTransaction,
                };
            } catch (txError) {
                return {
                    success: false,
                    error:
                        txError instanceof Error
                            ? txError.message
                            : String(txError),
                };
            }
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 },
            );
        }

        // Type guard to ensure payment exists
        if (!("payment" in result) || !result.payment) {
            return NextResponse.json(
                { success: false, error: "Failed to create payment record" },
                { status: 500 },
            );
        }

        // Return success response with created record
        return NextResponse.json({
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
                },
                chequeTransaction: result.chequeTransaction
                    ? {
                          id: result.chequeTransaction.id,
                          chequeNumber: result.chequeTransaction.chequeNumber,
                          bank: result.chequeTransaction.bank,
                          chequeStatus: result.chequeTransaction.chequeStatus,
                      }
                    : null,
            },
        });
    } catch (error) {
        console.error("Error recording cash flow:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to record cash flow",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
