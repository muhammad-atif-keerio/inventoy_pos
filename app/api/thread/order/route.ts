import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import {
    ColorStatus,
    InventoryTransactionType,
    PaymentMode,
    Prisma,
    ProductType,
} from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/thread/order
 * Fetch thread orders with optional filtering
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const vendorId = searchParams.get("vendorId");
        const status = searchParams.get("status");
        const includeInventory =
            searchParams.get("includeInventory") === "true";

        // Build filters
        const filters: Prisma.ThreadPurchaseWhereInput = {};

        if (vendorId) {
            filters.vendorId = parseInt(vendorId);
        }

        if (status === "received") {
            filters.received = true;
        }

        // Query the database with filters and include related data
        const threadOrders = await db.threadPurchase.findMany({
            where: filters,
            include: {
                vendor: true,
                dyeingProcesses: true,
                inventoryEntries: includeInventory,
                paymentTransactions: true,
                fabricProductions: true,
            },
            orderBy: {
                orderDate: "desc",
            },
        });

        // Transform and return the data
        const transformedOrders = threadOrders.map((order) => {
            const dyeingProcessExists =
                order.dyeingProcesses && order.dyeingProcesses.length > 0;
            const hasFabricProductions =
                order.fabricProductions && order.fabricProductions.length > 0;

            // Get unit of measure from the database field
            const unitOfMeasure = order.unitOfMeasure || "meters";

            // Transform inventory entries if included
            const inventoryEntries =
                includeInventory && order.inventoryEntries
                    ? order.inventoryEntries.map((entry) => ({
                          id: entry.id,
                          quantity: entry.quantity,
                          remainingQuantity: entry.remainingQuantity,
                          transactionType: entry.transactionType,
                          transactionDate: entry.transactionDate.toISOString(),
                          unitCost: entry.unitCost
                              ? Number(entry.unitCost)
                              : null,
                          totalCost: entry.totalCost
                              ? Number(entry.totalCost)
                              : null,
                      }))
                    : undefined;

            // Calculate inventory status
            const hasInventoryEntries =
                includeInventory &&
                order.inventoryEntries &&
                order.inventoryEntries.length > 0;

            // Calculate payment status
            const hasPayments =
                order.paymentTransactions &&
                order.paymentTransactions.length > 0;
            let totalPayments = 0;
            let paymentStatus = "PENDING";

            if (hasPayments) {
                totalPayments = order.paymentTransactions.reduce(
                    (sum, payment) => sum + Number(payment.amount),
                    0,
                );
                const totalCost = Number(order.totalCost);

                if (totalPayments >= totalCost) {
                    paymentStatus = "PAID";
                } else if (totalPayments > 0) {
                    paymentStatus = "PARTIAL";
                }
            }

            return {
                id: order.id,
                vendorId: order.vendorId,
                vendorName: order.vendor.name,
                orderDate: order.orderDate.toISOString(),
                threadType: order.threadType,
                color: order.color,
                colorStatus: order.colorStatus,
                unitOfMeasure: unitOfMeasure,
                quantity: order.quantity,
                unitPrice: Number(order.unitPrice),
                totalCost: Number(order.totalCost),
                deliveryDate: order.deliveryDate
                    ? order.deliveryDate.toISOString()
                    : null,
                reference: order.reference,
                remarks: order.remarks,
                received: order.received,
                receivedAt: order.receivedAt
                    ? order.receivedAt.toISOString()
                    : null,
                isDyed: dyeingProcessExists,
                dyeingProcessId: dyeingProcessExists
                    ? order.dyeingProcesses[0]?.id
                    : null,
                hasFabricProductions,
                inventoryEntries: inventoryEntries,
                inventoryStatus: hasInventoryEntries ? "UPDATED" : "PENDING",
                paymentStatus,
                totalPayments,
                remainingBalance: Math.max(
                    0,
                    Number(order.totalCost) - totalPayments,
                ),
            };
        });

        return NextResponse.json({
            success: true,
            data: transformedOrders,
        });
    } catch (error) {
        console.error("Error fetching thread orders:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch thread orders",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/thread/order
 * Create a new thread purchase order
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            vendorId,
            threadType,
            colorStatus,
            color,
            quantity,
            unitPrice,
            totalCost,
            deliveryDate,
            remarks,
            reference,
            addToInventory,
            createDyeingProcess,
            paymentAmount,
            paymentMode,
            paymentReference,
            paymentRemarks,
        } = body;

        if (
            !vendorId ||
            !threadType ||
            !colorStatus ||
            !quantity ||
            !unitPrice
        ) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        if (
            typeof vendorId !== "number" ||
            typeof threadType !== "string" ||
            typeof quantity !== "number" ||
            !["COLORED", "RAW"].includes(colorStatus)
        ) {
            return NextResponse.json(
                { error: "Invalid data types" },
                { status: 400 },
            );
        }

        // Calculate totalCost if not provided
        const calculatedTotalCost = totalCost || quantity * unitPrice;

        // Create new thread purchase record
        const threadPurchase = await db.threadPurchase.create({
            data: {
                vendorId,
                threadType,
                colorStatus: colorStatus as ColorStatus,
                color: color || null,
                quantity,
                unitPrice,
                totalCost: calculatedTotalCost,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
                remarks,
                reference,
                received: body.received || false,
                receivedAt: body.received ? new Date() : null,
            },
            include: {
                vendor: true,
            },
        });

        // If received is true and addToInventory flag is true, add to inventory
        if (body.received && addToInventory) {
            try {
                // Check if thread type exists or create it
                let threadType = await db.threadType.findFirst({
                    where: {
                        name: { equals: body.threadType, mode: "insensitive" },
                    },
                });

                if (!threadType) {
                    threadType = await db.threadType.create({
                        data: {
                            name: body.threadType,
                            units: body.unitOfMeasure || "meters",
                        },
                    });
                }

                // Generate a unique item code
                const itemCode = `THR-${threadPurchase.id}-${Date.now().toString().slice(-6)}`;

                // Create inventory item
                const inventoryItem = await db.inventory.create({
                    data: {
                        itemCode,
                        description: `${body.threadType} - ${body.color || "Raw"}`,
                        productType: ProductType.THREAD,
                        threadTypeId: threadType.id,
                        currentQuantity: quantity,
                        unitOfMeasure: body.unitOfMeasure || "meters",
                        minStockLevel: 100,
                        costPerUnit: unitPrice,
                        salePrice: unitPrice * 1.2, // 20% markup
                        location: "Warehouse",
                        lastRestocked: new Date(),
                        notes: `Thread purchased from ${threadPurchase.vendor.name}`,
                    },
                });

                // Create inventory transaction
                await db.inventoryTransaction.create({
                    data: {
                        inventoryId: inventoryItem.id,
                        transactionType: InventoryTransactionType.PURCHASE,
                        quantity,
                        remainingQuantity: quantity,
                        unitCost: unitPrice,
                        totalCost: calculatedTotalCost,
                        referenceType: "ThreadPurchase",
                        referenceId: threadPurchase.id,
                        threadPurchaseId: threadPurchase.id,
                        notes: `Initial inventory from thread purchase #${threadPurchase.id}`,
                    },
                });
            } catch (inventoryError) {
                console.error("Error adding to inventory:", inventoryError);
                // Continue even if inventory creation fails
            }
        }

        // If the thread is RAW and createDyeingProcess is true, create a dyeing process record
        if (colorStatus === ColorStatus.RAW && createDyeingProcess) {
            await db.dyeingProcess.create({
                data: {
                    threadPurchaseId: threadPurchase.id,
                    dyeDate: new Date(),
                    dyeQuantity: quantity,
                    outputQuantity: 0, // Will be updated after dyeing process is complete
                    resultStatus: "PENDING",
                },
            });
        }

        // If payment information is provided, create a payment record
        if (paymentAmount && paymentAmount > 0 && paymentMode) {
            await db.payment.create({
                data: {
                    amount: paymentAmount,
                    mode: paymentMode as PaymentMode,
                    threadPurchaseId: threadPurchase.id,
                    description: `Payment for thread purchase #${threadPurchase.id}`,
                    referenceNumber: paymentReference || null,
                    remarks: paymentRemarks || null,
                },
            });
        }

        // Format the response
        const formattedThreadPurchase = {
            ...threadPurchase,
            orderDate: threadPurchase.orderDate.toISOString(),
            deliveryDate: threadPurchase.deliveryDate
                ? threadPurchase.deliveryDate.toISOString()
                : null,
            receivedAt: threadPurchase.receivedAt
                ? threadPurchase.receivedAt.toISOString()
                : null,
            unitPrice: Number(threadPurchase.unitPrice),
            totalCost: Number(threadPurchase.totalCost),
            vendor: {
                ...threadPurchase.vendor,
                createdAt: threadPurchase.vendor.createdAt.toISOString(),
                updatedAt: threadPurchase.vendor.updatedAt.toISOString(),
            },
        };

        return NextResponse.json({
            success: true,
            data: formattedThreadPurchase,
        });
    } catch (error) {
        console.error("Error creating thread order:", error);
        return NextResponse.json(
            {
                error: "Failed to create thread order",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
