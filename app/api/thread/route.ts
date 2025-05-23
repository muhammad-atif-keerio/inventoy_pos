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

// Define interface for inventory data
interface InventoryData {
    inventoryId: number;
    currentQuantity: number;
    itemCode: string;
    location: string;
    description: string;
    productType: ProductType;
    threadTypeId?: number | null;
    threadTypeName?: string | null;
    unitOfMeasure: string;
    costPerUnit: number;
    salePrice: number;
    lastRestocked: string | null;
}

// Define interface for formatted thread purchase
interface FormattedThreadPurchase {
    id: number;
    vendorId: number;
    vendorName: string;
    orderDate: string;
    threadType: string;
    color: string | null;
    colorStatus: ColorStatus;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    unitOfMeasure: string;
    deliveryDate: string | null;
    received: boolean;
    receivedAt: string | null;
    hasDyeingProcess: boolean;
    dyeingProcessId: number | null;
    dyeingStatus: string | null;
    dyedColor: string | null;
    dyeingCompleted: boolean;
    inventory: InventoryData | null;
}

// GET handler to fetch all thread purchases with pagination, filtering, and sorting
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Check if we should fetch directly from inventory instead of thread purchases
        const fetchFromInventory =
            searchParams.get("fetchFromInventory") === "true";

        if (fetchFromInventory) {
            // Directly fetch thread inventory
            return await _getThreadsFromInventory(searchParams);
        }

        // Filtering parameters
        const colorStatus = searchParams.get("colorStatus");
        const received = searchParams.get("received");
        const vendorId = searchParams.get("vendorId");
        const search = searchParams.get("search");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "1000"); // Increased default limit
        const skip = (page - 1) * limit;
        const includeInventory =
            searchParams.get("includeInventory") === "true";
        // Set includeAll to true by default to include all threads regardless of status
        // const includeAll = searchParams.get("includeAll") !== "false";

        // Build the where clause
        const where: Prisma.ThreadPurchaseWhereInput = {};

        // Only apply colorStatus filter if explicity specified
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

        console.log("Thread query where clause:", JSON.stringify(where));

        // Fetch thread purchases
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
                } as Prisma.ThreadPurchaseInclude & {
                    dyeingProcess?: {
                        select: {
                            id: boolean;
                            resultStatus: boolean;
                            colorName: boolean;
                            colorCode: boolean;
                            completionDate: boolean;
                        };
                        orderBy: {
                            dyeDate: string;
                        };
                    };
                },
            }),
            db.threadPurchase.count({ where }),
        ]);

        console.log(`Found ${threadPurchases.length} thread purchases`);

        // Prepare formatted thread purchases
        let formattedThreadPurchases: FormattedThreadPurchase[] =
            threadPurchases.map((purchase: any) => {
                // Get the most recent dyeing process if any
                const dyeingProcess =
                    purchase.dyeingProcess && purchase.dyeingProcess.length > 0
                        ? purchase.dyeingProcess[0]
                        : null;

                const formatted = {
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
                    dyeingCompleted: dyeingProcess?.completionDate
                        ? true
                        : false,
                    inventory: null, // Default inventory data
                };

                return formatted;
            });

        console.log(
            `Formatted ${formattedThreadPurchases.length} thread purchases`,
        );

        // If inventory data is requested, fetch and add it separately
        if (includeInventory) {
            const purchaseIds = threadPurchases.map((p) => p.id);

            console.log(
                `Fetching inventory for ${purchaseIds.length} thread purchases`,
            );

            try {
                // Fetch inventory data for these thread purchases
                const inventoryTransactions =
                    await db.inventoryTransaction.findMany({
                        where: {
                            threadPurchaseId: {
                                in: purchaseIds,
                            },
                        },
                        include: {
                            inventory: {
                                include: {
                                    threadType: true,
                                },
                            },
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                    });

                console.log(
                    `Found ${inventoryTransactions.length} inventory transactions`,
                );

                // Group inventory transactions by thread purchase ID
                const inventoryByThreadId: Record<
                    number,
                    typeof inventoryTransactions
                > = {};

                for (const transaction of inventoryTransactions) {
                    if (transaction.threadPurchaseId) {
                        if (
                            !inventoryByThreadId[transaction.threadPurchaseId]
                        ) {
                            inventoryByThreadId[transaction.threadPurchaseId] =
                                [];
                        }
                        inventoryByThreadId[transaction.threadPurchaseId].push(
                            transaction,
                        );
                    }
                }

                const threadIdsWithInventory =
                    Object.keys(inventoryByThreadId).map(Number);
                console.log(
                    `Found inventory for ${threadIdsWithInventory.length} threads`,
                );

                // Update formatted thread purchases with inventory data
                formattedThreadPurchases = formattedThreadPurchases.map(
                    (thread) => {
                        const transactions = inventoryByThreadId[thread.id];
                        if (transactions && transactions.length > 0) {
                            const latestTransaction = transactions[0];
                            return {
                                ...thread,
                                inventory: {
                                    inventoryId: latestTransaction.inventory.id,
                                    currentQuantity:
                                        latestTransaction.inventory
                                            .currentQuantity,
                                    itemCode:
                                        latestTransaction.inventory.itemCode,
                                    location:
                                        latestTransaction.inventory.location ||
                                        "Unknown",
                                    description:
                                        latestTransaction.inventory
                                            .description || "",
                                    productType:
                                        latestTransaction.inventory.productType,
                                    threadTypeId:
                                        latestTransaction.inventory
                                            .threadTypeId,
                                    threadTypeName:
                                        latestTransaction.inventory.threadType
                                            ?.name,
                                    unitOfMeasure:
                                        latestTransaction.inventory
                                            .unitOfMeasure,
                                    costPerUnit: Number(
                                        latestTransaction.inventory.costPerUnit,
                                    ),
                                    salePrice: Number(
                                        latestTransaction.inventory.salePrice,
                                    ),
                                    lastRestocked:
                                        latestTransaction.inventory.lastRestocked?.toISOString() ||
                                        null,
                                },
                            };
                        }
                        return thread;
                    },
                );
            } catch (error) {
                console.error("Error fetching inventory data:", error);
                // Continue with the response even if inventory fetch fails
            }
        }

        return NextResponse.json({
            success: true,
            data: formattedThreadPurchases,
            meta: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching thread purchases:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread purchases" },
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

// Helper function to get threads directly from inventory
async function _getThreadsFromInventory(searchParams: URLSearchParams) {
    try {
        const search = searchParams.get("search");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "100");
        const skip = (page - 1) * limit;

        // Build where clause for inventory
        const where: Prisma.InventoryWhereInput = {
            productType: ProductType.THREAD,
        };

        if (search) {
            where.OR = [
                { itemCode: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                {
                    threadType: {
                        name: { contains: search, mode: "insensitive" },
                    },
                },
            ];
        }

        console.log(
            "Fetching inventory with where clause:",
            JSON.stringify(where),
        );

        // Fetch inventory items of type THREAD
        const [inventoryItems, totalCount] = await Promise.all([
            db.inventory.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    lastRestocked: "desc",
                },
                include: {
                    threadType: true,
                },
            }),
            db.inventory.count({ where }),
        ]);

        console.log(`Found ${inventoryItems.length} inventory items`);

        // Format inventory items
        const formattedItems = inventoryItems.map((item) => ({
            inventoryId: item.id,
            itemCode: item.itemCode,
            description: item.description || "",
            threadTypeId: item.threadTypeId,
            threadTypeName: item.threadType?.name || "Unknown",
            currentQuantity: item.currentQuantity,
            unitOfMeasure: item.unitOfMeasure,
            location: item.location || "Unknown",
            costPerUnit: Number(item.costPerUnit),
            salePrice: Number(item.salePrice),
            productType: item.productType,
            lastRestocked: item.lastRestocked?.toISOString() || null,
            minStockLevel: item.minStockLevel,
        }));

        return NextResponse.json({
            success: true,
            data: formattedItems,
            meta: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching threads from inventory:", error);
        return NextResponse.json(
            { error: "Failed to fetch threads from inventory" },
            { status: 500 },
        );
    }
}
