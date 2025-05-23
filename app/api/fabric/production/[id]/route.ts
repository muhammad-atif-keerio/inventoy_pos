import { NextResponse } from "next/server";

import {
    InventoryTransactionType,
    ProductType,
    ProductionStatus,
} from "@prisma/client";

import { db } from "@/lib/db";

// GET a single fabric production record by ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { searchParams } = new URL(request.url);
        const includeInventory =
            searchParams.get("includeInventory") === "true";

        // Parse the ID from params - ensure id is available before using
        const { id } = await params;

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid ID format" },
                { status: 400 },
            );
        }

        const production = await db.fabricProduction.findUnique({
            where: { id: Number(id) },
            include: {
                threadPurchase: true,
                dyeingProcess: true,
                inventoryEntries: includeInventory,
            },
        });

        if (!production) {
            return NextResponse.json(
                { error: "Production record not found" },
                { status: 404 },
            );
        }

        const responseData = {
            id: production.id,
            sourceThreadId: production.sourceThreadId,
            sourceThreadType:
                production.threadPurchase?.threadType || "Unknown Thread",
            dyeingProcessId: production.dyeingProcessId,
            dyeingProcessColor: production.dyeingProcess?.colorName,
            fabricType: production.fabricType,
            dimensions: production.dimensions,
            batchNumber: production.batchNumber,
            quantityProduced: production.quantityProduced,
            threadUsed: production.threadUsed,
            threadWastage: production.threadWastage || 0,
            unitOfMeasure: production.unitOfMeasure,
            productionCost: production.productionCost,
            laborCost: production.laborCost || null,
            totalCost: production.totalCost,
            productionDate: production.productionDate.toISOString(),
            completionDate: production.completionDate
                ? production.completionDate.toISOString()
                : null,
            remarks: production.remarks || null,
            status: production.status || "PENDING",
            createdAt: production.productionDate.toISOString(),
            // Include inventory information if requested
            availableInInventory: includeInventory
                ? production.inventoryEntries &&
                  production.inventoryEntries.length > 0
                : undefined,
            inventoryItemId:
                includeInventory &&
                production.inventoryEntries &&
                production.inventoryEntries.length > 0
                    ? production.inventoryEntries[0].inventoryId
                    : undefined,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Error fetching production record:", error);
        return NextResponse.json(
            { error: "Failed to fetch production record" },
            { status: 500 },
        );
    }
}

// PUT to update a fabric production record
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        // Access params through context to ensure it's properly resolved
        const { id } = await params;

        // Parse the ID from params
        const body = await request.json();

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid ID format" },
                { status: 400 },
            );
        }

        // Check if record exists
        const existingProduction = await db.fabricProduction.findUnique({
            where: { id: Number(id) },
            include: {
                threadPurchase: true,
                dyeingProcess: true,
                inventoryEntries: true,
            },
        });

        if (!existingProduction) {
            return NextResponse.json(
                { error: "Production record not found" },
                { status: 404 },
            );
        }

        // Check if this is a status change to COMPLETED
        const currentStatus =
            existingProduction.status || ProductionStatus.PENDING;
        const isCompletedUpdate =
            body.status === ProductionStatus.COMPLETED &&
            currentStatus !== ProductionStatus.COMPLETED;

        // Calculate costs if not provided
        const totalCost =
            body.totalCost ||
            (body.productionCost || 0) + (body.laborCost || 0);

        // Update the record
        const updatedProduction = await db.fabricProduction.update({
            where: { id: Number(id) },
            data: {
                sourceThreadId: body.sourceThreadId,
                dyeingProcessId: body.dyeingProcessId || null,
                fabricType: body.fabricType,
                dimensions: body.dimensions,
                batchNumber: body.batchNumber,
                quantityProduced: body.quantityProduced,
                threadUsed: body.threadUsed || body.quantityProduced,
                threadWastage: body.threadWastage || 0,
                unitOfMeasure: body.unitOfMeasure || "meters",
                productionCost: body.productionCost || 0,
                laborCost: body.laborCost || 0,
                totalCost: totalCost,
                productionDate: new Date(body.productionDate || new Date()),
                completionDate:
                    body.status === ProductionStatus.COMPLETED
                        ? new Date(body.completionDate || new Date())
                        : null,
                remarks: body.remarks || null,
                status: body.status || currentStatus,
            },
            include: {
                threadPurchase: true,
                dyeingProcess: true,
            },
        });

        const responseData = {
            id: updatedProduction.id,
            sourceThreadId: updatedProduction.sourceThreadId,
            sourceThreadType:
                updatedProduction.threadPurchase?.threadType ||
                "Unknown Thread",
            dyeingProcessId: updatedProduction.dyeingProcessId,
            dyeingProcessColor: updatedProduction.dyeingProcess?.colorName,
            fabricType: updatedProduction.fabricType,
            dimensions: updatedProduction.dimensions,
            batchNumber: updatedProduction.batchNumber,
            quantityProduced: updatedProduction.quantityProduced,
            threadUsed: updatedProduction.threadUsed,
            threadWastage: updatedProduction.threadWastage || 0,
            unitOfMeasure: updatedProduction.unitOfMeasure,
            productionCost: updatedProduction.productionCost,
            laborCost: updatedProduction.laborCost || null,
            totalCost: updatedProduction.totalCost,
            productionDate: updatedProduction.productionDate.toISOString(),
            completionDate: updatedProduction.completionDate
                ? updatedProduction.completionDate.toISOString()
                : null,
            remarks: updatedProduction.remarks || null,
            status: updatedProduction.status || ProductionStatus.PENDING,
            createdAt: updatedProduction.productionDate.toISOString(),
        };

        // If status was changed to COMPLETED, add to inventory
        if (isCompletedUpdate) {
            try {
                // Check if there's already an inventory transaction for this production
                const existingTransaction =
                    await db.inventoryTransaction.findFirst({
                        where: {
                            fabricProductionId: updatedProduction.id,
                        },
                    });

                if (existingTransaction) {
                    return NextResponse.json({
                        ...responseData,
                        inventorySuccess: true,
                        inventoryItemId: existingTransaction.inventoryId,
                    });
                }

                // Generate a unique item code for the inventory
                const itemCode = `FAB-${updatedProduction.batchNumber}-${Date.now().toString().substr(-4)}`;

                // Calculate cost per unit and sale price with markup
                const costPerUnit =
                    updatedProduction.totalCost.toNumber() /
                    updatedProduction.quantityProduced;
                const salePrice = costPerUnit * 1.3; // 30% markup

                // Check if fabric type exists or create it
                let fabricType = await db.fabricType.findFirst({
                    where: {
                        name: {
                            equals: updatedProduction.fabricType,
                            mode: "insensitive",
                        },
                    },
                });

                if (!fabricType) {
                    fabricType = await db.fabricType.create({
                        data: {
                            name: updatedProduction.fabricType,
                            units: updatedProduction.unitOfMeasure || "meters",
                            description: `Fabric type for ${updatedProduction.fabricType}`,
                        },
                    });
                }

                // Create a new inventory item
                const inventoryItem = await db.inventory.create({
                    data: {
                        itemCode: itemCode,
                        description: `${updatedProduction.fabricType} fabric - ${updatedProduction.dimensions}`,
                        productType: ProductType.FABRIC,
                        fabricTypeId: fabricType.id,
                        currentQuantity: updatedProduction.quantityProduced,
                        unitOfMeasure: updatedProduction.unitOfMeasure,
                        location: "Production Floor",
                        costPerUnit: costPerUnit,
                        salePrice: salePrice,
                        minStockLevel: 50, // Default value
                        lastRestocked: new Date(),
                        notes: updatedProduction.remarks || undefined,
                    },
                });

                // Create an inventory transaction
                await db.inventoryTransaction.create({
                    data: {
                        inventoryId: inventoryItem.id,
                        transactionDate: new Date(),
                        transactionType: InventoryTransactionType.PRODUCTION,
                        quantity: updatedProduction.quantityProduced,
                        remainingQuantity: updatedProduction.quantityProduced,
                        unitCost: costPerUnit,
                        totalCost: updatedProduction.totalCost,
                        referenceType: "Fabric Production",
                        referenceId: updatedProduction.id,
                        fabricProductionId: updatedProduction.id,
                        notes: `Inventory from completed fabric production #${updatedProduction.id}`,
                    },
                });
                // Include inventory status in the response
                return NextResponse.json({
                    ...responseData,
                    inventorySuccess: true,
                    inventoryItemId: inventoryItem.id,
                });
            } catch (inventoryError) {
                console.error(
                    "Error adding fabric to inventory:",
                    inventoryError,
                );

                // Include inventory error in the response so the frontend can show appropriate message
                return NextResponse.json({
                    ...responseData,
                    inventorySuccess: false,
                    inventoryError:
                        "Error adding to inventory: " +
                        (inventoryError instanceof Error
                            ? inventoryError.message
                            : "Unknown error"),
                });
            }
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Error updating production record:", error);
        return NextResponse.json(
            {
                error: "Failed to update production record",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}

// DELETE a fabric production record
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        // Access params through context to ensure it's properly resolved
        const { id } = await params;

        // Parse the ID from params

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid ID format" },
                { status: 400 },
            );
        }

        // Check if record exists
        const existingProduction = await db.fabricProduction.findUnique({
            where: { id: Number(id) },
            include: {
                inventoryEntries: true,
            },
        });

        if (!existingProduction) {
            return NextResponse.json(
                { error: "Production record not found" },
                { status: 404 },
            );
        }

        // Check if there are inventory entries and prevent deletion if found
        if (
            existingProduction.inventoryEntries &&
            existingProduction.inventoryEntries.length > 0
        ) {
            return NextResponse.json(
                {
                    error: "Cannot delete production record with inventory entries. Update the status to CANCELLED instead.",
                },
                { status: 400 },
            );
        }

        // Delete the record
        await db.fabricProduction.delete({
            where: { id: Number(id) },
        });

        return NextResponse.json(
            { message: "Production record deleted successfully" },
            { status: 200 },
        );
    } catch (error) {
        console.error("Error deleting production record:", error);
        return NextResponse.json(
            { error: "Failed to delete production record" },
            { status: 500 },
        );
    }
}
