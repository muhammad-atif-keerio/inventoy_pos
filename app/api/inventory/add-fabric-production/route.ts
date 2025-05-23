import { NextRequest, NextResponse } from "next/server";

import { InventoryTransactionType, ProductType } from "@prisma/client";
import { randomUUID } from "crypto";

import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.fabricProductionId) {
            return NextResponse.json(
                { error: "Fabric production ID is required" },
                { status: 400 },
            );
        }

        const fabricProductionId = Number(body.fabricProductionId);

        // Check if fabric production exists
        const fabricProduction = await db.fabricProduction.findUnique({
            where: { id: fabricProductionId },
        });

        if (!fabricProduction) {
            return NextResponse.json(
                { error: "Fabric production not found" },
                { status: 404 },
            );
        }

        // Generate a unique item code
        const itemCode = `FABR-${fabricProduction.id}-${randomUUID().substring(0, 4)}`;

        // Get or create fabric type
        let fabricTypeId = null;

        if (fabricProduction.fabricType) {
            const fabricType = await db.fabricType.findFirst({
                where: {
                    name: {
                        equals: fabricProduction.fabricType,
                        mode: "insensitive",
                    },
                },
            });

            if (fabricType) {
                fabricTypeId = fabricType.id;
            } else {
                // Create new fabric type
                const newFabricType = await db.fabricType.create({
                    data: {
                        name: fabricProduction.fabricType,
                        units: fabricProduction.unitOfMeasure || "meters",
                        description: `Fabric type from production #${fabricProduction.id}`,
                    },
                });
                fabricTypeId = newFabricType.id;
            }
        }

        // Calculate quantity to add
        const quantity = Number(fabricProduction.quantityProduced);
        const totalCost = Number(fabricProduction.totalCost);
        const unitCost = quantity > 0 ? totalCost / quantity : 0;
        const markup = body.markup ? Number(body.markup) : 0.3; // 30% markup by default

        // Create inventory item
        const inventoryItem = await db.inventory.create({
            data: {
                itemCode,
                description:
                    body.description ||
                    `${fabricProduction.fabricType} Fabric - Batch ${fabricProduction.batchNumber}`,
                productType: ProductType.FABRIC,
                currentQuantity: quantity,
                unitOfMeasure: fabricProduction.unitOfMeasure || "meters",
                minStockLevel: body.minStockLevel
                    ? Number(body.minStockLevel)
                    : Math.ceil(quantity * 0.1),
                location: body.location || "Main Warehouse",
                costPerUnit: unitCost,
                salePrice: unitCost * (1 + markup),
                lastRestocked: new Date(),
                notes:
                    body.notes ||
                    `Added from fabric production #${fabricProduction.id}`,
                fabricTypeId,
            },
            include: {
                fabricType: true,
            },
        });

        // Create transaction record
        const transaction = await db.inventoryTransaction.create({
            data: {
                inventoryId: inventoryItem.id,
                transactionType: InventoryTransactionType.PRODUCTION,
                transactionDate: new Date(),
                quantity,
                remainingQuantity: quantity,
                unitCost,
                totalCost,
                notes: `Initial inventory from fabric production #${fabricProduction.id}`,
                fabricProductionId,
            },
        });

        // Update fabric production status if requested
        if (body.updateProductionStatus) {
            await db.fabricProduction.update({
                where: { id: fabricProductionId },
                data: {
                    completionDate: new Date(),
                    inventoryStatus: "ADDED",
                },
            });
        }

        return NextResponse.json({
            inventoryItem: {
                ...inventoryItem,
                costPerUnit: Number(inventoryItem.costPerUnit),
                salePrice: Number(inventoryItem.salePrice),
            },
            transaction,
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
