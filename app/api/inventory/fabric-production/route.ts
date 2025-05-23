import { NextRequest, NextResponse } from "next/server";

import { InventoryTransactionType, ProductType } from "@prisma/client";

import { db } from "@/lib/db";

// Helper function to generate a unique ID
function generateUniqueID(prefix = "FB"): string {
    return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(
        Math.random() * 1000,
    )
        .toString()
        .padStart(3, "0")}`;
}

// POST /api/inventory/fabric-production - Add fabric production to inventory
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { fabricProductionId } = data;

        if (!fabricProductionId) {
            return NextResponse.json(
                { error: "Fabric production ID is required" },
                { status: 400 },
            );
        }

        // Check if this production has already been added to inventory
        const existingTransaction = await db.inventoryTransaction.findFirst({
            where: {
                fabricProductionId,
                transactionType: InventoryTransactionType.PRODUCTION,
            },
        });

        if (existingTransaction) {
            // If it exists, return the existing inventory item
            const existingInventory = await db.inventory.findUnique({
                where: { id: existingTransaction.inventoryId },
                include: {
                    fabricType: true,
                },
            });

            return NextResponse.json({
                success: true,
                message: "This production is already in inventory",
                inventoryItem: existingInventory,
                transaction: existingTransaction,
                existing: true,
            });
        }

        // Get fabric production details
        const fabricProduction = await db.fabricProduction.findUnique({
            where: { id: fabricProductionId },
            include: {
                threadPurchase: true,
                dyeingProcess: true,
            },
        });

        if (!fabricProduction) {
            return NextResponse.json(
                { error: "Fabric production not found" },
                { status: 404 },
            );
        }

        if (fabricProduction.status !== "COMPLETED") {
            return NextResponse.json(
                {
                    error: "Only completed production can be added to inventory",
                },
                { status: 400 },
            );
        }

        // Find or create fabric type
        let fabricTypeId: number | null = null;
        const existingFabricType = await db.fabricType.findFirst({
            where: {
                name: {
                    equals: fabricProduction.fabricType,
                    mode: "insensitive",
                },
            },
        });

        if (existingFabricType) {
            fabricTypeId = existingFabricType.id;
        } else {
            // Create a new fabric type
            const newFabricType = await db.fabricType.create({
                data: {
                    name: fabricProduction.fabricType,
                    description: `Auto-created from production ID ${fabricProductionId}`,
                    units: fabricProduction.unitOfMeasure || "meters",
                },
            });
            fabricTypeId = newFabricType.id;
        }

        // Generate a unique item code
        const itemCode = generateUniqueID();

        // Calculate values for inventory (convert strings to numbers for calculations)
        const totalCost = Number(fabricProduction.totalCost);
        const quantityProduced = Number(fabricProduction.quantityProduced);

        // Avoid division by zero
        const costPerUnit =
            quantityProduced > 0 ? totalCost / quantityProduced : 0;

        // Calculate sale price (30% markup)
        const salePrice = costPerUnit * 1.3;

        // Build description
        const colorInfo = fabricProduction.dyeingProcess?.colorName
            ? `Color: ${fabricProduction.dyeingProcess.colorName}`
            : "";
        const description = `${fabricProduction.fabricType} - ${fabricProduction.dimensions} ${colorInfo} (Batch: ${fabricProduction.batchNumber})`;

        // Perform all operations in a transaction for data consistency
        const result = await db.$transaction(async (tx) => {
            // Create inventory item
            const inventoryItem = await tx.inventory.create({
                data: {
                    itemCode,
                    productType: ProductType.FABRIC,
                    description,
                    fabricTypeId,
                    currentQuantity: quantityProduced,
                    unitOfMeasure: fabricProduction.unitOfMeasure || "meters",
                    costPerUnit,
                    salePrice,
                    minStockLevel: 5, // Default minimum stock level
                    location: data.location || "Production Floor",
                    lastRestocked: new Date(),
                    notes:
                        data.notes ||
                        `From production batch #${fabricProduction.batchNumber}`,
                },
            });

            // Create inventory transaction
            const transaction = await tx.inventoryTransaction.create({
                data: {
                    inventoryId: inventoryItem.id,
                    transactionType: InventoryTransactionType.PRODUCTION,
                    quantity: quantityProduced,
                    remainingQuantity: quantityProduced,
                    unitCost: costPerUnit,
                    totalCost,
                    referenceType: "Fabric Production",
                    referenceId: fabricProductionId,
                    fabricProductionId,
                    notes: `Added from fabric production #${fabricProduction.batchNumber}`,
                },
            });

            return { inventoryItem, transaction };
        });

        // Update the fabric production status to indicate it's in inventory if needed
        if (data.updateProductionStatus) {
            await db.fabricProduction.update({
                where: { id: fabricProductionId },
                data: {
                    completionDate: new Date(),
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Fabric production added to inventory successfully",
            inventoryItem: result.inventoryItem,
            transaction: result.transaction,
        });
    } catch (error) {
        console.error("Error adding fabric production to inventory:", error);
        return NextResponse.json(
            {
                error: "Failed to add fabric production to inventory",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
