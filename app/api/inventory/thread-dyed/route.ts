import { NextRequest, NextResponse } from "next/server";

import { InventoryTransactionType, ProductType } from "@prisma/client";

import { db } from "@/lib/db";

// Helper function to generate a unique ID
function generateUniqueID(prefix = "DT"): string {
    return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(
        Math.random() * 1000,
    )
        .toString()
        .padStart(3, "0")}`;
}

// POST /api/inventory/thread-dyed - Add dyed thread to inventory
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.dyeingProcessId) {
            return NextResponse.json(
                { error: "Missing dyeing process ID" },
                { status: 400 },
            );
        }

        // Get the dyeing process with thread purchase details
        const dyeingProcess = await db.dyeingProcess.findUnique({
            where: { id: body.dyeingProcessId },
            include: {
                threadPurchase: {
                    include: {
                        vendor: true,
                    },
                },
            },
        });

        if (!dyeingProcess) {
            return NextResponse.json(
                { error: "Dyeing process not found" },
                { status: 404 },
            );
        }

        // Check if already added to inventory
        const existingTransaction = await db.inventoryTransaction.findFirst({
            where: {
                dyeingProcessId: body.dyeingProcessId,
            },
        });

        if (existingTransaction) {
            // Find the associated inventory item
            const existingInventory = await db.inventory.findUnique({
                where: { id: existingTransaction.inventoryId },
                include: {
                    threadType: true,
                },
            });

            return NextResponse.json({
                success: true,
                message: "Thread already in inventory",
                inventoryItem: existingInventory,
                transaction: existingTransaction,
                existing: true,
            });
        }

        // Extract color information
        let colorName =
            dyeingProcess.colorName || dyeingProcess.colorCode || "Unknown";
        if (!colorName && dyeingProcess.dyeParameters) {
            let dyeParams: Record<string, unknown> = {};

            // Parse if it's a string
            if (typeof dyeingProcess.dyeParameters === "string") {
                try {
                    dyeParams = JSON.parse(dyeingProcess.dyeParameters);
                } catch (e) {
                    console.error("Failed to parse dyeParameters:", e);
                }
            } else if (typeof dyeingProcess.dyeParameters === "object") {
                dyeParams = dyeingProcess.dyeParameters as Record<
                    string,
                    unknown
                >;
            }

            // Get color from dyeing parameters if available
            if (
                dyeParams &&
                "color" in dyeParams &&
                typeof dyeParams.color === "string"
            ) {
                colorName = dyeParams.color;
            }
        }

        // Determine quantities
        const quantity = body.quantity || dyeingProcess.outputQuantity;
        const threadType =
            dyeingProcess.threadPurchase.threadType || "Unknown Thread";

        // Calculate costs - ensure we're working with numbers
        const totalCost = dyeingProcess.totalCost
            ? Number(dyeingProcess.totalCost)
            : dyeingProcess.laborCost && dyeingProcess.dyeMaterialCost
              ? Number(dyeingProcess.laborCost) +
                Number(dyeingProcess.dyeMaterialCost)
              : quantity * Number(dyeingProcess.threadPurchase.unitPrice);

        const costPerUnit =
            totalCost && quantity
                ? totalCost / quantity
                : Number(dyeingProcess.threadPurchase.unitPrice);

        // Calculate sale price (30% markup)
        const salePrice = costPerUnit * 1.3;

        // Check if thread type exists or create it
        let threadTypeId: number | null = null;
        const existingThreadType = await db.threadType.findFirst({
            where: {
                name: { equals: threadType, mode: "insensitive" },
            },
        });

        if (existingThreadType) {
            threadTypeId = existingThreadType.id;
        } else if (body.createMissingType) {
            // Create a new thread type
            const newThreadType = await db.threadType.create({
                data: {
                    name: threadType,
                    description: `Auto-created for dyed thread from process ID ${body.dyeingProcessId}`,
                    units:
                        dyeingProcess.threadPurchase.unitOfMeasure || "meters",
                },
            });
            threadTypeId = newThreadType.id;
        }

        // Generate a unique item code
        const itemCode = generateUniqueID();

        // Build description for the inventory item
        const description = `${colorName} ${threadType} Thread${body.description ? ` - ${body.description}` : ""}`;

        // Perform all operations in a transaction for data consistency
        const result = await db.$transaction(async (tx) => {
            // Create new inventory item
            const inventoryItem = await tx.inventory.create({
                data: {
                    itemCode,
                    description,
                    productType: ProductType.THREAD,
                    threadTypeId,
                    currentQuantity: quantity,
                    unitOfMeasure:
                        dyeingProcess.threadPurchase.unitOfMeasure || "meters",
                    minStockLevel: body.minStockLevel || 50,
                    costPerUnit,
                    salePrice,
                    location: body.location || "Dye Facility",
                    lastRestocked: new Date(),
                    notes:
                        body.notes ||
                        `Dyed from Thread Order #${dyeingProcess.threadPurchaseId}. Color: ${colorName}`,
                },
            });

            // Create inventory transaction
            const transaction = await tx.inventoryTransaction.create({
                data: {
                    inventoryId: inventoryItem.id,
                    transactionType: InventoryTransactionType.PRODUCTION,
                    quantity,
                    remainingQuantity: quantity,
                    unitCost: costPerUnit,
                    totalCost,
                    referenceType: "DyeingProcess",
                    referenceId: dyeingProcess.id,
                    dyeingProcessId: dyeingProcess.id,
                    notes:
                        body.transactionNotes ||
                        `Thread dyeing process completed for ${colorName} ${threadType}`,
                },
            });

            return { inventoryItem, transaction };
        });

        // Update the color status of thread purchase to COLORED if needed
        // This is done outside the transaction as it's not critical to the inventory operation
        if (dyeingProcess.threadPurchase.colorStatus !== "COLORED") {
            await db.threadPurchase.update({
                where: { id: dyeingProcess.threadPurchaseId },
                data: {
                    colorStatus: "COLORED",
                },
            });
        }

        // Return success response
        return NextResponse.json({
            success: true,
            message: "Dyed thread added to inventory successfully",
            inventoryItem: result.inventoryItem,
            transaction: result.transaction,
        });
    } catch (error) {
        console.error("Error adding dyed thread to inventory:", error);
        return NextResponse.json(
            {
                error: "Failed to add thread to inventory",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
