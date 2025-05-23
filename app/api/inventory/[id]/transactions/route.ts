import { NextRequest, NextResponse } from "next/server";

import { InventoryTransactionType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

// GET /api/inventory/[id]/transactions - Get all transactions for an inventory item
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: number | string }> },
) {
    try {
        const { id } = await params;
        const inventoryId = Number(id);

        if (isNaN(inventoryId)) {
            return NextResponse.json(
                { error: "Invalid inventory ID" },
                { status: 400 },
            );
        }

        // Verify the inventory item exists
        const inventory = await db.inventory.findUnique({
            where: { id: inventoryId },
        });

        if (!inventory) {
            return NextResponse.json(
                { error: "Inventory item not found" },
                { status: 404 },
            );
        }

        // Get query params for pagination and filtering
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const transactionType = searchParams.get("type");

        // Build filter
        const filter: Prisma.InventoryTransactionWhereInput = {
            inventoryId: inventoryId,
        };
        if (transactionType) {
            filter.transactionType =
                transactionType as InventoryTransactionType;
        }

        // Fetch transactions for this inventory item with pagination
        const transactions = await db.inventoryTransaction.findMany({
            where: filter,
            orderBy: {
                transactionDate: "desc",
            },
            skip: offset,
            take: limit,
        });

        // Get total count for pagination
        const totalCount = await db.inventoryTransaction.count({
            where: filter,
        });

        // Return transactions with metadata
        return NextResponse.json({
            items: transactions,
            total: totalCount,
            limit,
            offset,
        });
    } catch (error) {
        console.error("Error fetching inventory transactions:", error);
        return NextResponse.json(
            { error: "Failed to fetch inventory transactions" },
            { status: 500 },
        );
    }
}

// POST /api/inventory/[id]/transactions - Create a new transaction for an inventory item
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: number | string }> },
) {
    try {
        const { id } = await params;
        const inventoryId = Number(id);

        if (isNaN(inventoryId)) {
            return NextResponse.json(
                { error: "Invalid inventory ID" },
                { status: 400 },
            );
        }

        const body = await request.json();

        // Validate required fields
        if (!body.transactionType || typeof body.quantity !== "number") {
            return NextResponse.json(
                { error: "Transaction type and quantity are required" },
                { status: 400 },
            );
        }

        // Verify the inventory item exists
        const inventory = await db.inventory.findUnique({
            where: { id: inventoryId },
            include: {
                threadType: true,
                fabricType: true,
            },
        });

        if (!inventory) {
            return NextResponse.json(
                { error: "Inventory item not found" },
                { status: 404 },
            );
        }

        // Calculate new quantity
        let newQuantity = inventory.currentQuantity;

        switch (body.transactionType) {
            case "PURCHASE":
            case "PRODUCTION":
            case "ADJUSTMENT":
                // For inbound transactions, add to quantity
                newQuantity += body.quantity;
                break;

            case "SALES":
            case "TRANSFER":
                // For outbound transactions, check if there's enough inventory
                if (inventory.currentQuantity < body.quantity) {
                    return NextResponse.json(
                        {
                            error: "Insufficient inventory quantity",
                            details: `Available: ${inventory.currentQuantity} ${inventory.unitOfMeasure}, Requested: ${body.quantity} ${inventory.unitOfMeasure}`,
                        },
                        { status: 400 },
                    );
                }
                newQuantity -= body.quantity;
                break;

            default:
                return NextResponse.json(
                    { error: "Invalid transaction type" },
                    { status: 400 },
                );
        }

        // Convert values to appropriate types
        const unitCost =
            body.unitCost !== undefined
                ? Number(body.unitCost)
                : Number(inventory.costPerUnit);
        const totalCost =
            body.totalCost !== undefined
                ? Number(body.totalCost)
                : unitCost * body.quantity;

        // Create the transaction in a transaction (to ensure data consistency)
        const result = await db.$transaction(async (tx) => {
            // Create the inventory transaction
            const transaction = await tx.inventoryTransaction.create({
                data: {
                    inventoryId,
                    transactionType:
                        body.transactionType as InventoryTransactionType,
                    quantity: body.quantity,
                    remainingQuantity: newQuantity,
                    unitCost,
                    totalCost,
                    referenceType: body.referenceType || null,
                    referenceId: body.referenceId || null,
                    notes: body.notes || null,
                    transactionDate: body.transactionDate
                        ? new Date(body.transactionDate)
                        : new Date(),
                    threadPurchaseId: body.threadPurchaseId || null,
                    dyeingProcessId: body.dyeingProcessId || null,
                    fabricProductionId: body.fabricProductionId || null,
                    salesOrderId: body.salesOrderId || null,
                },
            });

            // Update the inventory quantity
            const updatedInventory = await tx.inventory.update({
                where: { id: inventoryId },
                data: {
                    currentQuantity: newQuantity,
                    ...(["PURCHASE", "PRODUCTION", "ADJUSTMENT"].includes(
                        body.transactionType,
                    ) &&
                        body.quantity > 0 && {
                            lastRestocked: new Date(),
                        }),
                    // Update costPerUnit with weighted average if it's a purchase or production
                    ...(["PURCHASE", "PRODUCTION"].includes(
                        body.transactionType,
                    ) &&
                        body.quantity > 0 &&
                        unitCost > 0 && {
                            costPerUnit: {
                                set: calculateWeightedAverageCost(
                                    inventory.currentQuantity,
                                    inventory.costPerUnit.toNumber(),
                                    body.quantity,
                                    unitCost,
                                ),
                            },
                            // Optionally update sale price with a markup
                            salePrice: {
                                set:
                                    calculateWeightedAverageCost(
                                        inventory.currentQuantity,
                                        inventory.costPerUnit.toNumber(),
                                        body.quantity,
                                        unitCost,
                                    ) * 1.2, // 20% markup
                            },
                        }),
                },
                include: {
                    threadType: true,
                    fabricType: true,
                },
            });

            return {
                transaction,
                inventory: updatedInventory,
            };
        });

        return NextResponse.json(result, { status: 201 });
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

// Helper function to calculate weighted average cost
function calculateWeightedAverageCost(
    oldQuantity: number,
    oldCost: number,
    newQuantity: number,
    newCost: number,
): number {
    if (oldQuantity <= 0) return newCost;
    if (newQuantity <= 0) return oldCost;

    const totalQuantity = oldQuantity + newQuantity;
    const weightedCost =
        (oldQuantity * oldCost + newQuantity * newCost) / totalQuantity;

    return Number(weightedCost.toFixed(2)); // Round to 2 decimal places
}
