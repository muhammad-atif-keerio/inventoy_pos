import { NextRequest, NextResponse } from "next/server";

import {
    ColorStatus,
    InventoryTransactionType,
    PaymentMode,
    ProductType,
} from "@prisma/client";

import { db } from "@/lib/db";

// GET handler to fetch a specific thread purchase by ID
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: number | string }> },
) {
    // Safely access id from params
    const { id } = await params;

    try {
        // Special case for 'new' route
        if (String(id) === "new") {
            return NextResponse.json(
                {
                    error: "Invalid thread purchase ID - use the thread/order endpoint to create a new order",
                },
                { status: 400 },
            );
        }

        const numericId = Number(id);

        if (isNaN(numericId) || numericId.toString() !== id) {
            console.log(
                `Invalid thread purchase ID: ${id} (parsed to ${numericId})`,
            );
            return NextResponse.json(
                {
                    error: "Invalid thread purchase ID. Must be a valid number.",
                },
                { status: 400 },
            );
        }

        // If the ID is "purchases", redirect to the purchases route
        if (id === "purchases") {
            // Get the search params from the request URL
            const searchParams = req.nextUrl.searchParams;
            const redirectUrl = `/api/thread/purchases?${searchParams.toString()}`;

            return NextResponse.redirect(new URL(redirectUrl, req.url));
        }

        const threadPurchase = await db.threadPurchase.findUnique({
            where: { id: numericId },
            include: {
                vendor: true,
                dyeingProcesses: true,
                paymentTransactions: true,
                inventoryEntries: true,
                fabricProductions: true,
            },
        });

        if (!threadPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Format response data
        const totalPayments = threadPurchase.paymentTransactions.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0,
        );

        const totalCost = Number(threadPurchase.totalCost);
        let paymentStatus = "PENDING";

        if (totalPayments >= totalCost) {
            paymentStatus = "PAID";
        } else if (totalPayments > 0) {
            paymentStatus = "PARTIAL";
        }

        const formattedThreadPurchase = {
            ...threadPurchase,
            orderDate: threadPurchase.orderDate.toISOString(),
            deliveryDate: threadPurchase.deliveryDate
                ? threadPurchase.deliveryDate.toISOString()
                : null,
            receivedAt: threadPurchase.receivedAt
                ? threadPurchase.receivedAt.toISOString()
                : null,
            unitPrice: Number(threadPurchase.unitPrice),
            totalCost: Number(threadPurchase.totalCost),
            paymentStatus,
            totalPayments,
            remainingBalance: Math.max(0, totalCost - totalPayments),
            hasFabricProductions: threadPurchase.fabricProductions.length > 0,
            hasInventoryEntries: threadPurchase.inventoryEntries.length > 0,
            // Format nested objects for better readability
            vendor: {
                ...threadPurchase.vendor,
                createdAt: threadPurchase.vendor.createdAt.toISOString(),
                updatedAt: threadPurchase.vendor.updatedAt.toISOString(),
            },
            paymentTransactions: threadPurchase.paymentTransactions.map(
                (payment) => ({
                    ...payment,
                    amount: Number(payment.amount),
                    transactionDate: payment.transactionDate.toISOString(),
                    createdAt: payment.createdAt.toISOString(),
                    updatedAt: payment.updatedAt.toISOString(),
                }),
            ),
            dyeingProcesses: threadPurchase.dyeingProcesses.map((process) => ({
                ...process,
                dyeDate: process.dyeDate.toISOString(),
                completionDate: process.completionDate
                    ? process.completionDate.toISOString()
                    : null,
                laborCost: process.laborCost ? Number(process.laborCost) : null,
                dyeMaterialCost: process.dyeMaterialCost
                    ? Number(process.dyeMaterialCost)
                    : null,
                totalCost: process.totalCost ? Number(process.totalCost) : null,
            })),
            inventoryEntries: threadPurchase.inventoryEntries.map((entry) => ({
                ...entry,
                transactionDate: entry.transactionDate.toISOString(),
                unitCost: entry.unitCost ? Number(entry.unitCost) : null,
                totalCost: entry.totalCost ? Number(entry.totalCost) : null,
                createdAt: entry.createdAt.toISOString(),
                updatedAt: entry.updatedAt.toISOString(),
            })),
            fabricProductions: threadPurchase.fabricProductions.map(
                (production) => ({
                    ...production,
                    productionDate: production.productionDate.toISOString(),
                    completionDate: production.completionDate
                        ? production.completionDate.toISOString()
                        : null,
                    productionCost: Number(production.productionCost),
                    laborCost: production.laborCost
                        ? Number(production.laborCost)
                        : null,
                    totalCost: Number(production.totalCost),
                }),
            ),
        };

        return NextResponse.json(formattedThreadPurchase);
    } catch (error) {
        console.error("Error fetching thread purchase:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread purchase" },
            { status: 500 },
        );
    }
}

// PATCH handler to update a specific thread purchase by ID
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: number | string }> },
) {
    try {
        // Safely extract the ID from params
        const { id } = await params;
        console.log(`PATCH request received for thread purchase ID: ${id}`);

        // Special case for 'new' route
        if (id === "new") {
            console.log("Invalid request - 'new' is not a valid ID");
            return NextResponse.json(
                {
                    error: "Invalid thread purchase ID - use the thread/order endpoint to update a new order",
                },
                { status: 400 },
            );
        }

        const numericId = Number(id);

        if (isNaN(numericId) || numericId.toString() !== id) {
            console.log(
                `Invalid thread purchase ID: ${id} (parsed to ${numericId})`,
            );
            return NextResponse.json(
                {
                    error: "Invalid thread purchase ID. Must be a valid number.",
                },
                { status: 400 },
            );
        }

        const body = await req.json();

        // Remove id from updateData to avoid Prisma validation errors
        const updateDataWithoutId = { ...body };
        delete updateDataWithoutId.id;

        // Calculate total cost if both quantity and unitPrice are provided
        const updateData = { ...updateDataWithoutId };
        if (updateData.quantity && updateData.unitPrice) {
            updateData.totalCost =
                parseFloat(updateData.unitPrice) * updateData.quantity;
        }

        // If received status is changed to true, update receivedAt
        if (updateData.received === true) {
            updateData.receivedAt = new Date();
        }

        // If delivery date is provided as string, convert to Date
        if (typeof updateData.deliveryDate === "string") {
            updateData.deliveryDate = new Date(updateData.deliveryDate);
        }

        // If colorStatus is provided, ensure it's a valid enum value
        if (updateData.colorStatus) {
            updateData.colorStatus = updateData.colorStatus as ColorStatus;
        }

        // Get the current thread purchase to check for changes
        const currentThreadPurchase = await db.threadPurchase.findUnique({
            where: { id: numericId },
            include: {
                inventoryEntries: true,
                dyeingProcesses: true,
            },
        });

        if (!currentThreadPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Update the thread purchase
        const updatedThreadPurchase = await db.threadPurchase.update({
            where: { id: numericId },
            data: updateData,
            include: {
                vendor: true,
                dyeingProcesses: true,
                inventoryEntries: true,
                paymentTransactions: true,
                fabricProductions: true,
            },
        });

        // If received has changed to true and addToInventory flag is true and there are no inventory entries yet
        if (
            updateData.received === true &&
            updateData.addToInventory &&
            (!currentThreadPurchase.inventoryEntries ||
                currentThreadPurchase.inventoryEntries.length === 0)
        ) {
            try {
                // Check if thread type exists or create it
                let threadType = await db.threadType.findFirst({
                    where: {
                        name: {
                            equals: updatedThreadPurchase.threadType,
                            mode: "insensitive",
                        },
                    },
                });

                if (!threadType) {
                    threadType = await db.threadType.create({
                        data: {
                            name: updatedThreadPurchase.threadType,
                            units:
                                updatedThreadPurchase.unitOfMeasure || "meters",
                        },
                    });
                }

                // Generate a unique item code
                const itemCode = `THR-${updatedThreadPurchase.id}-${Date.now().toString().slice(-6)}`;

                // Create inventory item
                const inventoryItem = await db.inventory.create({
                    data: {
                        itemCode,
                        description: `${updatedThreadPurchase.threadType} - ${updatedThreadPurchase.color || "Raw"}`,
                        productType: ProductType.THREAD,
                        threadTypeId: threadType.id,
                        currentQuantity: updatedThreadPurchase.quantity,
                        unitOfMeasure: updatedThreadPurchase.unitOfMeasure,
                        minStockLevel: 100,
                        costPerUnit: Number(updatedThreadPurchase.unitPrice),
                        salePrice:
                            Number(updatedThreadPurchase.unitPrice) * 1.2, // 20% markup
                        location: "Warehouse",
                        lastRestocked: new Date(),
                        notes: `Thread purchased from ${updatedThreadPurchase.vendor.name}`,
                    },
                });

                // Create inventory transaction
                await db.inventoryTransaction.create({
                    data: {
                        inventoryId: inventoryItem.id,
                        transactionType: InventoryTransactionType.PURCHASE,
                        quantity: updatedThreadPurchase.quantity,
                        remainingQuantity: updatedThreadPurchase.quantity,
                        unitCost: Number(updatedThreadPurchase.unitPrice),
                        totalCost: Number(updatedThreadPurchase.totalCost),
                        referenceType: "ThreadPurchase",
                        referenceId: updatedThreadPurchase.id,
                        threadPurchaseId: updatedThreadPurchase.id,
                        notes: `Inventory from thread purchase #${updatedThreadPurchase.id}`,
                    },
                });
            } catch (inventoryError) {
                console.error(
                    "Error adding to inventory on update:",
                    inventoryError,
                );
                // Continue even if inventory creation fails
            }
        }

        // If colorStatus changed to RAW and createDyeingProcess is true and there's no dyeing process
        if (
            updateData.colorStatus === ColorStatus.RAW &&
            updateData.createDyeingProcess &&
            !currentThreadPurchase.dyeingProcesses.length
        ) {
            await db.dyeingProcess.create({
                data: {
                    threadPurchaseId: updatedThreadPurchase.id,
                    dyeDate: new Date(),
                    dyeQuantity: updatedThreadPurchase.quantity,
                    outputQuantity: 0, // Will be updated after dyeing process is complete
                    resultStatus: "PENDING",
                },
            });
        }

        // If payment information is provided, create a payment record
        if (
            updateData.paymentAmount &&
            updateData.paymentAmount > 0 &&
            updateData.paymentMode
        ) {
            await db.payment.create({
                data: {
                    amount: updateData.paymentAmount,
                    mode: updateData.paymentMode as PaymentMode,
                    threadPurchaseId: updatedThreadPurchase.id,
                    description: `Payment for thread purchase #${updatedThreadPurchase.id}`,
                    referenceNumber: updateData.paymentReference || null,
                    remarks: updateData.paymentRemarks || null,
                },
            });
        }

        // Format the updated thread purchase for response
        const formattedThreadPurchase = {
            ...updatedThreadPurchase,
            orderDate: updatedThreadPurchase.orderDate.toISOString(),
            deliveryDate: updatedThreadPurchase.deliveryDate
                ? updatedThreadPurchase.deliveryDate.toISOString()
                : null,
            receivedAt: updatedThreadPurchase.receivedAt
                ? updatedThreadPurchase.receivedAt.toISOString()
                : null,
            unitPrice: Number(updatedThreadPurchase.unitPrice),
            totalCost: Number(updatedThreadPurchase.totalCost),
            vendor: {
                ...updatedThreadPurchase.vendor,
                createdAt: updatedThreadPurchase.vendor.createdAt.toISOString(),
                updatedAt: updatedThreadPurchase.vendor.updatedAt.toISOString(),
            },
            paymentTransactions: updatedThreadPurchase.paymentTransactions.map(
                (payment) => ({
                    ...payment,
                    amount: Number(payment.amount),
                    transactionDate: payment.transactionDate.toISOString(),
                    createdAt: payment.createdAt.toISOString(),
                    updatedAt: payment.updatedAt.toISOString(),
                }),
            ),
            dyeingProcesses: updatedThreadPurchase.dyeingProcesses?.map(
                (process) => ({
                    ...process,
                    dyeDate: process.dyeDate.toISOString(),
                    completionDate: process.completionDate
                        ? process.completionDate.toISOString()
                        : null,
                    laborCost: process.laborCost
                        ? Number(process.laborCost)
                        : null,
                    dyeMaterialCost: process.dyeMaterialCost
                        ? Number(process.dyeMaterialCost)
                        : null,
                    totalCost: process.totalCost
                        ? Number(process.totalCost)
                        : null,
                }),
            ),
        };

        return NextResponse.json({
            success: true,
            data: formattedThreadPurchase,
        });
    } catch (error) {
        console.error("Error updating thread purchase:", error);
        return NextResponse.json(
            {
                error: "Failed to update thread purchase",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

// DELETE handler to delete a specific thread purchase by ID
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: number | string }> },
) {
    try {
        // Access the id safely from params object
        const { id } = await params;
        console.log(`DELETE request received for thread purchase ID: ${id}`);

        // Special case for 'new' route
        if (String(id) === "new") {
            console.log("Invalid request - 'new' is not a valid ID");
            return NextResponse.json(
                {
                    error: "Invalid thread purchase ID - cannot delete a non-existent order",
                },
                { status: 400 },
            );
        }

        const numericId = Number(id);

        if (isNaN(numericId) || numericId.toString() !== id) {
            console.log(
                `Invalid thread purchase ID: ${id} (parsed to ${numericId})`,
            );
            return NextResponse.json(
                {
                    error: "Invalid thread purchase ID. Must be a valid number.",
                },
                { status: 400 },
            );
        }

        // Check if thread purchase exists and has fabricProductions
        const threadPurchase = await db.threadPurchase.findUnique({
            where: { id: numericId },
            include: {
                fabricProductions: { take: 1 },
            },
        });

        if (!threadPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Check if it's used in fabric production
        if (
            threadPurchase.fabricProductions &&
            threadPurchase.fabricProductions.length > 0
        ) {
            return NextResponse.json(
                {
                    error: "Cannot delete thread purchase that has been used in fabric production",
                },
                { status: 400 },
            );
        }

        // First delete any related records
        // Delete dyeing process if exists
        await db.dyeingProcess.deleteMany({
            where: { threadPurchaseId: numericId },
        });

        // Delete payments
        await db.payment.deleteMany({
            where: { threadPurchaseId: numericId },
        });

        // Delete inventory transactions
        await db.inventoryTransaction.deleteMany({
            where: { threadPurchaseId: numericId },
        });

        // Delete the thread purchase
        await db.threadPurchase.delete({
            where: { id: numericId },
        });

        return NextResponse.json({
            success: true,
            message: "Thread purchase deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting thread purchase:", error);
        return NextResponse.json(
            {
                error: "Failed to delete thread purchase",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
