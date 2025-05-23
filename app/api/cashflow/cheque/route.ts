import { NextRequest, NextResponse } from "next/server";

import { ChequeStatus } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/cashflow/cheque - Get all cheque transactions with filtering options
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") as ChequeStatus | null;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Build the query filter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = {};

        if (status) {
            whereClause.chequeStatus = status;
        }

        if (startDate || endDate) {
            whereClause.issueDate = {};

            if (startDate) {
                whereClause.issueDate.gte = new Date(startDate);
            }

            if (endDate) {
                whereClause.issueDate.lte = new Date(endDate);
            }
        }

        // Fetch cheque transactions with their related payments
        const [cheques, totalCount] = await Promise.all([
            db.chequeTransaction.findMany({
                where: whereClause,
                include: {
                    payment: {
                        include: {
                            salesOrder: {
                                select: {
                                    orderNumber: true,
                                    customer: { select: { name: true } },
                                },
                            },
                            threadPurchase: {
                                select: {
                                    threadType: true,
                                    vendor: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    issueDate: "desc",
                },
                skip,
                take: limit,
            }),
            db.chequeTransaction.count({ where: whereClause }),
        ]);

        // Format the response
        const formattedCheques = cheques.map((cheque) => {
            const payment = cheque.payment;
            const isInflow = !!payment.salesOrder;
            const paymentSource = isInflow
                ? `Sale to ${payment.salesOrder?.customer?.name || "Unknown Customer"}`
                : `Purchase from ${payment.threadPurchase?.vendor?.name || "Unknown Vendor"}`;

            return {
                id: cheque.id,
                chequeNumber: cheque.chequeNumber,
                bank: cheque.bank,
                branch: cheque.branch,
                amount: cheque.chequeAmount.toNumber(),
                issueDate: cheque.issueDate.toISOString(),
                clearanceDate: cheque.clearanceDate?.toISOString() || null,
                status: cheque.chequeStatus,
                remarks: cheque.remarks,
                paymentId: payment.id,
                transactionType: isInflow ? "IN" : "OUT",
                paymentSource,
                description: payment.description,
                referenceNumber: payment.referenceNumber,
                relatedId: isInflow
                    ? payment.salesOrderId
                    : payment.threadPurchaseId,
                relatedIdentifier: isInflow
                    ? payment.salesOrder?.orderNumber
                    : payment.threadPurchase?.threadType,
            };
        });

        return NextResponse.json({
            success: true,
            data: formattedCheques,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching cheque transactions:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch cheque transactions",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/cashflow/cheque - Update a cheque transaction's status
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, status, clearanceDate, remarks } = body;

        if (!id || !status) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields: id and status",
                },
                { status: 400 },
            );
        }

        // Validate status values
        if (
            ![
                ChequeStatus.PENDING,
                ChequeStatus.CLEARED,
                ChequeStatus.BOUNCED,
            ].includes(status)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid status. Must be one of: PENDING, CLEARED, BOUNCED`,
                },
                { status: 400 },
            );
        }

        // Verify the cheque exists
        const existingCheque = await db.chequeTransaction.findUnique({
            where: { id: Number(id) },
            include: {
                payment: {
                    include: {
                        salesOrder: true,
                    },
                },
            },
        });

        if (!existingCheque) {
            return NextResponse.json(
                { success: false, error: "Cheque transaction not found" },
                { status: 404 },
            );
        }

        // Prepare data for the update
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
            chequeStatus: status,
        };

        // Set clearance date if status is CLEARED
        if (status === ChequeStatus.CLEARED) {
            updateData.clearanceDate = clearanceDate
                ? new Date(clearanceDate)
                : new Date();
        } else if (status === ChequeStatus.BOUNCED) {
            // If cheque bounced, remove clearance date if it exists
            updateData.clearanceDate = null;
        }

        // Add remarks if provided
        if (remarks) {
            updateData.remarks = remarks;
        }

        // Update the cheque transaction
        const updatedCheque = await db.chequeTransaction.update({
            where: { id: Number(id) },
            data: updateData,
        });

        // If the cheque was for a sales order and it bounced, also update the payment status
        if (
            status === ChequeStatus.BOUNCED &&
            existingCheque.payment.salesOrderId
        ) {
            await db.salesOrder.update({
                where: { id: existingCheque.payment.salesOrderId },
                data: {
                    paymentStatus: "PENDING",
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: updatedCheque.id,
                chequeNumber: updatedCheque.chequeNumber,
                bank: updatedCheque.bank,
                status: updatedCheque.chequeStatus,
                clearanceDate:
                    updatedCheque.clearanceDate?.toISOString() || null,
                remarks: updatedCheque.remarks,
            },
        });
    } catch (error) {
        console.error("Error updating cheque transaction:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to update cheque transaction",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
