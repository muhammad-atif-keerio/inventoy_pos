// app/api/inventory/route.ts
import { NextResponse } from "next/server";

import { InventoryTransactionType, Prisma, ProductType } from "@prisma/client";
import { randomUUID } from "crypto";

import { db } from "@/lib/db";

/**
 * API Error handler that properly formats error responses
 */
const handleApiError = (error: unknown): NextResponse => {
    console.error("API Error:", error);

    const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

    // Add detailed logging for debugging
    const errorDetails = {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
    };

    console.error("API Error Details:", JSON.stringify(errorDetails, null, 2));

    return NextResponse.json(
        {
            error: errorMessage,
            timestamp: new Date().toISOString(),
        },
        { status: 500 },
    );
};

// Function to generate test inventory data
async function generateTestInventoryData(count = 5) {
    console.log(`[DEBUG] Generating ${count} test inventory items`);

    // Create test thread types if they don't exist
    let threadType = await db.threadType.findFirst();
    if (!threadType) {
        threadType = await db.threadType.create({
            data: {
                name: "Test Cotton Thread",
                description: "Cotton thread for testing",
                units: "meters",
            },
        });
        console.log("[DEBUG] Created test thread type:", threadType);
    }

    // Create test fabric type if it doesn't exist
    let fabricType = await db.fabricType.findFirst();
    if (!fabricType) {
        fabricType = await db.fabricType.create({
            data: {
                name: "Test Cotton Fabric",
                description: "Cotton fabric for testing",
                units: "meters",
            },
        });
        console.log("[DEBUG] Created test fabric type:", fabricType);
    }

    const testItems = [];

    // Create test inventory items
    for (let i = 0; i < count; i++) {
        const isThread = i % 2 === 0;
        const itemCode = `TEST-${isThread ? "TH" : "FB"}-${randomUUID().substring(0, 6)}`;

        try {
            const item = await db.inventory.create({
                data: {
                    itemCode,
                    description: isThread
                        ? `Test ${threadType.name} - ${i + 1}`
                        : `Test ${fabricType.name} - ${i + 1}`,
                    productType: isThread ? "THREAD" : "FABRIC",
                    currentQuantity: Math.floor(Math.random() * 100) + 20,
                    unitOfMeasure: isThread ? "meters" : "meters",
                    minStockLevel: 10,
                    costPerUnit: Math.random() * 50 + 10,
                    salePrice: Math.random() * 100 + 20,
                    location: "Test Warehouse",
                    notes: "Test item generated for debugging",
                    threadTypeId: isThread ? threadType.id : null,
                    fabricTypeId: !isThread ? fabricType.id : null,
                    // Transactions are handled separately for type safety
                },
                include: {
                    threadType: true,
                    fabricType: true,
                },
            });

            // Create initial inventory transaction
            await db.inventoryTransaction.create({
                data: {
                    inventoryId: item.id,
                    transactionType: "ADJUSTMENT",
                    quantity: 100,
                    remainingQuantity: 100,
                    unitCost: 15,
                    totalCost: 1500,
                    notes: "Initial test transaction",
                },
            });

            testItems.push(item);
            console.log(
                `[DEBUG] Created test inventory item: ${item.itemCode}`,
            );
        } catch (error) {
            console.error(
                `[DEBUG] Error creating test item ${itemCode}:`,
                error,
            );
        }
    }

    return testItems;
}

// GET /api/inventory - Fetch all inventory items
export async function GET(request: Request) {
    console.log("[Inventory API] GET request received:", request.url);

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const type = searchParams.get("type");
        const inStock = searchParams.get("inStock");
        const lowStock = searchParams.get("lowStock");

        // Special debug parameter to generate test data (use with caution!)
        const generateTestData =
            searchParams.get("generateTestData") === "true";
        if (generateTestData) {
            const count = parseInt(searchParams.get("count") || "5");
            const testItems = await generateTestInventoryData(count);

            return NextResponse.json({
                message: `Generated ${testItems.length} test inventory items`,
                items: testItems.map((item) => formatInventoryItem(item)),
                total: testItems.length,
            });
        }

        // Build the where clause for filtering
        const where: Prisma.InventoryWhereInput = {};

        // Add text search filter
        if (search) {
            where.OR = [
                { itemCode: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                {
                    threadType: {
                        name: { contains: search, mode: "insensitive" },
                    },
                },
                {
                    fabricType: {
                        name: { contains: search, mode: "insensitive" },
                    },
                },
            ];
        }

        // Add type filter
        if (type) {
            where.productType = type as ProductType;
        }

        // Add stock level filters
        if (inStock === "true") {
            where.currentQuantity = { gt: 0 };
        } else if (inStock === "false") {
            where.currentQuantity = { lte: 0 };
        }

        // For low stock items, we'll fetch all items and filter them in-memory
        // since Prisma doesn't support direct comparison between two fields
        const shouldFilterLowStock = lowStock === "true";

        // Determine the pagination params
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Execute the query
        const inventoryItems = await db.inventory.findMany({
            where,
            include: {
                threadType: true,
                fabricType: true,
                inventoryTransaction: {
                    take: 5,
                    orderBy: {
                        transactionDate: "desc",
                    },
                },
            } as Prisma.InventoryInclude & {
                inventoryTransaction?: {
                    take: number;
                    orderBy: {
                        transactionDate: "desc";
                    };
                };
            },
            orderBy: {
                updatedAt: "desc",
            },
            take: limit,
            skip: offset,
        });

        // Count total records for pagination
        const totalCount = await db.inventory.count({ where });

        // Filter for low stock items if requested
        let filteredItems = inventoryItems;
        if (shouldFilterLowStock) {
            filteredItems = inventoryItems.filter(
                (item) => item.currentQuantity <= item.minStockLevel,
            );
        }

        // Format the items for the response
        const formattedItems = filteredItems.map((item) =>
            formatInventoryItem(item),
        );

        // Return the formatted items - Always use consistent structure with 'items' property
        return NextResponse.json({
            items: formattedItems,
            total: totalCount,
            limit,
            offset,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * Format an inventory item to ensure decimal fields are converted to numbers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatInventoryItem(item: any) {
    // Convert Decimal values to numbers and format dates
    const formattedItem = {
        id: item.id,
        itemCode: item.itemCode,
        description: item.description,
        productType: item.productType,
        threadTypeId: item.threadTypeId,
        threadType: item.threadType
            ? {
                  id: item.threadType.id,
                  name: item.threadType.name,
                  description: item.threadType.description,
                  units: item.threadType.units,
              }
            : null,
        fabricTypeId: item.fabricTypeId,
        fabricType: item.fabricType
            ? {
                  id: item.fabricType.id,
                  name: item.fabricType.name,
                  description: item.fabricType.description,
                  units: item.fabricType.units,
              }
            : null,
        currentQuantity: item.currentQuantity,
        unitOfMeasure: item.unitOfMeasure,
        location: item.location,
        minStockLevel: item.minStockLevel,
        costPerUnit:
            typeof item.costPerUnit === "object" && item.costPerUnit !== null
                ? parseFloat(item.costPerUnit.toString())
                : item.costPerUnit,
        salePrice:
            typeof item.salePrice === "object" && item.salePrice !== null
                ? parseFloat(item.salePrice.toString())
                : item.salePrice,
        lastRestocked: item.lastRestocked
            ? item.lastRestocked.toISOString()
            : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        notes: item.notes,
        // Include recent transactions if available
        recentTransactions: Array.isArray(item.inventoryTransaction)
            ? item.inventoryTransaction.map(
                  (tx: {
                      id: number;
                      transactionType: string;
                      quantity: number;
                      transactionDate: Date;
                      notes: string | null;
                  }) => ({
                      id: tx.id,
                      transactionType: tx.transactionType,
                      quantity: tx.quantity,
                      transactionDate: tx.transactionDate.toISOString(),
                      notes: tx.notes,
                  }),
              )
            : [],
    };

    return formattedItem;
}

// POST /api/inventory - Create a new inventory item
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.itemCode || !body.description || !body.productType) {
            return NextResponse.json(
                {
                    error: "Missing required fields",
                    required: ["itemCode", "description", "productType"],
                },
                { status: 400 },
            );
        }

        try {
            // Check if item code already exists
            const existingItem = await db.inventory.findUnique({
                where: { itemCode: body.itemCode },
            });

            if (existingItem) {
                return NextResponse.json(
                    { error: "Item code already exists" },
                    { status: 400 },
                );
            }

            // Convert numeric fields to proper types
            const numericFields = {
                currentQuantity:
                    body.currentQuantity !== undefined
                        ? Number(body.currentQuantity)
                        : 0,
                minStockLevel:
                    body.minStockLevel !== undefined
                        ? Number(body.minStockLevel)
                        : 0,
                costPerUnit:
                    body.costPerUnit !== undefined
                        ? Number(body.costPerUnit)
                        : 0,
                salePrice:
                    body.salePrice !== undefined ? Number(body.salePrice) : 0,
            };

            // Handle type ID fields
            let threadTypeId = body.threadTypeId;
            let fabricTypeId = body.fabricTypeId;

            // If thread/fabric type name is provided but not ID, try to find or create type
            if (
                body.productType === ProductType.THREAD &&
                body.threadTypeName &&
                !threadTypeId
            ) {
                const threadType = await db.threadType.findFirst({
                    where: {
                        name: {
                            equals: body.threadTypeName,
                            mode: "insensitive",
                        },
                    },
                });

                if (threadType) {
                    threadTypeId = threadType.id;
                } else if (body.createTypeIfNotExists) {
                    // Create new thread type if requested
                    const newThreadType = await db.threadType.create({
                        data: {
                            name: body.threadTypeName,
                            units: body.units || "meters",
                            description: `Thread type for ${body.threadTypeName}`,
                        },
                    });
                    threadTypeId = newThreadType.id;
                }
            }

            if (
                body.productType === ProductType.FABRIC &&
                body.fabricTypeName &&
                !fabricTypeId
            ) {
                const fabricType = await db.fabricType.findFirst({
                    where: {
                        name: {
                            equals: body.fabricTypeName,
                            mode: "insensitive",
                        },
                    },
                });

                if (fabricType) {
                    fabricTypeId = fabricType.id;
                } else if (body.createTypeIfNotExists) {
                    // Create new fabric type if requested
                    const newFabricType = await db.fabricType.create({
                        data: {
                            name: body.fabricTypeName,
                            units: body.units || "meters",
                            description: `Fabric type for ${body.fabricTypeName}`,
                        },
                    });
                    fabricTypeId = newFabricType.id;
                }
            }

            // Create new inventory item
            const newInventoryItem = await db.inventory.create({
                data: {
                    itemCode: body.itemCode,
                    description: body.description,
                    productType: body.productType as ProductType,
                    currentQuantity: numericFields.currentQuantity,
                    minStockLevel: numericFields.minStockLevel,
                    unitOfMeasure: body.unitOfMeasure || "meters",
                    location: body.location,
                    costPerUnit: numericFields.costPerUnit,
                    salePrice: numericFields.salePrice,
                    lastRestocked: body.lastRestocked
                        ? new Date(body.lastRestocked)
                        : new Date(),
                    notes: body.notes,
                    threadTypeId:
                        body.productType === ProductType.THREAD
                            ? threadTypeId
                            : undefined,
                    fabricTypeId:
                        body.productType === ProductType.FABRIC
                            ? fabricTypeId
                            : undefined,
                },
                include: {
                    threadType: true,
                    fabricType: true,
                },
            });

            // Create an initial inventory transaction if initial quantity is specified
            if (numericFields.currentQuantity > 0) {
                await db.inventoryTransaction.create({
                    data: {
                        inventoryId: newInventoryItem.id,
                        transactionType: InventoryTransactionType.ADJUSTMENT,
                        transactionDate: new Date(),
                        quantity: numericFields.currentQuantity,
                        remainingQuantity: numericFields.currentQuantity,
                        unitCost: numericFields.costPerUnit,
                        totalCost:
                            numericFields.costPerUnit *
                            numericFields.currentQuantity,
                        notes: "Initial inventory setup",
                    },
                });
            }

            // Format the response
            const formattedResponse = {
                id: newInventoryItem.id,
                itemCode: newInventoryItem.itemCode,
                description: newInventoryItem.description,
                productType: newInventoryItem.productType,
                currentQuantity: newInventoryItem.currentQuantity,
                minStockLevel: newInventoryItem.minStockLevel,
                unitOfMeasure: newInventoryItem.unitOfMeasure,
                location: newInventoryItem.location,
                costPerUnit: Number(newInventoryItem.costPerUnit),
                salePrice: Number(newInventoryItem.salePrice),
                lastRestocked: newInventoryItem.lastRestocked?.toISOString(),
                createdAt: newInventoryItem.createdAt.toISOString(),
                updatedAt: newInventoryItem.updatedAt.toISOString(),
                notes: newInventoryItem.notes,
                threadType: newInventoryItem.threadType,
                fabricType: newInventoryItem.fabricType,
            };

            return NextResponse.json(
                {
                    success: true,
                    data: formattedResponse,
                },
                { status: 201 },
            );
        } catch (dbError) {
            console.error("Database error creating inventory item:", dbError);
            return NextResponse.json(
                {
                    error: "Database error creating inventory item",
                    details:
                        dbError instanceof Error
                            ? dbError.message
                            : String(dbError),
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Error creating inventory item:", error);
        return NextResponse.json(
            {
                error: "Failed to create inventory item",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

// PUT /api/inventory - Update an existing inventory item
export async function PUT(request: Request) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: "Inventory ID is required" },
                { status: 400 },
            );
        }

        // Validate the incoming data
        if (
            !body.itemCode &&
            !body.description &&
            body.currentQuantity === undefined
        ) {
            return NextResponse.json(
                { error: "No valid update fields provided" },
                { status: 400 },
            );
        }

        const itemId = Number(body.id);

        // Check if inventory item exists
        const existingItem = await db.inventory.findUnique({
            where: { id: itemId },
            include: {
                threadType: true,
                fabricType: true,
            },
        });

        if (!existingItem) {
            return NextResponse.json(
                { error: "Inventory item not found" },
                { status: 404 },
            );
        }

        // Prepare update data
        const updateData: Prisma.InventoryUpdateInput = {};

        // Handle basic fields
        if (body.itemCode !== undefined) updateData.itemCode = body.itemCode;
        if (body.description !== undefined)
            updateData.description = body.description;
        if (body.minStockLevel !== undefined)
            updateData.minStockLevel = Number(body.minStockLevel);
        if (body.unitOfMeasure !== undefined)
            updateData.unitOfMeasure = body.unitOfMeasure;
        if (body.location !== undefined) updateData.location = body.location;
        if (body.costPerUnit !== undefined)
            updateData.costPerUnit = Number(body.costPerUnit);
        if (body.salePrice !== undefined)
            updateData.salePrice = Number(body.salePrice);
        if (body.notes !== undefined) updateData.notes = body.notes;

        // Handle quantity change through transaction if specified
        let quantityChanged = false;
        let newTransaction = null;

        if (
            body.currentQuantity !== undefined &&
            body.currentQuantity !== existingItem.currentQuantity
        ) {
            const quantityDifference =
                Number(body.currentQuantity) - existingItem.currentQuantity;
            quantityChanged = true;

            // Create inventory transaction for the adjustment
            if (quantityDifference !== 0) {
                newTransaction = await db.inventoryTransaction.create({
                    data: {
                        inventoryId: itemId,
                        transactionType: InventoryTransactionType.ADJUSTMENT,
                        transactionDate: new Date(),
                        quantity: Math.abs(quantityDifference),
                        remainingQuantity: Number(body.currentQuantity),
                        unitCost: existingItem.costPerUnit,
                        totalCost:
                            Math.abs(quantityDifference) *
                            Number(existingItem.costPerUnit),
                        notes: `Inventory adjustment: ${quantityDifference > 0 ? "Increase" : "Decrease"} by ${Math.abs(quantityDifference)}`,
                    },
                });

                // Update quantity and last restocked date
                updateData.currentQuantity = Number(body.currentQuantity);
                if (quantityDifference > 0) {
                    updateData.lastRestocked = new Date();
                }
            }
        }

        // Handle type ID connections
        if (
            existingItem.productType === ProductType.THREAD &&
            body.threadTypeId
        ) {
            updateData.threadType = {
                connect: { id: Number(body.threadTypeId) },
            };
        } else if (
            existingItem.productType === ProductType.FABRIC &&
            body.fabricTypeId
        ) {
            updateData.fabricType = {
                connect: { id: Number(body.fabricTypeId) },
            };
        }

        // Update the inventory item
        const updatedItem = await db.inventory.update({
            where: { id: itemId },
            data: updateData,
            include: {
                threadType: true,
                fabricType: true,
            },
        });

        // Format the response with the updated data
        const formattedResponse = {
            id: updatedItem.id,
            itemCode: updatedItem.itemCode,
            description: updatedItem.description,
            productType: updatedItem.productType,
            currentQuantity: updatedItem.currentQuantity,
            minStockLevel: updatedItem.minStockLevel,
            unitOfMeasure: updatedItem.unitOfMeasure,
            location: updatedItem.location,
            costPerUnit: Number(updatedItem.costPerUnit),
            salePrice: Number(updatedItem.salePrice),
            lastRestocked: updatedItem.lastRestocked?.toISOString(),
            createdAt: updatedItem.createdAt.toISOString(),
            updatedAt: updatedItem.updatedAt.toISOString(),
            notes: updatedItem.notes,
            threadType: updatedItem.threadType,
            fabricType: updatedItem.fabricType,
            quantityChanged,
            transaction: newTransaction
                ? {
                      id: newTransaction.id,
                      transactionType: newTransaction.transactionType,
                      quantity: newTransaction.quantity,
                      transactionDate:
                          newTransaction.transactionDate.toISOString(),
                  }
                : null,
        };

        return NextResponse.json({
            success: true,
            data: formattedResponse,
        });
    } catch (error) {
        console.error("Error updating inventory item:", error);
        return NextResponse.json(
            {
                error: "Failed to update inventory item",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

// DELETE /api/inventory - Delete an inventory item
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Inventory ID is required" },
                { status: 400 },
            );
        }

        const itemId = parseInt(id);

        // Check if item exists
        const existingItem = await db.inventory.findUnique({
            where: { id: itemId },
            include: {
                inventoryTransaction: { take: 1 },
            } as Prisma.InventoryInclude & {
                inventoryTransaction?: { take: number };
            },
        });

        if (!existingItem) {
            return NextResponse.json(
                { error: "Inventory item not found" },
                { status: 404 },
            );
        }

        // Check if item has transactions before allowing deletion
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((existingItem as any).inventoryTransaction?.length > 0) {
            // Delete all transactions first
            await db.inventoryTransaction.deleteMany({
                where: { inventoryId: itemId },
            });
        }

        // Delete the inventory item
        await db.inventory.delete({
            where: { id: itemId },
        });

        return NextResponse.json({
            success: true,
            message: "Inventory item deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting inventory item:", error);

        // Check for foreign key constraint errors
        if (
            error instanceof Error &&
            error.message.includes("Foreign key constraint failed")
        ) {
            return NextResponse.json(
                {
                    error: "Cannot delete inventory item that is referenced by other records",
                },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                error: "Failed to delete inventory item",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
