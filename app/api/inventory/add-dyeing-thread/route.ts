import { NextRequest, NextResponse } from "next/server";

import { InventoryTransactionType, ProductType } from "@prisma/client";
import { randomUUID } from "crypto";

import { db } from "@/lib/db";

/**
 * POST /api/inventory/add-dyeing-thread
 * Add a dyed thread to inventory
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.dyeingProcessId) {
            return NextResponse.json(
                { error: "Dyeing process ID is required" },
                { status: 400 },
            );
        }

        const dyeingProcessId = Number(body.dyeingProcessId);

        // Check if dyeing process exists
        const dyeingProcess = await db.dyeingProcess.findUnique({
            where: { id: dyeingProcessId },
            include: {
                threadPurchase: true,
            },
        });

        if (!dyeingProcess) {
            return NextResponse.json(
                { error: "Dyeing process not found" },
                { status: 404 },
            );
        }

        // Generate a unique item code
        const itemCode = `DYE-${dyeingProcess.id}-${randomUUID().substring(0, 4)}`;

        // Get or create thread type
        let threadTypeId = null;

        if (dyeingProcess.threadPurchase?.threadType) {
            const threadType = await db.threadType.findFirst({
                where: {
                    name: {
                        equals: dyeingProcess.threadPurchase.threadType,
                        mode: "insensitive",
                    },
                },
            });

            if (threadType) {
                threadTypeId = threadType.id;
            } else if (body.createMissingType) {
                // Create new thread type
                const newThreadType = await db.threadType.create({
                    data: {
                        name: dyeingProcess.threadPurchase.threadType,
                        units:
                            dyeingProcess.threadPurchase.unitOfMeasure || "kg",
                        description: `Thread type from dyeing process #${dyeingProcess.id}`,
                    },
                });
                threadTypeId = newThreadType.id;
            }
        }

        // Calculate quantity to add
        const quantity = body.quantity
            ? Number(body.quantity)
            : Number(dyeingProcess.outputQuantity);
        const totalCost = dyeingProcess.totalCost
            ? Number(dyeingProcess.totalCost)
            : 0;
        const unitCost = quantity > 0 ? totalCost / quantity : 0;
        const markup = body.markup ? Number(body.markup) : 0.25; // 25% markup by default

        // Create inventory item
        const colorInfo = dyeingProcess.colorName
            ? `${dyeingProcess.colorName} (${dyeingProcess.colorCode || "No code"})`
            : "Dyed Thread";

        const inventoryItem = await db.inventory.create({
            data: {
                itemCode,
                description:
                    body.description ||
                    `${dyeingProcess.threadPurchase?.threadType || "Thread"} - ${colorInfo}`,
                productType: ProductType.THREAD,
                currentQuantity: quantity,
                unitOfMeasure:
                    dyeingProcess.threadPurchase?.unitOfMeasure || "kg",
                minStockLevel: body.minStockLevel
                    ? Number(body.minStockLevel)
                    : Math.ceil(quantity * 0.1),
                location: body.location || "Main Warehouse",
                costPerUnit: unitCost,
                salePrice: unitCost * (1 + markup),
                lastRestocked: new Date(),
                notes:
                    body.notes ||
                    `Added from dyeing process #${dyeingProcess.id}`,
                threadTypeId,
            },
            include: {
                threadType: true,
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
                unitCost: unitCost,
                totalCost: totalCost,
                notes: `Initial inventory from dyeing process #${dyeingProcess.id}`,
                dyeingProcessId,
                threadPurchaseId: dyeingProcess.threadPurchaseId,
            },
        });

        // Update dyeing process status if needed
        await db.dyeingProcess.update({
            where: { id: dyeingProcessId },
            data: {
                resultStatus: "COMPLETED",
                inventoryStatus: "ADDED",
            },
        });

        // Format the response to ensure all numeric values are properly converted from Decimal
        const formattedInventoryItem = {
            ...inventoryItem,
            currentQuantity: Number(inventoryItem.currentQuantity),
            minStockLevel: inventoryItem.minStockLevel
                ? Number(inventoryItem.minStockLevel)
                : 0,
            costPerUnit: Number(inventoryItem.costPerUnit),
            salePrice: Number(inventoryItem.salePrice),
        };

        const formattedTransaction = {
            ...transaction,
            quantity: Number(transaction.quantity),
            remainingQuantity: Number(transaction.remainingQuantity),
            unitCost: transaction.unitCost
                ? Number(transaction.unitCost)
                : null,
            totalCost: transaction.totalCost
                ? Number(transaction.totalCost)
                : null,
        };

        return NextResponse.json({
            inventoryItem: formattedInventoryItem,
            transaction: formattedTransaction,
        });
    } catch (error) {
        console.error("Error adding dyed thread to inventory:", error);
        return NextResponse.json(
            {
                error: "Failed to add dyed thread to inventory",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
