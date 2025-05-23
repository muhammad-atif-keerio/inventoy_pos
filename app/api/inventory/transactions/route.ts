import { NextResponse } from "next/server";

import { InventoryTransactionType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/inventory/transactions - Fetch inventory transactions with optional filtering
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const path = url.pathname;

        // Special case for /all endpoint
        if (path.endsWith("/all")) {
            // This is an internal API to get all transactions with source references
            // to determine what items have already been imported

            // Limit to only the fields we need to check imported status
            const transactions = await db.inventoryTransaction.findMany({
                select: {
                    id: true,
                    inventoryId: true,
                    transactionType: true,
                    threadPurchaseId: true,
                    dyeingProcessId: true,
                    fabricProductionId: true,
                    salesOrderId: true,
                },
            });

            return NextResponse.json(transactions);
        }

        // Regular transactions endpoint logic
        const { searchParams } = new URL(request.url);

        // Pagination
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Filtering params
        const inventoryId = searchParams.get("inventoryId");
        const type = searchParams.get("type");
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
        const includeRelations =
            searchParams.get("includeRelations") === "true";

        // Build where clause
        const where: Prisma.InventoryTransactionWhereInput = {};

        if (inventoryId) {
            where.inventoryId = parseInt(inventoryId);
        }

        if (type) {
            where.transactionType = type as InventoryTransactionType;
        }

        // Date range filter
        if (fromDate || toDate) {
            where.transactionDate = {};
            if (fromDate) {
                where.transactionDate.gte = new Date(fromDate);
            }
            if (toDate) {
                where.transactionDate.lte = new Date(toDate);
            }
        }

        // Setup include object for related data
        const includeObj: Prisma.InventoryTransactionInclude = {
            inventory: true,
        };

        if (includeRelations) {
            includeObj.threadPurchase = true;
            includeObj.dyeingProcess = true;
            includeObj.fabricProduction = true;
            includeObj.salesOrder = true;
        }

        // Fetch transactions with pagination
        const [transactions, totalCount] = await Promise.all([
            db.inventoryTransaction.findMany({
                where,
                skip,
                take: limit,
                include: includeObj,
                orderBy: {
                    transactionDate: "desc",
                },
            }),
            db.inventoryTransaction.count({ where }),
        ]);

        // Format response for client
        const formattedTransactions = transactions.map((tx) => ({
            id: tx.id,
            inventoryId: tx.inventoryId,
            inventory: tx.inventory
                ? {
                      id: tx.inventory.id,
                      itemCode: tx.inventory.itemCode,
                      description: tx.inventory.description,
                      productType: tx.inventory.productType,
                      currentQuantity: tx.inventory.currentQuantity,
                      unitOfMeasure: tx.inventory.unitOfMeasure,
                  }
                : null,
            transactionType: tx.transactionType,
            transactionDate: tx.transactionDate.toISOString(),
            quantity: tx.quantity,
            remainingQuantity: tx.remainingQuantity,
            unitCost: tx.unitCost ? Number(tx.unitCost) : null,
            totalCost: tx.totalCost ? Number(tx.totalCost) : null,
            referenceType: tx.referenceType,
            referenceId: tx.referenceId,
            notes: tx.notes,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            // Add related entities if requested and available
            threadPurchase:
                includeRelations && tx.threadPurchase
                    ? {
                          id: tx.threadPurchase.id,
                          threadType: tx.threadPurchase.threadType,
                          vendorId: tx.threadPurchase.vendorId,
                      }
                    : null,
            dyeingProcess:
                includeRelations && tx.dyeingProcess
                    ? {
                          id: tx.dyeingProcess.id,
                          colorName: tx.dyeingProcess.colorName,
                          colorCode: tx.dyeingProcess.colorCode,
                      }
                    : null,
            fabricProduction:
                includeRelations && tx.fabricProduction
                    ? {
                          id: tx.fabricProduction.id,
                          fabricType: tx.fabricProduction.fabricType,
                          dimensions: tx.fabricProduction.dimensions,
                      }
                    : null,
            salesOrder:
                includeRelations && tx.salesOrder
                    ? {
                          id: tx.salesOrder.id,
                          orderNumber: tx.salesOrder.orderNumber,
                          customerId: tx.salesOrder.customerId,
                      }
                    : null,
        }));

        return NextResponse.json({
            data: formattedTransactions,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching inventory transactions:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch inventory transactions",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/inventory/transactions - Create a new inventory transaction
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Check if this is a create inventory request or a transaction on existing inventory
        const isNewInventoryRequest =
            body.itemCode && body.description && body.type && !body.inventoryId;

        if (isNewInventoryRequest) {
            // This is a request to create a new inventory item with initial transaction
            // Validate required fields for new inventory
            if (
                !body.itemCode ||
                !body.description ||
                !body.type ||
                !body.quantity ||
                !body.unit
            ) {
                return NextResponse.json(
                    {
                        error: "Missing required fields for new inventory",
                        required: [
                            "itemCode",
                            "description",
                            "type",
                            "quantity",
                            "unit",
                        ],
                    },
                    { status: 400 },
                );
            }

            // Create new inventory item and initial transaction in a transaction
            const result = await db.$transaction(async (tx) => {
                // Create the inventory item first
                const inventoryItem = await tx.inventory.create({
                    data: {
                        itemCode: body.itemCode,
                        description: body.description,
                        productType: body.type.toUpperCase(), // Convert to uppercase to match enum
                        currentQuantity: body.quantity,
                        unitOfMeasure: body.unit,
                        costPerUnit: body.unitCost || 0,
                        salePrice: body.unitCost ? body.unitCost * 1.2 : 0, // Default 20% markup
                        minStockLevel: body.minStockLevel || 0,
                        location: body.location || null,
                        threadTypeId: body.threadTypeId || null,
                        fabricTypeId: body.fabricTypeId || null,
                        notes: body.notes || null,
                    },
                });

                // Create initial transaction
                const transaction = await tx.inventoryTransaction.create({
                    data: {
                        inventoryId: inventoryItem.id,
                        transactionType:
                            body.transactionType ||
                            InventoryTransactionType.PURCHASE,
                        transactionDate: body.transactionDate
                            ? new Date(body.transactionDate)
                            : new Date(),
                        quantity: body.quantity,
                        remainingQuantity: body.quantity,
                        unitCost: body.unitCost || null,
                        totalCost:
                            body.totalCost ||
                            (body.unitCost
                                ? body.unitCost * body.quantity
                                : null),
                        referenceType: body.referenceType || null,
                        referenceId: body.referenceId || null,
                        threadPurchaseId: body.threadPurchaseId || null,
                        dyeingProcessId: body.dyeingProcessId || null,
                        fabricProductionId: body.fabricProductionId || null,
                        salesOrderId: body.salesOrderId || null,
                        notes: body.notes || null,
                    },
                });

                // If source item IDs are provided, update their inventory status
                if (body.threadPurchaseId) {
                    await tx.threadPurchase.update({
                        where: { id: body.threadPurchaseId },
                        data: { inventoryStatus: "ADDED" },
                    });
                }

                if (body.dyeingProcessId) {
                    await tx.dyeingProcess.update({
                        where: { id: body.dyeingProcessId },
                        data: { inventoryStatus: "ADDED" },
                    });
                }

                if (body.fabricProductionId) {
                    await tx.fabricProduction.update({
                        where: { id: body.fabricProductionId },
                        data: { inventoryStatus: "ADDED" },
                    });
                }

                return { transaction, inventory: inventoryItem };
            });

            return NextResponse.json(
                {
                    success: true,
                    transaction: result.transaction,
                    inventory: result.inventory,
                },
                { status: 201 },
            );
        } else {
            // This is a regular transaction on existing inventory
            // Validate required fields
            if (!body.inventoryId || !body.transactionType || !body.quantity) {
                return NextResponse.json(
                    {
                        error: "Missing required fields",
                        required: [
                            "inventoryId",
                            "transactionType",
                            "quantity",
                        ],
                    },
                    { status: 400 },
                );
            }

            // Check if inventory item exists
            const inventoryItem = await db.inventory.findUnique({
                where: { id: body.inventoryId },
            });

            if (!inventoryItem) {
                return NextResponse.json(
                    { error: "Inventory item not found" },
                    { status: 404 },
                );
            }

            // Calculate new quantity based on transaction type
            let newQuantity = inventoryItem.currentQuantity;

            switch (body.transactionType) {
                case InventoryTransactionType.PURCHASE:
                case InventoryTransactionType.PRODUCTION:
                case InventoryTransactionType.ADJUSTMENT:
                    newQuantity += body.quantity;
                    break;
                case InventoryTransactionType.SALES:
                case InventoryTransactionType.TRANSFER:
                    if (body.quantity > inventoryItem.currentQuantity) {
                        return NextResponse.json(
                            {
                                error: "Insufficient quantity available for transaction",
                            },
                            { status: 400 },
                        );
                    }
                    newQuantity -= body.quantity;
                    break;
            }

            // Create the transaction and update inventory in a transaction
            const result = await db.$transaction(async (tx) => {
                // Create new transaction
                const transaction = await tx.inventoryTransaction.create({
                    data: {
                        inventoryId: body.inventoryId,
                        transactionType: body.transactionType,
                        transactionDate: body.transactionDate
                            ? new Date(body.transactionDate)
                            : new Date(),
                        quantity: body.quantity,
                        remainingQuantity: newQuantity,
                        unitCost: body.unitCost || null,
                        totalCost:
                            body.totalCost ||
                            (body.unitCost
                                ? body.unitCost * body.quantity
                                : null),
                        referenceType: body.referenceType || null,
                        referenceId: body.referenceId || null,
                        threadPurchaseId: body.threadPurchaseId || null,
                        dyeingProcessId: body.dyeingProcessId || null,
                        fabricProductionId: body.fabricProductionId || null,
                        salesOrderId: body.salesOrderId || null,
                        notes: body.notes || null,
                    },
                });

                // Update inventory quantity
                const updatedInventory = await tx.inventory.update({
                    where: { id: body.inventoryId },
                    data: {
                        currentQuantity: newQuantity,
                        lastRestocked:
                            body.transactionType ===
                                InventoryTransactionType.PURCHASE ||
                            body.transactionType ===
                                InventoryTransactionType.PRODUCTION
                                ? new Date()
                                : undefined,
                    },
                });

                // If source item IDs are provided, update their inventory status
                if (body.threadPurchaseId) {
                    await tx.threadPurchase.update({
                        where: { id: body.threadPurchaseId },
                        data: { inventoryStatus: "ADDED" },
                    });
                }

                if (body.dyeingProcessId) {
                    await tx.dyeingProcess.update({
                        where: { id: body.dyeingProcessId },
                        data: { inventoryStatus: "ADDED" },
                    });
                }

                if (body.fabricProductionId) {
                    await tx.fabricProduction.update({
                        where: { id: body.fabricProductionId },
                        data: { inventoryStatus: "ADDED" },
                    });
                }

                return { transaction, updatedInventory };
            });

            // Format the response
            const formattedResponse = {
                id: result.transaction.id,
                inventoryId: result.transaction.inventoryId,
                inventoryDetails: {
                    id: result.updatedInventory.id,
                    itemCode: result.updatedInventory.itemCode,
                    description: result.updatedInventory.description,
                    previousQuantity: inventoryItem.currentQuantity,
                    newQuantity: result.updatedInventory.currentQuantity,
                },
                transactionType: result.transaction.transactionType,
                transactionDate:
                    result.transaction.transactionDate.toISOString(),
                quantity: result.transaction.quantity,
                remainingQuantity: result.transaction.remainingQuantity,
                unitCost: result.transaction.unitCost
                    ? Number(result.transaction.unitCost)
                    : null,
                totalCost: result.transaction.totalCost
                    ? Number(result.transaction.totalCost)
                    : null,
                notes: result.transaction.notes,
                createdAt: result.transaction.createdAt.toISOString(),
            };

            return NextResponse.json(
                {
                    success: true,
                    data: formattedResponse,
                },
                { status: 201 },
            );
        }
    } catch (error) {
        console.error("Error creating inventory transaction:", error);
        return NextResponse.json(
            {
                error: "Failed to create inventory transaction",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
