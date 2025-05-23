import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

// Define update data interface to avoid using 'any'
interface InventoryUpdateData {
    currentQuantity?: number;
    description?: string;
    threadTypeId?: number | null;
    fabricTypeId?: number | null;
    unitOfMeasure?: string;
    location?: string;
    minStockLevel?: number;
    costPerUnit?: number;
    salePrice?: number;
    notes?: string;
    lastRestocked?: Date;
    updatedAt?: Date;
}

// GET /api/inventory/[id] - Get inventory item by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid inventory ID" },
                { status: 400 },
            );
        }

        const inventoryItem = await db.inventory.findUnique({
            where: { id: Number(id) },
            include: {
                threadType: true,
                fabricType: true,
                transactions: {
                    orderBy: {
                        transactionDate: "desc",
                    },
                    include: {
                        fabricProduction: true,
                        threadPurchase: true,
                    },
                },
            },
        });

        if (!inventoryItem) {
            return NextResponse.json(
                { error: "Inventory item not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(inventoryItem);
    } catch (error) {
        console.error("Error fetching inventory item:", error);
        return NextResponse.json(
            { error: "Failed to fetch inventory item" },
            { status: 500 },
        );
    }
}

// PUT /api/inventory/[id] - Update inventory item
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        // Make sure to await params if they're part of NextJS dynamic route
        const { id } = await params;

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid inventory ID" },
                { status: 400 },
            );
        }

        const body = await request.json();
        console.log(
            "Received inventory update request for ID:",
            id,
            "with data:",
            JSON.stringify(body),
        );

        // Check if inventory item exists
        const existingItem = await db.inventory.findUnique({
            where: { id: Number(id) },
        });

        if (!existingItem) {
            console.log("Inventory item not found:", id);
            return NextResponse.json(
                { error: "Inventory item not found" },
                { status: 404 },
            );
        }

        console.log(
            "Found existing inventory item:",
            JSON.stringify(existingItem),
        );

        // Check if we need to create a transaction for quantity change
        let transactionCreated = false;
        if (body.currentQuantity !== undefined) {
            // Make sure we're working with numbers, not strings
            const existingQuantity =
                typeof existingItem.currentQuantity === "string"
                    ? parseInt(existingItem.currentQuantity)
                    : existingItem.currentQuantity || 0;

            const newQuantity =
                typeof body.currentQuantity === "string"
                    ? parseInt(body.currentQuantity)
                    : body.currentQuantity;

            console.log(
                "Quantity update:",
                existingQuantity,
                "->",
                newQuantity,
            );

            if (newQuantity !== existingQuantity) {
                // Create a transaction to record the quantity change
                const quantityDifference = newQuantity - existingQuantity;
                const isIncrease = quantityDifference > 0;
                const costPerUnit =
                    typeof existingItem.costPerUnit === "number"
                        ? existingItem.costPerUnit
                        : typeof existingItem.costPerUnit === "string"
                          ? parseFloat(existingItem.costPerUnit)
                          : 0;

                console.log(
                    "Creating inventory transaction for quantity change:",
                    {
                        currentQuantity: existingQuantity,
                        newQuantity: newQuantity,
                        difference: quantityDifference,
                    },
                );

                try {
                    const transaction = await db.inventoryTransaction.create({
                        data: {
                            inventoryId: id,
                            transactionType: isIncrease
                                ? "ADJUSTMENT"
                                : "ADJUSTMENT",
                            quantity: Math.abs(quantityDifference),
                            remainingQuantity: newQuantity,
                            unitCost: costPerUnit,
                            totalCost:
                                Math.abs(quantityDifference) * costPerUnit,
                            notes:
                                body.transactionNotes ||
                                `Quantity ${isIncrease ? "increased" : "decreased"} by ${Math.abs(quantityDifference)}`,
                        },
                    });

                    console.log("Transaction created:", transaction.id);
                    transactionCreated = true;
                } catch (txError) {
                    console.error("Failed to create transaction:", txError);
                    // Continue with inventory update even if transaction fails
                }
            }
        }

        console.log("Updating inventory item:", id);

        // Ensure we're working with the correct data types for the update
        const updateData: InventoryUpdateData = {};

        // Handle each field properly, ensuring they're the right type
        if (body.currentQuantity !== undefined) {
            updateData.currentQuantity =
                typeof body.currentQuantity === "string"
                    ? parseInt(body.currentQuantity)
                    : Number(body.currentQuantity);
        }

        // Include current values in log for debugging
        console.log("Current values:", {
            currentQuantity: existingItem.currentQuantity,
            newQuantity: updateData.currentQuantity,
        });

        if (body.description !== undefined)
            updateData.description = body.description;

        if (body.threadTypeId !== undefined) {
            updateData.threadTypeId =
                typeof body.threadTypeId === "string"
                    ? parseInt(body.threadTypeId)
                    : body.threadTypeId === null
                      ? null
                      : Number(body.threadTypeId);
        }

        if (body.fabricTypeId !== undefined) {
            updateData.fabricTypeId =
                typeof body.fabricTypeId === "string"
                    ? parseInt(body.fabricTypeId)
                    : body.fabricTypeId === null
                      ? null
                      : Number(body.fabricTypeId);
        }

        if (body.unitOfMeasure !== undefined)
            updateData.unitOfMeasure = body.unitOfMeasure;
        if (body.location !== undefined) updateData.location = body.location;

        if (body.minStockLevel !== undefined) {
            updateData.minStockLevel =
                typeof body.minStockLevel === "string"
                    ? parseInt(body.minStockLevel)
                    : Number(body.minStockLevel);
        }

        if (body.costPerUnit !== undefined) {
            updateData.costPerUnit =
                typeof body.costPerUnit === "string"
                    ? parseFloat(body.costPerUnit)
                    : Number(body.costPerUnit);
        }

        if (body.salePrice !== undefined) {
            updateData.salePrice =
                typeof body.salePrice === "string"
                    ? parseFloat(body.salePrice)
                    : Number(body.salePrice);
        }

        if (body.notes !== undefined) updateData.notes = body.notes;
        if (body.lastRestocked !== undefined)
            updateData.lastRestocked = new Date(body.lastRestocked);

        // Always update this field
        updateData.updatedAt = new Date();

        console.log("Final update data:", JSON.stringify(updateData));

        // Update inventory item with a simple direct update
        try {
            const updatedItem = await db.inventory.update({
                where: { id: Number(id) },
                data: updateData,
                include: {
                    threadType: true,
                    fabricType: true,
                },
            });

            console.log(
                "Inventory updated successfully:",
                updatedItem.id,
                "new quantity:",
                updatedItem.currentQuantity,
            );
            return NextResponse.json({
                ...updatedItem,
                transactionCreated,
            });
        } catch (updateError) {
            console.error("Error during database update:", updateError);
            return NextResponse.json(
                {
                    error: "Failed to update inventory item in database",
                    details:
                        updateError instanceof Error
                            ? updateError.message
                            : String(updateError),
                },
                { status: 500 },
            );
        }
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

// DELETE /api/inventory/[id] - Delete inventory item
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid inventory ID" },
                { status: 400 },
            );
        }

        // Check if inventory item exists
        const existingItem = await db.inventory.findUnique({
            where: { id: Number(id) },
            include: {
                transactions: true,
            },
        });

        if (!existingItem) {
            return NextResponse.json(
                { error: "Inventory item not found" },
                { status: 404 },
            );
        }

        // Use transaction for all delete operations to ensure atomicity
        await db.$transaction(async (tx) => {
            // If the item has transactions, delete them first
            if (existingItem.transactions.length > 0) {
                await tx.inventoryTransaction.deleteMany({
                    where: { inventoryId: id },
                });
            }

            // Then delete the inventory item
            await tx.inventory.delete({
                where: { id: Number(id) },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        return NextResponse.json(
            { error: "Failed to delete inventory item" },
            { status: 500 },
        );
    }
}
