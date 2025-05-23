import { NextRequest, NextResponse } from "next/server";

import { InventoryTransactionType, ProductType } from "@prisma/client";
import { randomUUID } from "crypto";

import { db } from "@/lib/db";

// Helper function to generate a unique ID
// function generateUniqueID(prefix = 'TR'): string {
//   return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
// }

// POST /api/inventory/thread-purchase - Add thread purchase to inventory
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.threadPurchaseId) {
            return NextResponse.json(
                { error: "Thread purchase ID is required" },
                { status: 400 },
            );
        }

        const threadPurchaseId = Number(body.threadPurchaseId);

        // Check if thread purchase exists
        const threadPurchase = await db.threadPurchase.findUnique({
            where: { id: threadPurchaseId },
            include: {
                vendor: true,
            },
        });

        if (!threadPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Generate an item code based on type and ID
        const itemCode = `THRD-${threadPurchase.id}-${randomUUID().substring(0, 4)}`;

        // Get or create thread type
        let threadTypeId = null;

        if (threadPurchase.threadType) {
            const threadType = await db.threadType.findFirst({
                where: {
                    name: {
                        equals: threadPurchase.threadType,
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
                        name: threadPurchase.threadType,
                        units: threadPurchase.unitOfMeasure || "kg",
                        description: `Thread type from purchase #${threadPurchase.id}`,
                    },
                });
                threadTypeId = newThreadType.id;
            }
        }

        // Calculate quantity to add
        const quantity = body.quantity
            ? Number(body.quantity)
            : Number(threadPurchase.quantity);
        const unitPrice = Number(threadPurchase.unitPrice);
        const markup = body.markup ? Number(body.markup) : 0.2;

        // Create inventory item
        const inventoryItem = await db.inventory.create({
            data: {
                itemCode,
                description:
                    body.description ||
                    `${threadPurchase.threadType} Thread ${threadPurchase.color ? "- " + threadPurchase.color : ""}`,
                productType: ProductType.THREAD,
                currentQuantity: quantity,
                unitOfMeasure: threadPurchase.unitOfMeasure || "kg",
                minStockLevel: body.minStockLevel
                    ? Number(body.minStockLevel)
                    : Math.ceil(quantity * 0.1),
                location: body.location || "Main Warehouse",
                costPerUnit: unitPrice,
                salePrice: unitPrice * (1 + markup),
                lastRestocked: new Date(),
                notes:
                    body.notes ||
                    `Added from thread purchase #${threadPurchase.id}`,
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
                transactionType: InventoryTransactionType.PURCHASE,
                transactionDate: new Date(),
                quantity,
                remainingQuantity: quantity,
                unitCost: unitPrice,
                totalCost: unitPrice * quantity,
                notes: `Initial inventory from thread purchase #${threadPurchase.id}`,
                threadPurchaseId,
            },
        });

        // Update thread purchase status if needed
        await db.threadPurchase.update({
            where: { id: threadPurchaseId },
            data: {
                received: true,
                inventoryStatus: "ADDED",
            },
        });

        return NextResponse.json({
            inventoryItem: {
                ...inventoryItem,
                costPerUnit: Number(inventoryItem.costPerUnit),
                salePrice: Number(inventoryItem.salePrice),
            },
            transaction,
        });
    } catch (error) {
        console.error("Error adding thread purchase to inventory:", error);
        return NextResponse.json(
            {
                error: "Failed to add thread purchase to inventory",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
