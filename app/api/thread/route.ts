/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import {
    ColorStatus,
    InventoryTransactionType,
    PaymentMode,
    Prisma,
    ProductType,
} from "@prisma/client";

import { db } from "@/lib/db";

// GET handler to fetch all thread purchases with pagination, filtering, and sorting
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Filtering parameters
        const colorStatus = searchParams.get("colorStatus");
        const received = searchParams.get("received");
        const vendorId = searchParams.get("vendorId");
        const search = searchParams.get("search");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "1000");
        const skip = (page - 1) * limit;

        // Build the where clause
        const where: Prisma.ThreadPurchaseWhereInput = {};

        // Only apply colorStatus filter if explicitly specified
        if (colorStatus) {
            where.colorStatus = colorStatus as ColorStatus;
        }

        // Only apply received filter if explicitly specified
        if (received) {
            where.received = received === "true";
        }

        if (vendorId) {
            where.vendorId = parseInt(vendorId);
        }

        if (search) {
            where.OR = [
                { threadType: { contains: search, mode: "insensitive" } },
                { color: { contains: search, mode: "insensitive" } },
                { vendor: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        // Fetch thread purchases with proper error handling
        const [threadPurchases, totalCount] = await Promise.all([
            db.threadPurchase.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    orderDate: "desc",
                },
                include: {
                    vendor: true,
                    dyeingProcess: {
                        select: {
                            id: true,
                            resultStatus: true,
                            colorName: true,
                            colorCode: true,
                            completionDate: true,
                        },
                        orderBy: {
                            dyeDate: "desc",
                        },
                    },
                },
            }),
            db.threadPurchase.count({ where }),
        ]).catch((error) => {
            console.error("Database error:", error);
            throw new Error("Failed to fetch thread purchases from database");
        });

        // Prepare formatted thread purchases
        const formattedThreadPurchases = threadPurchases.map((purchase) => {
            const dyeingProcess =
                purchase.dyeingProcess && purchase.dyeingProcess.length > 0
                    ? purchase.dyeingProcess[0]
                    : null;

            return {
                id: purchase.id,
                vendorId: purchase.vendorId,
                vendorName: purchase.vendor?.name || "Unknown",
                orderDate: purchase.orderDate.toISOString(),
                threadType: purchase.threadType,
                color: purchase.color,
                colorStatus: purchase.colorStatus,
                quantity: purchase.quantity,
                unitPrice: Number(purchase.unitPrice),
                totalCost: Number(purchase.totalCost),
                unitOfMeasure: purchase.unitOfMeasure,
                deliveryDate: purchase.deliveryDate?.toISOString() || null,
                received: purchase.received,
                receivedAt: purchase.receivedAt?.toISOString() || null,
                hasDyeingProcess: dyeingProcess !== null,
                dyeingProcessId: dyeingProcess?.id || null,
                dyeingStatus: dyeingProcess?.resultStatus || null,
                dyedColor:
                    dyeingProcess?.colorName ||
                    dyeingProcess?.colorCode ||
                    null,
                dyeingCompleted: Boolean(dyeingProcess?.completionDate),
                inventory: null,
            };
        });

        // Return the response with proper structure
        return NextResponse.json({
            success: true,
            data: formattedThreadPurchases,
            total: totalCount,
            page,
            limit,
        });
    } catch (error) {
        console.error("Error in thread GET handler:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "An unexpected error occurred",
            },
            { status: 500 },
        );
    }
}

// POST handler to create a new thread purchase
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

        // Create thread purchase
        const threadPurchase = await db.threadPurchase.create({
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

        // If received is true and addToInventory flag is true, add to inventory
        if (body.received && body.addToInventory) {
            try {
                // Check if thread type exists or create it
                let threadType = await db.threadType.findFirst({
                    where: {
                        name: { equals: body.threadType, mode: "insensitive" },
                    },
                });

                if (!threadType) {
                    threadType = await db.threadType.create({
                        data: {
                            name: body.threadType,
                            units: body.unitOfMeasure || "meters",
                            updatedAt: new Date(),
                        } as any,
                    });
                }

                // Generate a unique item code
                const itemCode = `THR-${threadPurchase.id}-${Date.now().toString().slice(-6)}`;

                // Create inventory item
                const inventoryItem = await db.inventory.create({
                    data: {
                        itemCode,
                        description: `${body.threadType} - ${body.color || "Raw"}`,
                        productType: ProductType.THREAD,
                        threadTypeId: threadType.id,
                        currentQuantity: quantity,
                        unitOfMeasure: body.unitOfMeasure || "meters",
                        minStockLevel: 100,
                        costPerUnit: unitPrice,
                        salePrice: unitPrice * 1.2, // 20% markup
                        location: "Warehouse",
                        lastRestocked: new Date(),
                        notes: `Thread purchased from ${threadPurchase.vendor.name}`,
                        updatedAt: new Date(),
                    } as any,
                });

                // Create inventory transaction
                await db.inventoryTransaction.create({
                    data: {
                        inventoryId: inventoryItem.id,
                        transactionType: InventoryTransactionType.PURCHASE,
                        quantity,
                        remainingQuantity: quantity,
                        unitCost: unitPrice,
                        totalCost,
                        referenceType: "ThreadPurchase",
                        referenceId: threadPurchase.id,
                        threadPurchaseId: threadPurchase.id,
                        notes: `Initial inventory from thread purchase #${threadPurchase.id}`,
                        updatedAt: new Date(),
                    } as any,
                });
            } catch (inventoryError) {
                console.error("Error adding to inventory:", inventoryError);
                // Continue even if inventory creation fails
            }
        }

        // If the thread is RAW and createDyeingProcess is true, create a dyeing process record
        if (colorStatus === ColorStatus.RAW && body.createDyeingProcess) {
            await db.dyeingProcess.create({
                data: {
                    threadPurchaseId: threadPurchase.id,
                    dyeDate: new Date(),
                    dyeQuantity: quantity,
                    outputQuantity: 0, // Will be updated after dyeing process is complete
                    resultStatus: "PENDING",
                },
            });
        }

        // If payment information is provided, create a payment record
        if (body.paymentAmount && body.paymentAmount > 0 && body.paymentMode) {
            await db.payment.create({
                data: {
                    amount: body.paymentAmount,
                    mode: body.paymentMode as PaymentMode,
                    threadPurchaseId: threadPurchase.id,
                    description: `Payment for thread purchase #${threadPurchase.id}`,
                    referenceNumber: body.paymentReference || null,
                    remarks: body.paymentRemarks || null,
                    transactionDate: new Date(),
                    updatedAt: new Date(),
                } as any,
            });
        }

        // Format the thread purchase for response
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
        };

        return NextResponse.json(
            {
                success: true,
                data: formattedThreadPurchase,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating thread purchase:", error);
        return NextResponse.json(
            { error: "Failed to create thread purchase" },
            { status: 500 },
        );
    }
}

// DELETE handler to delete a thread purchase by ID (For bulk deletion, use the specific endpoint)
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

        const threadId = parseInt(id);

        // Check if thread purchase exists
        const threadPurchase = await db.threadPurchase.findUnique({
            where: { id: threadId },
            include: {
                fabricProduction: true, // Use fabricProduction instead of fabricProductions and fix the take property
            },
        });

        if (!threadPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Check if it's used in fabric production - use type assertion to handle the relationship
        const fabricProd = (threadPurchase as any).fabricProduction;
        if (fabricProd && Array.isArray(fabricProd) && fabricProd.length > 0) {
            return NextResponse.json(
                {
                    error: "Cannot delete thread purchase that has been used in fabric production",
                },
                { status: 400 },
            );
        }

        // Delete dyeing process if it exists
        await db.dyeingProcess.deleteMany({
            where: { threadPurchaseId: threadId },
        });

        // Delete related payment transactions
        await db.payment.deleteMany({
            where: { threadPurchaseId: threadId },
        });

        // Delete related inventory transactions
        await db.inventoryTransaction.deleteMany({
            where: { threadPurchaseId: threadId },
        });

        // Delete the thread purchase
        await db.threadPurchase.delete({
            where: { id: threadId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting thread purchase:", error);
        return NextResponse.json(
            { error: "Failed to delete thread purchase" },
            { status: 500 },
        );
    }
}

// PATCH handler to update a thread purchase
export async function PATCH(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Thread purchase ID is required" },
                { status: 400 },
            );
        }

        const threadId = parseInt(id);
        const body = await req.json();

        // Update thread purchase
        const updatedThreadPurchase = await db.threadPurchase.update({
            where: { id: threadId },
            data: {
                threadType: body.threadType,
                color: body.color,
                colorStatus: body.colorStatus,
                quantity: body.quantity,
                unitPrice: body.unitPrice,
                totalCost:
                    body.totalCost ||
                    (body.quantity && body.unitPrice
                        ? body.quantity * body.unitPrice
                        : undefined),
                unitOfMeasure: body.unitOfMeasure,
                deliveryDate: body.deliveryDate
                    ? new Date(body.deliveryDate)
                    : null,
                remarks: body.remarks,
                reference: body.reference,
                received: body.received,
                receivedAt:
                    body.received && !body.receivedAt
                        ? new Date()
                        : body.receivedAt
                          ? new Date(body.receivedAt)
                          : null,
            },
            include: {
                vendor: true,
            },
        });

        // Format the response
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
        };

        return NextResponse.json({
            success: true,
            data: formattedThreadPurchase,
        });
    } catch (error) {
        console.error("Error updating thread purchase:", error);

        // Handle not found error
        if (
            error instanceof Error &&
            error.message.includes("Record to update not found")
        ) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(
            { error: "Failed to update thread purchase" },
            { status: 500 },
        );
    }
}
