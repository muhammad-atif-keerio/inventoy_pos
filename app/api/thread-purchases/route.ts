import { NextRequest, NextResponse } from "next/server";

import {
    ColorStatus,
    InventoryTransactionType,
    PaymentMode,
    ProductType,
} from "@prisma/client";

import { db } from "@/lib/db";

// GET handler - redirect to thread API
export async function GET(request: Request) {
    // Get the query parameters
    const url = new URL(request.url);
    const queryParams = url.search;

    // Redirect to the correct endpoint while preserving query parameters
    return NextResponse.redirect(
        new URL(`/api/thread${queryParams}`, request.url),
    );
}

// POST handler for creating thread purchases
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate required fields
        const { vendorId, threadType, colorStatus, quantity, unitPrice } = body;

        if (
            !vendorId ||
            !threadType ||
            !colorStatus ||
            !quantity ||
            !unitPrice
        ) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        // Calculate total cost
        const totalCost = parseFloat(unitPrice) * quantity;

        // Use transaction to ensure data consistency
        const result = await db.$transaction(async (tx) => {
            // Create thread purchase
            const threadPurchase = await tx.threadPurchase.create({
                data: {
                    vendorId: parseInt(vendorId),
                    threadType,
                    color: body.color || null,
                    colorStatus: colorStatus as ColorStatus,
                    quantity,
                    unitPrice: parseFloat(unitPrice),
                    totalCost,
                    unitOfMeasure: body.unitOfMeasure || "meters",
                    deliveryDate: body.deliveryDate
                        ? new Date(body.deliveryDate)
                        : null,
                    remarks: body.remarks || null,
                    reference: body.reference || null,
                    received: body.received || false,
                    receivedAt: body.received ? new Date() : null,
                },
                include: {
                    vendor: true,
                },
            });

            // Handle payment if provided
            let paymentRecord = null;
            if (body.payment && body.payment.amount > 0) {
                paymentRecord = await tx.payment.create({
                    data: {
                        transactionDate: new Date(),
                        amount: parseFloat(body.payment.amount),
                        mode: body.payment.mode as PaymentMode,
                        threadPurchaseId: threadPurchase.id,
                        referenceNumber: body.payment.referenceNumber || null,
                        description: `Payment for thread purchase #${threadPurchase.id}`,
                        remarks: body.payment.remarks || null,
                    },
                });

                // Handle cheque transaction if payment mode is CHEQUE
                if (
                    body.payment.mode === "CHEQUE" &&
                    body.payment.chequeDetails
                ) {
                    await tx.chequeTransaction.create({
                        data: {
                            paymentId: paymentRecord.id,
                            chequeNumber:
                                body.payment.chequeDetails.chequeNumber,
                            bank: body.payment.chequeDetails.bank,
                            branch: body.payment.chequeDetails.branch || null,
                            chequeAmount: parseFloat(body.payment.amount),
                            issueDate: new Date(),
                            chequeStatus: "PENDING",
                            remarks: body.payment.chequeDetails.remarks || null,
                        },
                    });
                }
            }

            // Add to inventory if the thread purchase is received
            let inventoryItem = null;
            if (body.received && body.addToInventory !== false) {
                // Check if thread type exists or create it
                let threadTypeRecord = await tx.threadType.findFirst({
                    where: {
                        name: {
                            equals: threadPurchase.threadType,
                            mode: "insensitive",
                        },
                    },
                });

                if (!threadTypeRecord) {
                    threadTypeRecord = await tx.threadType.create({
                        data: {
                            name: threadPurchase.threadType,
                            units: threadPurchase.unitOfMeasure,
                            description: `Thread type for ${threadPurchase.threadType}`,
                        },
                    });
                }

                // Check if there's an existing inventory with the same thread type and color
                const existingInventory = await tx.inventory.findFirst({
                    where: {
                        productType: ProductType.THREAD,
                        threadTypeId: threadTypeRecord.id,
                        description: {
                            contains: `${threadPurchase.color ? threadPurchase.color : ""} ${threadPurchase.threadType} Thread (${threadPurchase.colorStatus})`,
                            mode: "insensitive",
                        },
                    },
                });

                if (
                    existingInventory &&
                    body.updateExistingInventory !== false
                ) {
                    // Update existing inventory item
                    inventoryItem = await tx.inventory.update({
                        where: { id: existingInventory.id },
                        data: {
                            currentQuantity: {
                                increment: threadPurchase.quantity,
                            },
                            lastRestocked: new Date(),
                        },
                    });

                    // Create inventory transaction for the addition
                    await tx.inventoryTransaction.create({
                        data: {
                            inventoryId: existingInventory.id,
                            threadPurchaseId: threadPurchase.id,
                            transactionType: InventoryTransactionType.PURCHASE,
                            quantity: threadPurchase.quantity,
                            remainingQuantity:
                                existingInventory.currentQuantity +
                                threadPurchase.quantity,
                            unitCost: threadPurchase.unitPrice,
                            totalCost: Number(threadPurchase.totalCost),
                            transactionDate: new Date(),
                            notes: `Added thread from purchase #${threadPurchase.id} to existing inventory`,
                            referenceType: "ThreadPurchase",
                            referenceId: threadPurchase.id,
                        },
                    });
                } else {
                    // Generate a unique item code
                    const itemCode = `THR-${threadPurchase.id}-${Date.now().toString().slice(-6)}`;

                    // Create new inventory item
                    inventoryItem = await tx.inventory.create({
                        data: {
                            itemCode,
                            description: `${threadPurchase.color ? threadPurchase.color + " " : ""}${threadPurchase.threadType} Thread (${threadPurchase.colorStatus})`,
                            productType: ProductType.THREAD,
                            threadTypeId: threadTypeRecord.id,
                            currentQuantity: threadPurchase.quantity,
                            unitOfMeasure: threadPurchase.unitOfMeasure,
                            minStockLevel: body.minStockLevel || 10, // Default or specified minimum stock level
                            costPerUnit: threadPurchase.unitPrice,
                            salePrice:
                                Number(threadPurchase.unitPrice) *
                                (body.markup || 1.2), // Default or specified markup
                            lastRestocked: new Date(),
                            location: body.location || "Main Warehouse",
                            notes: `From vendor: ${threadPurchase.vendor.name}. Ref: ${threadPurchase.reference || "N/A"}`,
                        },
                    });

                    // Create inventory transaction
                    await tx.inventoryTransaction.create({
                        data: {
                            inventoryId: inventoryItem.id,
                            threadPurchaseId: threadPurchase.id,
                            transactionType: InventoryTransactionType.PURCHASE,
                            quantity: threadPurchase.quantity,
                            remainingQuantity: threadPurchase.quantity,
                            unitCost: threadPurchase.unitPrice,
                            totalCost: Number(threadPurchase.totalCost),
                            transactionDate: new Date(),
                            notes: `Initial inventory from thread purchase #${threadPurchase.id}`,
                            referenceType: "ThreadPurchase",
                            referenceId: threadPurchase.id,
                        },
                    });
                }
            }

            return {
                threadPurchase,
                payment: paymentRecord,
                inventory: inventoryItem,
            };
        });

        return NextResponse.json({
            success: true,
            data: result.threadPurchase,
            paymentProcessed: result.payment !== null,
            inventoryUpdated: result.inventory !== null,
        });
    } catch (error) {
        console.error("Error creating thread purchase:", error);

        if (
            error instanceof Error &&
            error.message.includes("Foreign key constraint failed")
        ) {
            return NextResponse.json(
                {
                    error: "Invalid vendor ID or other reference",
                    details: error.message,
                },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                error: "Failed to create thread purchase",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

// PATCH handler for updating thread purchases
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Thread purchase ID is required" },
                { status: 400 },
            );
        }

        // Get the existing thread purchase
        const existingPurchase = await db.threadPurchase.findUnique({
            where: { id: parseInt(id) },
            include: {
                vendor: true,
                inventoryEntries: true,
            },
        });

        if (!existingPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Calculate total cost if quantity and unitPrice are provided
        if (updateData.quantity && updateData.unitPrice) {
            updateData.totalCost =
                parseFloat(updateData.unitPrice) * updateData.quantity;
        }

        // Format dates
        if (updateData.deliveryDate) {
            updateData.deliveryDate = new Date(updateData.deliveryDate);
        }

        if (updateData.received && !updateData.receivedAt) {
            updateData.receivedAt = new Date();
        }

        // Update thread purchase
        const updatedThreadPurchase = await db.threadPurchase.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: { vendor: true },
        });

        // Handle inventory updates
        const receivedChanged =
            existingPurchase.received !== updatedThreadPurchase.received;
        const quantityChanged =
            existingPurchase.quantity !== updatedThreadPurchase.quantity;
        const shouldUpdateInventory =
            (receivedChanged && updatedThreadPurchase.received) ||
            (quantityChanged && updatedThreadPurchase.received);

        // If the thread is now received or the quantity changed and it's already received
        if (shouldUpdateInventory && body.updateInventory !== false) {
            // Check if there's an existing inventory entry for this thread purchase
            const inventoryEntries = await db.inventoryTransaction.findMany({
                where: {
                    threadPurchaseId: parseInt(id),
                },
                include: {
                    inventory: true,
                },
            });

            if (inventoryEntries.length > 0) {
                // Update existing inventory
                const latestEntry = inventoryEntries[0];
                const inventoryItem = latestEntry.inventory;

                // Calculate quantity difference
                const quantityDiff =
                    updatedThreadPurchase.quantity - existingPurchase.quantity;

                if (quantityDiff !== 0) {
                    // Update inventory quantity
                    await db.inventory.update({
                        where: { id: inventoryItem.id },
                        data: {
                            currentQuantity: {
                                increment: quantityDiff,
                            },
                            lastRestocked: new Date(),
                        },
                    });

                    // Create a new inventory transaction for the adjustment
                    await db.inventoryTransaction.create({
                        data: {
                            inventoryId: inventoryItem.id,
                            threadPurchaseId: updatedThreadPurchase.id,
                            transactionType:
                                InventoryTransactionType.ADJUSTMENT,
                            quantity: quantityDiff,
                            remainingQuantity:
                                inventoryItem.currentQuantity + quantityDiff,
                            unitCost:
                                updatedThreadPurchase.unitPrice.toString(),
                            totalCost:
                                parseFloat(
                                    updatedThreadPurchase.unitPrice.toString(),
                                ) * quantityDiff,
                            transactionDate: new Date(),
                            notes: `Quantity adjustment for thread purchase #${updatedThreadPurchase.id}`,
                            referenceType: "ThreadPurchase",
                            referenceId: updatedThreadPurchase.id,
                        },
                    });
                }
            } else if (updatedThreadPurchase.received) {
                // No existing inventory entry - create new entry if now received
                try {
                    // Check if thread type exists or create it
                    let threadTypeRecord = await db.threadType.findFirst({
                        where: {
                            name: {
                                equals: updatedThreadPurchase.threadType,
                                mode: "insensitive",
                            },
                        },
                    });

                    if (!threadTypeRecord) {
                        threadTypeRecord = await db.threadType.create({
                            data: {
                                name: updatedThreadPurchase.threadType,
                                units: updatedThreadPurchase.unitOfMeasure,
                                description: `Thread type for ${updatedThreadPurchase.threadType}`,
                            },
                        });
                    }

                    // Generate a unique item code
                    const itemCode = `THR-${updatedThreadPurchase.id}-${Date.now().toString().slice(-6)}`;

                    // Create inventory item
                    const inventoryItem = await db.inventory.create({
                        data: {
                            itemCode,
                            description: `${updatedThreadPurchase.color ? updatedThreadPurchase.color + " " : ""}${updatedThreadPurchase.threadType} Thread (${updatedThreadPurchase.colorStatus})`,
                            productType: ProductType.THREAD,
                            threadTypeId: threadTypeRecord.id,
                            currentQuantity: updatedThreadPurchase.quantity,
                            unitOfMeasure: updatedThreadPurchase.unitOfMeasure,
                            minStockLevel: 10, // Default minimum stock level
                            costPerUnit: updatedThreadPurchase.unitPrice,
                            salePrice:
                                Number(updatedThreadPurchase.unitPrice) * 1.2, // Default markup
                            lastRestocked: new Date(),
                            location: body.location || "Main Warehouse",
                            notes: `From vendor: ${updatedThreadPurchase.vendor.name}. Ref: ${updatedThreadPurchase.reference || "N/A"}`,
                        },
                    });

                    // Create inventory transaction
                    await db.inventoryTransaction.create({
                        data: {
                            inventoryId: inventoryItem.id,
                            threadPurchaseId: updatedThreadPurchase.id,
                            transactionType: InventoryTransactionType.PURCHASE,
                            quantity: updatedThreadPurchase.quantity,
                            remainingQuantity: updatedThreadPurchase.quantity,
                            unitCost: updatedThreadPurchase.unitPrice,
                            totalCost: Number(updatedThreadPurchase.totalCost),
                            transactionDate: new Date(),
                            notes: `Initial inventory from thread purchase #${updatedThreadPurchase.id}`,
                            referenceType: "ThreadPurchase",
                            referenceId: updatedThreadPurchase.id,
                        },
                    });
                } catch (inventoryError) {
                    console.error(
                        "Error adding updated thread purchase to inventory:",
                        inventoryError,
                    );
                    // Continue with the process, but log the error
                }
            }
        }

        return NextResponse.json({
            success: true,
            data: updatedThreadPurchase,
        });
    } catch (error) {
        console.error("Error updating thread purchase:", error);
        return NextResponse.json(
            { error: "Failed to update thread purchase" },
            { status: 500 },
        );
    }
}

// DELETE handler for deleting thread purchases
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Thread purchase ID is required" },
                { status: 400 },
            );
        }

        // Check for related records that would prevent deletion
        const threadPurchase = await db.threadPurchase.findUnique({
            where: { id: parseInt(id) },
            include: {
                dyeingProcesses: true,
                fabricProductions: true,
                inventoryEntries: true,
                paymentTransactions: true,
                salesOrders: true,
            },
        });

        if (!threadPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Check if there are related records that would prevent deletion
        if (
            (threadPurchase.fabricProductions &&
                threadPurchase.fabricProductions.length > 0) ||
            (threadPurchase.salesOrders &&
                threadPurchase.salesOrders.length > 0)
        ) {
            return NextResponse.json(
                {
                    error: "Cannot delete thread purchase with related fabric production or sales orders",
                },
                { status: 400 },
            );
        }

        // Delete related records first
        if (
            threadPurchase.dyeingProcesses &&
            threadPurchase.dyeingProcesses.length > 0
        ) {
            for (const dyeingProcess of threadPurchase.dyeingProcesses) {
                await db.dyeingProcess.delete({
                    where: { id: dyeingProcess.id },
                });
            }
        }

        if (
            threadPurchase.inventoryEntries &&
            threadPurchase.inventoryEntries.length > 0
        ) {
            await db.inventoryTransaction.deleteMany({
                where: { threadPurchaseId: parseInt(id) },
            });
        }

        // Delete payments and associated cheque transactions
        if (
            threadPurchase.paymentTransactions &&
            threadPurchase.paymentTransactions.length > 0
        ) {
            for (const payment of threadPurchase.paymentTransactions) {
                // Check if there's a cheque transaction
                const chequeTransaction = await db.chequeTransaction.findUnique(
                    {
                        where: { paymentId: payment.id },
                    },
                );

                if (chequeTransaction) {
                    await db.chequeTransaction.delete({
                        where: { id: chequeTransaction.id },
                    });
                }

                // Delete the payment
                await db.payment.delete({ where: { id: payment.id } });
            }
        }

        // Finally delete the thread purchase
        await db.threadPurchase.delete({ where: { id: parseInt(id) } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting thread purchase:", error);
        return NextResponse.json(
            { error: "Failed to delete thread purchase" },
            { status: 500 },
        );
    }
}
