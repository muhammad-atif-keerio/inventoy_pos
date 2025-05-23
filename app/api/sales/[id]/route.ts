import { NextRequest, NextResponse } from "next/server";

import {
    ChequeStatus,
    ColorStatus,
    PaymentMode,
    PaymentStatus,
    Prisma,
} from "@prisma/client";

import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";

// Define types for sales order items
interface SalesOrderItem {
    id: number;
    salesOrderId: number;
    productType: string;
    productId: number;
    quantitySold: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
    subtotal: number;
    inventoryItemId?: number;
}

interface EnhancedOrderItem extends SalesOrderItem {
    productDetails?: {
        name?: string;
        threadType?: string;
        fabricType?: string;
        color?: string | null;
        colorStatus?: ColorStatus | string;
        dimensions?: string;
    } | null;
    inventoryDetails?: {
        itemCode?: string;
        description?: string;
        unitOfMeasure?: string;
    } | null;
}

// GET /api/sales/[id] - Get a sales order by ID
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;
        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid sales order ID" },
                { status: 400 },
            );
        }

        try {
            // Get the sales order from the database
            const salesOrderResult = await db.salesOrder.findUnique({
                where: { id: Number(id) },
                include: {
                    customer: true,
                    payments: {
                        include: {
                            chequeTransaction: true,
                        },
                    },
                    items: true,
                },
            });

            if (!salesOrderResult) {
                return NextResponse.json(
                    { error: "Sales order not found" },
                    { status: 404 },
                );
            }

            // Get related inventory transactions
            const inventoryTransactions =
                await db.inventoryTransaction.findMany({
                    where: { salesOrderId: Number(id) },
                    include: {
                        inventory: true,
                    },
                });

            // Build the complete sales order with full relations
            const salesOrder = {
                ...salesOrderResult,
                inventoryTransactions,
            };

            // Fetch SalesOrderItems using raw query since it might not be in prisma schema yet
            const orderItems: SalesOrderItem[] = await prisma.$queryRaw`
                SELECT * FROM "SalesOrderItem" WHERE "salesOrderId" = ${Number(id)}
            `;

            // If the sales order has items, also fetch product details
            let enhancedItems: EnhancedOrderItem[] = [];
            if (orderItems && orderItems.length > 0) {
                enhancedItems = await Promise.all(
                    orderItems.map(async (item: SalesOrderItem) => {
                        let productDetails = null;

                        if (item.productType === "THREAD") {
                            const threadPurchase =
                                await prisma.threadPurchase.findUnique({
                                    where: { id: item.productId },
                                    select: {
                                        threadType: true,
                                        color: true,
                                        colorStatus: true,
                                    },
                                });
                            if (threadPurchase) {
                                productDetails = {
                                    name: `${threadPurchase.threadType} - ${threadPurchase.color || "No Color"}`,
                                    ...threadPurchase,
                                };
                            }
                        } else if (item.productType === "FABRIC") {
                            const fabricProduction =
                                await prisma.fabricProduction.findUnique({
                                    where: { id: item.productId },
                                    select: {
                                        fabricType: true,
                                        dimensions: true,
                                    },
                                });
                            if (fabricProduction) {
                                productDetails = {
                                    name: `${fabricProduction.fabricType} - ${fabricProduction.dimensions || "No Dimensions"}`,
                                    ...fabricProduction,
                                };
                            }
                        }

                        // Get inventory details if available
                        let inventoryDetails = null;
                        if (item.inventoryItemId) {
                            inventoryDetails =
                                await prisma.inventory.findUnique({
                                    where: { id: item.inventoryItemId },
                                    select: {
                                        itemCode: true,
                                        description: true,
                                        unitOfMeasure: true,
                                    },
                                });
                        }

                        return {
                            ...item,
                            productDetails,
                            inventoryDetails,
                        } as EnhancedOrderItem;
                    }),
                );
            }

            // Format response
            const formattedSalesOrder = {
                ...salesOrder,
                // Format decimal values
                discount: salesOrder.discount?.toNumber() || null,
                tax: salesOrder.tax?.toNumber() || null,
                totalSale: salesOrder.totalSale.toNumber(),
                // Add individual customer fields for easy access in the invoice
                customerName: salesOrderResult.customer?.name || "Unknown",
                customerPhone: salesOrderResult.customer?.contact || "Unknown",
                customerEmail: salesOrderResult.customer?.email || null,
                customerAddress: salesOrderResult.customer?.address || null,
                customerCity: salesOrderResult.customer?.city || null,
                customerNotes: salesOrderResult.customer?.notes || null,
                // Full customer object with proper format
                customer: salesOrderResult.customer
                    ? {
                          ...salesOrderResult.customer,
                          createdAt:
                              salesOrderResult.customer.createdAt.toISOString(),
                          updatedAt:
                              salesOrderResult.customer.updatedAt.toISOString(),
                      }
                    : null,
                // Add items to the response
                items: enhancedItems,
                // Format payment values
                payments: salesOrder.payments.map((payment) => ({
                    ...payment,
                    amount:
                        typeof payment.amount === "number"
                            ? payment.amount
                            : payment.amount.toNumber(),
                    chequeTransaction: payment.chequeTransaction
                        ? {
                              ...payment.chequeTransaction,
                              chequeAmount:
                                  typeof payment.chequeTransaction
                                      .chequeAmount === "number"
                                      ? payment.chequeTransaction.chequeAmount
                                      : (
                                            payment.chequeTransaction
                                                .chequeAmount as Prisma.Decimal
                                        ).toNumber(),
                          }
                        : null,
                })),
            };

            return NextResponse.json(formattedSalesOrder);
        } catch (error) {
            console.error("Database connection error:", error);
            if (
                error instanceof Error &&
                error.message.includes("Can't reach database server")
            ) {
                return NextResponse.json(
                    {
                        error: "Database connection error",
                        details:
                            "Cannot connect to the database. Please check your database connection and try again.",
                    },
                    { status: 503 }, // Service Unavailable
                );
            }
            throw error; // Re-throw to be caught by the outer catch
        }
    } catch (error) {
        console.error("Error fetching sales order:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch sales order",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

// PATCH /api/sales/[id] - Update a sales order
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;
        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid sales order ID" },
                { status: 400 },
            );
        }

        const data = await req.json();
        const {
            deliveryDate,
            deliveryAddress,
            remarks,
            discount,
            tax,
            totalSale,
            paymentStatus,
            paymentAmount,
            paymentMode,
            chequeDetails,
        } = data;

        try {
            // Verify the sales order exists
            const salesOrderResult = await db.salesOrder.findUnique({
                where: { id: Number(id) },
                include: {
                    payments: {
                        include: {
                            chequeTransaction: true,
                        },
                    },
                },
            });

            if (!salesOrderResult) {
                return NextResponse.json(
                    { error: "Sales order not found" },
                    { status: 404 },
                );
            }
            // Begin transaction
            const result = await db.$transaction(async (tx) => {
                // Update the sales order with supported fields from the schema
                const updatedOrder = await tx.salesOrder.update({
                    where: { id: Number(id) },
                    data: {
                        deliveryDate: deliveryDate
                            ? new Date(deliveryDate)
                            : undefined,
                        deliveryAddress:
                            deliveryAddress !== undefined
                                ? deliveryAddress
                                : undefined,
                        remarks: remarks !== undefined ? remarks : undefined,
                        discount:
                            discount !== undefined
                                ? discount === null
                                    ? null
                                    : Number(discount)
                                : undefined,
                        tax:
                            tax !== undefined
                                ? tax === null
                                    ? null
                                    : Number(tax)
                                : undefined,
                        totalSale:
                            totalSale !== undefined
                                ? Number(totalSale)
                                : undefined,
                        paymentStatus:
                            paymentStatus !== undefined
                                ? (paymentStatus as PaymentStatus)
                                : undefined,
                    },
                    include: {
                        payments: true,
                    },
                });

                // Get the inventory transactions
                const updatedInventoryTransactions =
                    await tx.inventoryTransaction.findMany({
                        where: { salesOrderId: Number(id) },
                        include: {
                            inventory: true,
                        },
                    });

                // Get updated customer data
                const customerData = await tx.customer.findUnique({
                    where: { id: updatedOrder.customerId },
                });

                // Build the full updated sales order object
                const updatedSalesOrder = {
                    ...updatedOrder,
                    inventoryTransactions: updatedInventoryTransactions,
                    customer: customerData,
                };

                // Handle payment and cheque updates if payment info is provided
                let payment = null;
                let chequeTransaction = null;

                if (paymentAmount && Number(paymentAmount) > 0) {
                    // Check if there's an existing payment
                    const existingPayment = salesOrderResult.payments[0]; // Just grab the first one for simplicity

                    if (existingPayment) {
                        // Update existing payment
                        payment = await tx.payment.update({
                            where: { id: existingPayment.id },
                            data: {
                                amount: Number(paymentAmount),
                                mode:
                                    (paymentMode as PaymentMode) ||
                                    existingPayment.mode,
                                referenceNumber:
                                    paymentMode === PaymentMode.CHEQUE &&
                                    chequeDetails?.chequeNumber
                                        ? chequeDetails.chequeNumber
                                        : existingPayment.referenceNumber,
                                description:
                                    data.remarks || existingPayment.description,
                            },
                        });

                        // Handle cheque transaction
                        if (paymentMode === PaymentMode.CHEQUE) {
                            if (existingPayment.chequeTransaction) {
                                // Update existing cheque
                                chequeTransaction =
                                    await tx.chequeTransaction.update({
                                        where: {
                                            paymentId: existingPayment.id,
                                        },
                                        data: {
                                            chequeNumber:
                                                chequeDetails?.chequeNumber ||
                                                existingPayment
                                                    .chequeTransaction
                                                    .chequeNumber,
                                            bank:
                                                chequeDetails?.bank ||
                                                existingPayment
                                                    .chequeTransaction.bank,
                                            branch:
                                                chequeDetails?.branch ||
                                                existingPayment
                                                    .chequeTransaction.branch,
                                            chequeAmount: Number(paymentAmount),
                                            chequeStatus:
                                                (chequeDetails?.chequeStatus as ChequeStatus) ||
                                                existingPayment
                                                    .chequeTransaction
                                                    .chequeStatus,
                                            remarks:
                                                chequeDetails?.remarks ||
                                                existingPayment
                                                    .chequeTransaction.remarks,
                                        },
                                    });
                            } else {
                                // Create new cheque transaction
                                chequeTransaction =
                                    await tx.chequeTransaction.create({
                                        data: {
                                            paymentId: payment.id,
                                            chequeNumber:
                                                chequeDetails.chequeNumber,
                                            bank: chequeDetails.bank,
                                            branch:
                                                chequeDetails.branch || null,
                                            chequeAmount: Number(paymentAmount),
                                            issueDate: new Date(),
                                            chequeStatus: ChequeStatus.PENDING,
                                            remarks:
                                                chequeDetails.remarks || null,
                                        },
                                    });
                            }
                        }
                    } else {
                        // Create new payment
                        payment = await tx.payment.create({
                            data: {
                                transactionDate: new Date(),
                                amount: Number(paymentAmount),
                                mode:
                                    (paymentMode as PaymentMode) ||
                                    PaymentMode.CASH,
                                salesOrderId: Number(id),
                                description: `Payment for order ${salesOrderResult.orderNumber}`,
                                referenceNumber:
                                    chequeDetails?.chequeNumber || null,
                                remarks: remarks || null,
                            },
                        });

                        // Create cheque transaction if payment mode is CHEQUE
                        if (
                            paymentMode === PaymentMode.CHEQUE &&
                            chequeDetails
                        ) {
                            chequeTransaction =
                                await tx.chequeTransaction.create({
                                    data: {
                                        paymentId: payment.id,
                                        chequeNumber:
                                            chequeDetails.chequeNumber,
                                        bank: chequeDetails.bank,
                                        branch: chequeDetails.branch || null,
                                        chequeAmount: Number(paymentAmount),
                                        issueDate: new Date(),
                                        chequeStatus: ChequeStatus.PENDING,
                                        remarks: chequeDetails.remarks || null,
                                    },
                                });
                        }
                    }
                }

                return {
                    success: true,
                    salesOrder: updatedSalesOrder,
                    payment,
                    chequeTransaction,
                };
            });

            return NextResponse.json({
                success: true,
                message: "Sales order updated successfully",
                salesOrder: result.salesOrder,
                payment: result.payment,
                chequeTransaction: result.chequeTransaction,
            });
        } catch (error) {
            console.error("Database connection error:", error);
            if (
                error instanceof Error &&
                error.message.includes("Can't reach database server")
            ) {
                return NextResponse.json(
                    {
                        error: "Database connection error",
                        details:
                            "Cannot connect to the database. Please check your database connection and try again.",
                    },
                    { status: 503 }, // Service Unavailable
                );
            }
            return NextResponse.json(
                {
                    error: "Failed to update sales order",
                    details:
                        error instanceof Error ? error.message : String(error),
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Error updating sales order:", error);
        return NextResponse.json(
            {
                error: "Failed to update sales order",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

// DELETE /api/sales/[id] - Delete a sales order
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;
        const idNumber = id;
        if (isNaN(idNumber)) {
            return NextResponse.json(
                { error: "Invalid sales order ID" },
                { status: 400 },
            );
        }

        try {
            // Verify the sales order exists
            const salesOrderResult = await db.salesOrder.findUnique({
                where: { id: Number(id) },
                include: {
                    payments: {
                        include: {
                            chequeTransaction: true,
                        },
                    },
                },
            });

            if (!salesOrderResult) {
                return NextResponse.json(
                    { error: "Sales order not found" },
                    { status: 404 },
                );
            }

            // Get inventory transactions separately
            const inventoryTransactions =
                await db.inventoryTransaction.findMany({
                    where: { salesOrderId: Number(id) },
                    include: {
                        inventory: true,
                    },
                });

            // Get customer data if needed
            const customerData = await db.customer.findUnique({
                where: { id: salesOrderResult.customerId },
            });

            // Build the complete sales order object for deletion
            const existingSalesOrder = {
                ...salesOrderResult,
                inventoryTransactions,
                customer: customerData,
                payments: salesOrderResult.payments,
            };

            // Begin transaction
            await db.$transaction(async (tx) => {
                // Delete any cheque transactions first
                for (const payment of existingSalesOrder.payments) {
                    if (payment.chequeTransaction) {
                        await tx.chequeTransaction.delete({
                            where: { paymentId: payment.id },
                        });
                    }
                }

                // Delete payments
                if (existingSalesOrder.payments.length > 0) {
                    await tx.payment.deleteMany({
                        where: { salesOrderId: Number(id) },
                    });
                }

                // Delete sales order items (this relation might be a separate table)
                await tx.salesOrderItem.deleteMany({
                    where: { salesOrderId: Number(id) },
                });

                // Restore inventory quantity if there are inventory entries
                for (const entry of existingSalesOrder.inventoryTransactions ||
                    []) {
                    if (entry.inventory) {
                        // Update inventory quantity - restore the sold quantity
                        await tx.inventory.update({
                            where: { id: entry.inventory.id },
                            data: {
                                currentQuantity: { increment: entry.quantity },
                            },
                        });
                    }

                    // Delete inventory transaction
                    await tx.inventoryTransaction.delete({
                        where: { id: entry.id },
                    });
                }

                // Finally delete the sales order
                await tx.salesOrder.delete({
                    where: { id: Number(id) },
                });
            });

            return NextResponse.json({
                success: true,
                message: "Sales order deleted successfully",
            });
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            if (
                dbError instanceof Error &&
                dbError.message.includes("Can't reach database server")
            ) {
                return NextResponse.json(
                    {
                        error: "Database connection error",
                        details:
                            "Cannot connect to the database. Please check your database connection and try again.",
                    },
                    { status: 503 }, // Service Unavailable
                );
            }
            throw dbError; // Re-throw to be caught by the outer catch
        }
    } catch (error) {
        console.error("Error deleting sales order:", error);
        return NextResponse.json(
            {
                error: "Failed to delete sales order",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
