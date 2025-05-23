import { NextResponse } from "next/server";

import {
    InventoryTransactionType,
    Prisma,
    ProductType,
    ProductionStatus,
} from "@prisma/client";

import { db } from "@/lib/db";

import { addRequiredFields } from "../../../lib/prisma-helpers";

/**
 * GET /api/fabric/production
 * Fetch all fabric production records
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");

        // Filtering params
        const fabricType = searchParams.get("fabricType");
        const status = searchParams.get("status");
        const searchQuery = searchParams.get("query") || "";
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
        const threadId = searchParams.get("threadId");
        const dyeingProcessId = searchParams.get("dyeingProcessId");

        // Build where clause
        const where: Prisma.FabricProductionWhereInput = {};

        if (fabricType) {
            where.fabricType = { contains: fabricType, mode: "insensitive" };
        }

        if (status) {
            where.status = status as ProductionStatus;
        }

        if (threadId) {
            where.sourceThreadId = parseInt(threadId);
        }

        if (dyeingProcessId) {
            where.dyeingProcessId = parseInt(dyeingProcessId);
        }

        if (searchQuery) {
            where.OR = [
                { fabricType: { contains: searchQuery, mode: "insensitive" } },
                { batchNumber: { contains: searchQuery, mode: "insensitive" } },
                { dimensions: { contains: searchQuery, mode: "insensitive" } },
            ];
        }

        // Set date filters
        if (fromDate || toDate) {
            where.productionDate = {};

            if (fromDate) {
                where.productionDate.gte = new Date(fromDate);
            }

            if (toDate) {
                where.productionDate.lte = new Date(toDate);
            }
        }

        // Fetch fabric productions with related data
        const [fabricProductions, totalCount] = await Promise.all([
            db.fabricProduction.findMany({
                where: {
                    status: "COMPLETED",
                },
                include: {
                    threadPurchase: {
                        include: {
                            vendor: true,
                        },
                    },
                    dyeingProcess: true,
                    inventoryTransaction: {
                        include: {
                            inventory: true,
                        },
                    },
                    salesOrderItem: {
                        take: 5,
                        orderBy: {
                            createdAt: "desc",
                        },
                        include: {
                            salesOrder: true,
                        },
                    },
                },
                orderBy: {
                    productionDate: "desc",
                },
            }),
            db.fabricProduction.count({ where }),
        ]);

        // Format the response
        const formattedProductions = fabricProductions.map((production) => {
            // Sales history formatting
            const salesHistoryFormatted =
                production.salesOrderItem?.map((sale) => {
                    return {
                        id: sale.id,
                        date: sale.createdAt,
                        quantity: sale.quantitySold,
                        orderNumber: sale.salesOrder?.orderNumber || "N/A",
                    };
                }) || [];

            // Inventory data formatting
            const inventoryData = production.inventoryTransaction?.length
                ? {
                      id: production.inventoryTransaction[0].inventory.id,
                      itemCode:
                          production.inventoryTransaction[0].inventory.itemCode,
                      currentQuantity:
                          production.inventoryTransaction[0].inventory
                              .currentQuantity,
                  }
                : null;

            // Check related resources
            const hasInventoryEntries =
                production.inventoryTransaction?.length > 0;
            const hasSalesOrders = production.salesOrderItem?.length > 0;

            // Get thread information
            const threadInfo = production.threadPurchase
                ? {
                      id: production.threadPurchase.id,
                      threadType: production.threadPurchase.threadType,
                      color: production.threadPurchase.color || null,
                      colorStatus: production.threadPurchase.colorStatus,
                      vendorId: production.threadPurchase.vendorId,
                  }
                : null;

            // Get dyeing process information
            const dyeingInfo = production.dyeingProcess
                ? {
                      id: production.dyeingProcess.id,
                      colorCode: production.dyeingProcess.colorCode || null,
                      colorName: production.dyeingProcess.colorName || null,
                      resultStatus: production.dyeingProcess.resultStatus,
                  }
                : null;

            return {
                id: production.id,
                fabricType: production.fabricType,
                dimensions: production.dimensions,
                batchNumber: production.batchNumber,
                quantityProduced: production.quantityProduced,
                threadUsed: production.threadUsed,
                threadWastage: production.threadWastage,
                unitOfMeasure: production.unitOfMeasure,
                productionCost: Number(production.productionCost),
                laborCost: production.laborCost
                    ? Number(production.laborCost)
                    : null,
                totalCost: Number(production.totalCost),
                remarks: production.remarks,
                status: production.status,
                inventoryStatus: hasInventoryEntries ? "UPDATED" : "PENDING",
                salesStatus: hasSalesOrders ? "SOLD" : "AVAILABLE",
                productionDate: production.productionDate.toISOString(),
                completionDate:
                    production.completionDate?.toISOString() || null,
                threadInfo,
                dyeingInfo,
                salesOrders: salesHistoryFormatted,
                inventoryData,
            };
        });

        return NextResponse.json({
            data: formattedProductions,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching fabric productions:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch fabric productions",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/fabric/production
 * Create a new fabric production record
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate required fields
        if (
            !(body.sourceThreadId || body.inventoryId) ||
            !body.fabricType ||
            !body.dimensions ||
            !body.batchNumber ||
            !body.quantityProduced ||
            !body.threadUsed
        ) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        // Validate quantities are positive numbers
        if (
            parseInt(body.quantityProduced) <= 0 ||
            parseInt(body.threadUsed) <= 0
        ) {
            return NextResponse.json(
                { error: "Quantities must be positive numbers" },
                { status: 400 },
            );
        }

        // Parse the date
        const productionDate = body.productionDate
            ? new Date(body.productionDate)
            : new Date();
        const completionDate = body.completionDate
            ? new Date(body.completionDate)
            : null;

        // Handle costs
        const productionCost = parseFloat(body.productionCost || "0");
        const laborCost = body.laborCost ? parseFloat(body.laborCost) : null;
        const totalCost = body.totalCost
            ? parseFloat(body.totalCost)
            : productionCost + (laborCost || 0);

        let threadPurchase = null;
        let threadInventory = null;
        let sourceThreadId = null;

        // Flag to control single inventory entry behavior
        const singleInventoryEntry = body.singleInventoryEntry === true;

        // Check if we're using inventory directly
        if (body.useInventoryDirectly && body.inventoryId) {
            // Get inventory item directly
            threadInventory = await db.inventory.findUnique({
                where: { id: parseInt(body.inventoryId) },
            });

            if (!threadInventory) {
                return NextResponse.json(
                    { error: "Inventory item not found" },
                    { status: 404 },
                );
            }

            // Try to find a thread purchase related to this inventory, but don't require it
            try {
                const transactions = await db.inventoryTransaction.findMany({
                    where: {
                        inventoryId: parseInt(body.inventoryId),
                        threadPurchaseId: { not: null },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                });

                if (
                    transactions.length > 0 &&
                    transactions[0].threadPurchaseId
                ) {
                    // Found a related thread purchase
                    sourceThreadId = transactions[0].threadPurchaseId;

                    // Get the thread purchase
                    threadPurchase = await db.threadPurchase.findUnique({
                        where: { id: sourceThreadId },
                    });
                } else {
                    // We need to create a placeholder thread purchase since the schema requires it
                    threadPurchase = await db.threadPurchase.create({
                        data: {
                            vendorId: 1, // Use a default vendor ID
                            threadType:
                                threadInventory.description || "Unknown",
                            colorStatus: "RAW",
                            quantity: threadInventory.currentQuantity,
                            unitPrice: threadInventory.costPerUnit,
                            totalCost:
                                Number(threadInventory.costPerUnit) *
                                threadInventory.currentQuantity,
                            unitOfMeasure: threadInventory.unitOfMeasure,
                            orderDate: new Date(),
                            received: true,
                            receivedAt: new Date(),
                        },
                    });
                    sourceThreadId = threadPurchase.id;

                    // Create a relation between inventory and thread purchase
                    await db.inventoryTransaction.create({
                        data: {
                            inventoryId: parseInt(body.inventoryId),
                            threadPurchaseId: sourceThreadId,
                            transactionType: "ADJUSTMENT",
                            quantity: 0, // This is just a linking transaction
                            remainingQuantity: threadInventory.currentQuantity,
                            unitCost: threadInventory.costPerUnit,
                            totalCost: 0,
                            notes: "Auto-created link for fabric production",
                            updatedAt: new Date(),
                        },
                    });
                }
            } catch (error) {
                console.error("Error handling thread purchase:", error);
                return NextResponse.json(
                    { error: "Failed to process inventory relationship" },
                    { status: 500 },
                );
            }
        } else if (body.sourceThreadId) {
            // Traditional flow - validate thread exists and find its inventory
            sourceThreadId = parseInt(body.sourceThreadId);
            threadPurchase = await db.threadPurchase.findUnique({
                where: { id: sourceThreadId },
                include: {
                    inventoryTransaction: {
                        include: {
                            inventory: true,
                        },
                    },
                },
            });

            if (!threadPurchase) {
                return NextResponse.json(
                    { error: "Thread purchase not found" },
                    { status: 404 },
                );
            }

            // Find thread inventory
            threadInventory = threadPurchase.inventoryTransaction[0]?.inventory;

            if (!threadInventory) {
                return NextResponse.json(
                    { error: "Thread inventory not found" },
                    { status: 404 },
                );
            }
        } else {
            return NextResponse.json(
                {
                    error: "Either sourceThreadId or inventoryId with useInventoryDirectly flag is required",
                },
                { status: 400 },
            );
        }

        // Check if there's enough thread
        if (threadInventory.currentQuantity < parseInt(body.threadUsed)) {
            return NextResponse.json(
                {
                    error: `Not enough thread in inventory. Available: ${threadInventory.currentQuantity}, Required: ${body.threadUsed}`,
                },
                { status: 400 },
            );
        }

        // Start a transaction - all database operations should be inside this transaction
        const result = await db.$transaction(
            async (tx) => {
                // Find or create fabric type inside transaction
                let fabricType = await tx.fabricType.findFirst({
                    where: {
                        name: { equals: body.fabricType, mode: "insensitive" },
                    },
                });

                if (!fabricType) {
                    fabricType = await tx.fabricType.create({
                        data: addRequiredFields({
                            name: body.fabricType,
                            units: body.unitOfMeasure || "meters",
                            description: `Fabric type for ${body.fabricType}`,
                        }),
                    });
                }

                // Check if there's an existing fabric inventory for this type when singleInventoryEntry is true
                let fabricInventory;
                let existingFabricInventory = null;

                if (singleInventoryEntry) {
                    // Look for existing fabric inventory with the same type
                    existingFabricInventory = await tx.inventory.findFirst({
                        where: {
                            productType: "FABRIC",
                            fabricTypeId: fabricType.id,
                            description: {
                                contains: `${body.fabricType} ${body.dimensions}`,
                            },
                        },
                    });

                    if (existingFabricInventory) {
                        // Update existing inventory instead of creating a new one
                        fabricInventory = await tx.inventory.update({
                            where: { id: existingFabricInventory.id },
                            data: {
                                currentQuantity:
                                    existingFabricInventory.currentQuantity +
                                    parseInt(body.quantityProduced),
                                lastRestocked: new Date(),
                                // Keep the existing costs as they are
                            },
                        });

                        console.log(
                            `Updated existing fabric inventory #${fabricInventory.id} with additional ${body.quantityProduced} units`,
                        );
                    } else {
                        // Create new inventory since none exists
                        fabricInventory = await tx.inventory.create({
                            data: addRequiredFields({
                                itemCode: `FAB-${Date.now().toString().slice(-6)}`,
                                description: `${body.fabricType} ${body.dimensions} (Batch: ${body.batchNumber})`,
                                productType: "FABRIC",
                                fabricTypeId: fabricType.id,
                                currentQuantity: parseInt(
                                    body.quantityProduced,
                                ),
                                unitOfMeasure: body.unitOfMeasure || "meters",
                                minStockLevel: 10,
                                costPerUnit:
                                    productionCost /
                                    parseInt(body.quantityProduced),
                                salePrice:
                                    (productionCost /
                                        parseInt(body.quantityProduced)) *
                                    1.4,
                                lastRestocked: new Date(),
                                location: "Production Department",
                                notes: `Produced from batch ${body.batchNumber}`,
                            }),
                        });
                    }
                } else {
                    // Original behavior - always create a new inventory item
                    fabricInventory = await tx.inventory.create({
                        data: addRequiredFields({
                            itemCode: `FAB-${Date.now().toString().slice(-6)}`,
                            description: `${body.fabricType} ${body.dimensions} (Batch: ${body.batchNumber})`,
                            productType: "FABRIC",
                            fabricTypeId: fabricType.id,
                            currentQuantity: parseInt(body.quantityProduced),
                            unitOfMeasure: body.unitOfMeasure || "meters",
                            minStockLevel: 10,
                            costPerUnit:
                                productionCost /
                                parseInt(body.quantityProduced),
                            salePrice:
                                (productionCost /
                                    parseInt(body.quantityProduced)) *
                                1.4,
                            lastRestocked: new Date(),
                            location: "Production Department",
                            notes: `Produced from batch ${body.batchNumber}`,
                        }),
                    });
                }

                // If dyeing process ID is provided, validate it exists and belongs to the thread
                if (body.dyeingProcessId && !body.useInventoryDirectly) {
                    const dyeingProcess = await tx.dyeingProcess.findUnique({
                        where: {
                            id: parseInt(body.dyeingProcessId),
                            threadPurchaseId: parseInt(body.sourceThreadId),
                        },
                    });

                    if (!dyeingProcess) {
                        throw new Error(
                            "Dyeing process not found or does not belong to the specified thread",
                        );
                    }
                }

                // Create the production record with appropriate source
                const newProduction = await tx.fabricProduction.create({
                    data: {
                        sourceThreadId: sourceThreadId,
                        dyeingProcessId: body.dyeingProcessId
                            ? parseInt(body.dyeingProcessId)
                            : null,
                        productionDate,
                        fabricType: body.fabricType,
                        dimensions: body.dimensions,
                        batchNumber: body.batchNumber,
                        quantityProduced: parseInt(body.quantityProduced),
                        threadUsed: parseInt(body.threadUsed),
                        threadWastage: body.threadWastage
                            ? parseInt(body.threadWastage)
                            : null,
                        unitOfMeasure: body.unitOfMeasure || "meters",
                        productionCost,
                        laborCost,
                        totalCost,
                        status: body.status || "PENDING",
                        completionDate,
                        remarks: body.remarks || null,
                        inventoryStatus: "UPDATED", // Mark as already added to inventory
                    },
                    include: {
                        threadPurchase: true,
                        dyeingProcess: true,
                    },
                });

                // Create inventory transaction for the produced fabric - production entry
                await tx.inventoryTransaction.create({
                    data: addRequiredFields({
                        inventoryId: fabricInventory.id,
                        transactionType: "PRODUCTION",
                        quantity: parseInt(body.quantityProduced),
                        remainingQuantity: fabricInventory.currentQuantity,
                        unitCost:
                            productionCost / parseInt(body.quantityProduced),
                        totalCost: productionCost,
                        referenceType: "FabricProduction",
                        referenceId: newProduction.id,
                        fabricProductionId: newProduction.id,
                        notes: `Fabric production from batch ${body.batchNumber}`,
                    }),
                });

                // Update thread inventory - reduce the amount used in production
                const updatedThreadQuantity =
                    threadInventory.currentQuantity - parseInt(body.threadUsed);

                // Update thread inventory quantity
                await tx.inventory.update({
                    where: { id: threadInventory.id },
                    data: {
                        currentQuantity: updatedThreadQuantity,
                    },
                });

                // Create inventory transaction for thread usage
                await tx.inventoryTransaction.create({
                    data: addRequiredFields({
                        inventoryId: threadInventory.id,
                        transactionType: "PRODUCTION",
                        quantity: -parseInt(body.threadUsed), // Negative to indicate usage
                        remainingQuantity: updatedThreadQuantity,
                        unitCost: threadPurchase?.unitPrice
                            ? Number(threadPurchase.unitPrice)
                            : Number(threadInventory.costPerUnit),
                        totalCost:
                            (threadPurchase?.unitPrice
                                ? Number(threadPurchase.unitPrice)
                                : Number(threadInventory.costPerUnit)) *
                            parseInt(body.threadUsed),
                        referenceType: "FabricProduction",
                        referenceId: newProduction.id,
                        fabricProductionId: newProduction.id,
                        notes: `Thread used in fabric production batch ${body.batchNumber}`,
                    }),
                });

                return {
                    production: newProduction,
                    fabricInventory: fabricInventory,
                    wasUpdated:
                        singleInventoryEntry &&
                        existingFabricInventory !== null,
                };
            },
            {
                timeout: 30000, // Increase timeout to 30 seconds
                maxWait: 35000, // Maximum time to wait for transaction to start
            },
        );

        return NextResponse.json(
            {
                success: true,
                message: "Fabric production created successfully",
                data: result.production,
                inventoryStatus: "UPDATED",
                inventoryData: {
                    id: result.fabricInventory.id,
                    itemCode: result.fabricInventory.itemCode,
                    quantity: result.fabricInventory.currentQuantity,
                    wasUpdated: result.wasUpdated,
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating fabric production:", error);

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes("Foreign key constraint failed")) {
                return NextResponse.json(
                    { error: "Invalid source thread ID or dyeing process ID" },
                    { status: 400 },
                );
            }

            if (error.message.includes("Not enough thread in inventory")) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 },
                );
            }

            if (error.message.includes("Dyeing process not found")) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 404 },
                );
            }
        }

        return NextResponse.json(
            {
                error: "Failed to create fabric production",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/fabric/production
 * Update an existing fabric production record
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: "Production ID is required" },
                { status: 400 },
            );
        }

        // Validate quantities if provided
        if (body.quantityProduced && parseInt(body.quantityProduced) <= 0) {
            return NextResponse.json(
                { error: "Quantity produced must be a positive number" },
                { status: 400 },
            );
        }

        if (body.threadUsed && parseInt(body.threadUsed) <= 0) {
            return NextResponse.json(
                { error: "Thread used must be a positive number" },
                { status: 400 },
            );
        }

        // Get existing production record
        const existingProduction = await db.fabricProduction.findUnique({
            where: { id: parseInt(body.id) },
            include: {
                threadPurchase: true,
                dyeingProcess: true,
                inventoryTransaction: {
                    include: {
                        inventory: true,
                    },
                },
            },
        });

        if (!existingProduction) {
            return NextResponse.json(
                { error: "Production record not found" },
                { status: 404 },
            );
        }

        // Prepare update data
        const updateData: Prisma.FabricProductionUpdateInput = {};

        // Only update fields that are provided
        if (body.fabricType) updateData.fabricType = body.fabricType;
        if (body.dimensions) updateData.dimensions = body.dimensions;
        if (body.batchNumber) updateData.batchNumber = body.batchNumber;
        if (body.quantityProduced)
            updateData.quantityProduced = parseInt(body.quantityProduced);
        if (body.threadUsed) updateData.threadUsed = parseInt(body.threadUsed);
        if (body.threadWastage)
            updateData.threadWastage = parseInt(body.threadWastage);
        if (body.unitOfMeasure) updateData.unitOfMeasure = body.unitOfMeasure;
        if (body.productionCost)
            updateData.productionCost = parseFloat(body.productionCost);
        if (body.laborCost) updateData.laborCost = parseFloat(body.laborCost);
        if (body.totalCost) updateData.totalCost = parseFloat(body.totalCost);
        if (body.status) updateData.status = body.status as ProductionStatus;
        if (body.remarks) updateData.remarks = body.remarks;

        // Handle dates
        if (body.productionDate)
            updateData.productionDate = new Date(body.productionDate);
        if (body.completionDate)
            updateData.completionDate = new Date(body.completionDate);
        if (
            body.status === "COMPLETED" &&
            !body.completionDate &&
            !existingProduction.completionDate
        ) {
            updateData.completionDate = new Date();
        }

        // Check for status and quantity changes
        const statusChanged =
            body.status && existingProduction.status !== body.status;
        const quantityProducedChanged =
            body.quantityProduced &&
            existingProduction.quantityProduced !==
                parseInt(body.quantityProduced);
        const threadUsedChanged =
            body.threadUsed &&
            existingProduction.threadUsed !== parseInt(body.threadUsed);

        // Use transaction to ensure data consistency
        const result = await db.$transaction(async (tx) => {
            // Perform the update
            const updatedProduction = await tx.fabricProduction.update({
                where: { id: parseInt(body.id) },
                data: updateData,
                include: {
                    threadPurchase: true,
                    dyeingProcess: true,
                    inventoryTransaction: {
                        include: {
                            inventory: true,
                        },
                    },
                },
            });

            let fabricInventoryUpdated = false;
            let threadInventoryUpdated = false;

            // Check if inventory needs updating
            const isCompleted = updatedProduction.status === "COMPLETED";
            const shouldUpdateInventory =
                ((statusChanged && isCompleted) ||
                    (quantityProducedChanged && isCompleted) ||
                    (threadUsedChanged && isCompleted)) &&
                body.updateInventory !== false;

            if (shouldUpdateInventory) {
                // Check if there are existing inventory entries
                const inventoryEntries = updatedProduction.inventoryTransaction;
                const hasInventoryEntries = inventoryEntries.length > 0;

                if (hasInventoryEntries) {
                    // Find the fabric inventory entry - only consider PRODUCTION transactions
                    const fabricInventoryEntry = inventoryEntries.find(
                        (entry) =>
                            entry.transactionType === "PRODUCTION" &&
                            entry.quantity > 0,
                    );

                    if (
                        fabricInventoryEntry &&
                        fabricInventoryEntry.inventory
                    ) {
                        const fabricInventory = fabricInventoryEntry.inventory;

                        // Only update if quantity produced has changed
                        if (quantityProducedChanged) {
                            // Calculate quantity difference for fabric
                            const newQuantity = parseInt(
                                body.quantityProduced as unknown as string,
                            );
                            const quantityDiff =
                                newQuantity -
                                existingProduction.quantityProduced;

                            if (quantityDiff !== 0) {
                                const newInventoryQuantity = Math.max(
                                    0,
                                    fabricInventory.currentQuantity +
                                        quantityDiff,
                                );

                                // Update fabric inventory quantity
                                await tx.inventory.update({
                                    where: { id: fabricInventory.id },
                                    data: {
                                        currentQuantity: newInventoryQuantity,
                                        lastRestocked:
                                            quantityDiff > 0
                                                ? new Date()
                                                : undefined,
                                    },
                                });

                                // Create a new inventory transaction for the adjustment
                                await tx.inventoryTransaction.create({
                                    data: addRequiredFields({
                                        inventoryId: fabricInventory.id,
                                        fabricProductionId:
                                            updatedProduction.id,
                                        transactionType:
                                            InventoryTransactionType.ADJUSTMENT,
                                        quantity: quantityDiff,
                                        remainingQuantity: newInventoryQuantity,
                                        unitCost:
                                            Number(
                                                updatedProduction.totalCost,
                                            ) / newQuantity,
                                        totalCost:
                                            Number(
                                                updatedProduction.totalCost,
                                            ) *
                                            (quantityDiff / newQuantity),
                                        transactionDate: new Date(),
                                        notes: `Quantity adjustment for fabric production #${updatedProduction.id}`,
                                        referenceType: "FabricProduction",
                                        referenceId: updatedProduction.id,
                                    }),
                                });

                                fabricInventoryUpdated = true;
                            }
                        }

                        // Check if thread usage changed and update thread inventory if needed
                        if (threadUsedChanged) {
                            // Find thread inventory entry - look for PRODUCTION transactions with negative quantity
                            const threadInventoryEntries =
                                inventoryEntries.filter(
                                    (entry) =>
                                        entry.transactionType ===
                                            "PRODUCTION" &&
                                        entry.quantity < 0 &&
                                        entry.inventory &&
                                        entry.inventory.productType ===
                                            "THREAD",
                                );

                            if (threadInventoryEntries.length > 0) {
                                const threadInventoryEntry =
                                    threadInventoryEntries[0];
                                const threadInventory =
                                    threadInventoryEntry.inventory;

                                const newThreadUsage = parseInt(
                                    body.threadUsed as unknown as string,
                                );
                                const oldThreadUsage =
                                    existingProduction.threadUsed;
                                const threadUsageDiff =
                                    newThreadUsage - oldThreadUsage;

                                if (threadUsageDiff !== 0) {
                                    // For increased usage, check if there's enough thread
                                    if (
                                        threadUsageDiff > 0 &&
                                        threadInventory.currentQuantity <
                                            threadUsageDiff
                                    ) {
                                        throw new Error(
                                            `Not enough thread in inventory. Available: ${threadInventory.currentQuantity}, Required: ${threadUsageDiff}`,
                                        );
                                    }

                                    const newThreadQuantity =
                                        threadInventory.currentQuantity -
                                        threadUsageDiff;

                                    // Update thread inventory quantity (opposite direction as it's consumption)
                                    await tx.inventory.update({
                                        where: { id: threadInventory.id },
                                        data: {
                                            currentQuantity: newThreadQuantity,
                                        },
                                    });

                                    // Create a new inventory transaction for the thread adjustment
                                    await tx.inventoryTransaction.create({
                                        data: addRequiredFields({
                                            inventoryId: threadInventory.id,
                                            fabricProductionId:
                                                updatedProduction.id,
                                            transactionType:
                                                InventoryTransactionType.ADJUSTMENT,
                                            quantity: -threadUsageDiff,
                                            remainingQuantity:
                                                newThreadQuantity,
                                            unitCost:
                                                threadInventory.costPerUnit,
                                            totalCost:
                                                Number(
                                                    threadInventory.costPerUnit,
                                                ) * threadUsageDiff,
                                            transactionDate: new Date(),
                                            notes: `Thread usage adjustment for fabric production #${updatedProduction.id}`,
                                            referenceType: "FabricProduction",
                                            referenceId: updatedProduction.id,
                                        }),
                                    });

                                    threadInventoryUpdated = true;
                                }
                            }
                        }
                    }
                } else if (isCompleted) {
                    // No existing inventory entries, create new ones similar to POST handler
                    // Check if fabric type exists or create it
                    let fabricType = await tx.fabricType.findFirst({
                        where: {
                            name: {
                                equals: updatedProduction.fabricType,
                                mode: "insensitive",
                            },
                        },
                    });

                    if (!fabricType) {
                        fabricType = await tx.fabricType.create({
                            data: addRequiredFields({
                                name: updatedProduction.fabricType,
                                units: updatedProduction.unitOfMeasure,
                                description: `Fabric type for ${updatedProduction.fabricType}`,
                            }),
                        });
                    }

                    // Generate a unique item code
                    const itemCode = `FAB-${updatedProduction.id}-${Date.now().toString().slice(-6)}`;

                    // Create inventory entry for the fabric
                    const inventoryItem = await tx.inventory.create({
                        data: addRequiredFields({
                            itemCode,
                            description: `${updatedProduction.fabricType} ${updatedProduction.dimensions} (Batch: ${updatedProduction.batchNumber})`,
                            productType: ProductType.FABRIC,
                            fabricTypeId: fabricType.id,
                            currentQuantity: updatedProduction.quantityProduced,
                            unitOfMeasure: updatedProduction.unitOfMeasure,
                            minStockLevel: body.minStockLevel || 10, // Default or specified minimum stock level
                            costPerUnit:
                                Number(updatedProduction.totalCost) /
                                updatedProduction.quantityProduced,
                            salePrice:
                                (Number(updatedProduction.totalCost) /
                                    updatedProduction.quantityProduced) *
                                (body.markup || 1.4), // Default or specified markup
                            lastRestocked: new Date(),
                            location: body.location || "Production Department",
                            notes: `Produced from batch ${updatedProduction.batchNumber}. Thread used: ${updatedProduction.threadUsed} ${updatedProduction.unitOfMeasure}`,
                        }),
                    });

                    // Create inventory transaction for produced fabric
                    await tx.inventoryTransaction.create({
                        data: addRequiredFields({
                            inventoryId: inventoryItem.id,
                            fabricProductionId: updatedProduction.id,
                            transactionType:
                                InventoryTransactionType.PRODUCTION,
                            quantity: updatedProduction.quantityProduced,
                            remainingQuantity:
                                updatedProduction.quantityProduced,
                            unitCost:
                                Number(updatedProduction.totalCost) /
                                updatedProduction.quantityProduced,
                            totalCost: Number(updatedProduction.totalCost),
                            transactionDate: new Date(),
                            notes: `Fabric produced in production #${updatedProduction.id}`,
                            referenceType: "FabricProduction",
                            referenceId: updatedProduction.id,
                        }),
                    });

                    fabricInventoryUpdated = true;

                    // Find the appropriate thread inventory to update
                    if (updatedProduction.threadPurchase) {
                        // Try to find thread inventory
                        const threadInventoryTransactions =
                            await tx.inventoryTransaction.findMany({
                                where: {
                                    OR: [
                                        {
                                            threadPurchaseId:
                                                updatedProduction.sourceThreadId,
                                        },
                                        {
                                            dyeingProcessId:
                                                updatedProduction.dyeingProcessId,
                                            dyeingProcess: {
                                                threadPurchaseId:
                                                    updatedProduction.sourceThreadId,
                                            },
                                        },
                                    ],
                                },
                                include: { inventory: true },
                                orderBy: { createdAt: "desc" },
                            });

                        if (threadInventoryTransactions.length > 0) {
                            const threadInventory =
                                threadInventoryTransactions[0].inventory;
                            const threadUsed = updatedProduction.threadUsed;

                            // Check if there's enough thread
                            if (threadInventory.currentQuantity < threadUsed) {
                                throw new Error(
                                    `Not enough thread in inventory. Available: ${threadInventory.currentQuantity}, Required: ${threadUsed}`,
                                );
                            }

                            const remainingThreadQuantity =
                                threadInventory.currentQuantity - threadUsed;

                            // Update thread inventory
                            await tx.inventory.update({
                                where: { id: threadInventory.id },
                                data: {
                                    currentQuantity: remainingThreadQuantity,
                                },
                            });

                            // Create inventory transaction for thread usage
                            await tx.inventoryTransaction.create({
                                data: addRequiredFields({
                                    inventoryId: threadInventory.id,
                                    fabricProductionId: updatedProduction.id,
                                    transactionType:
                                        InventoryTransactionType.PRODUCTION,
                                    quantity: -threadUsed,
                                    remainingQuantity: remainingThreadQuantity,
                                    unitCost: threadInventory.costPerUnit,
                                    totalCost:
                                        Number(threadInventory.costPerUnit) *
                                        threadUsed,
                                    transactionDate: new Date(),
                                    notes: `Thread used in fabric production #${updatedProduction.id}`,
                                    referenceType: "FabricProduction",
                                    referenceId: updatedProduction.id,
                                }),
                            });

                            threadInventoryUpdated = true;
                        }
                    }
                }
            }

            return {
                production: updatedProduction,
                fabricInventoryUpdated,
                threadInventoryUpdated,
            };
        });

        return NextResponse.json({
            success: true,
            data: result.production,
            inventoryStatus: {
                fabricUpdated: result.fabricInventoryUpdated,
                threadUpdated: result.threadInventoryUpdated,
            },
        });
    } catch (error) {
        console.error("Error updating fabric production:", error);

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes("Not enough thread in inventory")) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 },
                );
            }
        }

        return NextResponse.json(
            {
                error: "Failed to update fabric production",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/fabric/production
 * Delete a fabric production record
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Fabric production ID is required" },
                { status: 400 },
            );
        }

        const productionId = parseInt(id);

        // Check if the production exists and has related entities
        const production = await db.fabricProduction.findUnique({
            where: { id: productionId },
            include: {
                salesOrderItem: { take: 1 },
                inventoryTransaction: {
                    include: {
                        inventory: true,
                    },
                },
            },
        });

        if (!production) {
            return NextResponse.json(
                { error: "Fabric production not found" },
                { status: 404 },
            );
        }

        // Check if it has related sales orders
        if (production.salesOrderItem.length > 0) {
            return NextResponse.json(
                {
                    error: "Cannot delete fabric production that has related sales orders",
                },
                { status: 400 },
            );
        }

        // Use a transaction to ensure all related records are deleted
        await db.$transaction(async (tx) => {
            // First find all related inventory transactions
            const inventoryTransactions = production.inventoryTransaction;

            // Delete inventory transactions
            await tx.inventoryTransaction.deleteMany({
                where: { fabricProductionId: productionId },
            });

            // Restore thread inventory quantities if inventory transactions decreased them
            for (const transaction of inventoryTransactions) {
                // If transaction reduced inventory (negative quantity), restore that quantity
                if (transaction.quantity < 0 && transaction.inventory) {
                    // Restore inventory
                    await tx.inventory.update({
                        where: { id: transaction.inventoryId },
                        data: {
                            currentQuantity:
                                transaction.inventory.currentQuantity -
                                transaction.quantity, // Negative quantity, so subtract it
                        },
                    });
                } else if (
                    transaction.quantity > 0 &&
                    transaction.inventory?.productType === "FABRIC"
                ) {
                    // This is a created fabric inventory - can optionally delete it
                    // Check if this fabric has any other transactions
                    const otherTransactions =
                        await tx.inventoryTransaction.count({
                            where: {
                                inventoryId: transaction.inventoryId,
                                fabricProductionId: { not: productionId },
                            },
                        });

                    // If no other transactions, delete the fabric inventory item
                    if (otherTransactions === 0) {
                        await tx.inventory.delete({
                            where: { id: transaction.inventoryId },
                        });
                    }
                }
            }

            // Delete the fabric production record
            await tx.fabricProduction.delete({
                where: { id: productionId },
            });
        });

        return NextResponse.json({
            success: true,
            message:
                "Fabric production and related inventory records deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting fabric production:", error);
        return NextResponse.json(
            {
                error: "Failed to delete fabric production",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
