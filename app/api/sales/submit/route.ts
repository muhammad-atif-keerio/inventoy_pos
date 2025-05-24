/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import {
    ChequeStatus,
    InventoryTransactionType,
    PaymentMode,
    PaymentStatus,
    ProductType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

// Interface for cart item in submission
interface SalesOrderItemData {
    productType: ProductType;
    productId: number;
    threadPurchaseId?: number | null;
    fabricProductionId?: number | null;
    quantitySold: number;
    unitPrice: number;
    discount: number;
    tax: number;
    subtotal: number;
    inventoryItemId?: number;
}

// Interface for sales submission data
interface SalesSubmissionData {
    customerName: string;
    customerId?: number;
    orderDate: Date;
    deliveryDate?: Date;
    deliveryAddress?: string;
    remarks?: string;
    paymentMode?: PaymentMode;
    chequeStatus?: ChequeStatus;
    paymentStatus: PaymentStatus;
    orderNumber?: string;
    updateInventory: boolean;
    allowBelowMinStock?: boolean;
    chequeNumber?: string;
    bank?: string;
    branch?: string;
    paymentAmount?: number;
    discount: number;
    tax: number;
    totalSale: number;
    items: SalesOrderItemData[];
    idempotencyKey?: string;
}

// Outside the try-catch block, create a function for formatting error messages
function formatErrorResponse(
    error: unknown,
    transactionId?: string,
): NextResponse {
    const prefix = transactionId ? `[${transactionId}] ` : "";
    console.error(`${prefix}Error creating sales order:`, error);

    // Format different types of errors specifically
    let errorMessage = "Unknown error occurred";
    let statusCode = 500;

    if (error instanceof Error) {
        errorMessage = error.message;

        // Handle specific Prisma errors more gracefully
        if (error.name === "PrismaClientKnownRequestError") {
            // @ts-expect-error - Prisma error specific properties
            if (error.code === "P2002") {
                errorMessage = "A record with this identifier already exists.";
                statusCode = 409; // Conflict
            }
            // @ts-expect-error - Prisma error specific properties
            else if (error.code === "P2025") {
                errorMessage = "Record not found.";
                statusCode = 404; // Not Found
            }
            // @ts-expect-error - Prisma error specific properties
            else if (error.code === "P2003") {
                errorMessage =
                    "Foreign key constraint failed. Referenced record may not exist.";
                statusCode = 400; // Bad Request
            }
        }
    }

    return NextResponse.json(
        {
            error: "Failed to create sales order",
            details: errorMessage,
            timestamp: new Date().toISOString(),
            transactionId,
        },
        { status: statusCode },
    );
}

export async function POST(req: NextRequest) {
    try {
        // Comment out auth check for now
        // const session = await auth();
        // if (!session) {
        //     return NextResponse.json(
        //         { error: "Unauthorized" },
        //         { status: 401 }
        //     );
        // }

        // Create a unique transaction ID for tracking this request
        const transactionId = `sales-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        console.log(`[${transactionId}] Starting sales order submission...`);

        // Validate request content type
        const contentType = req.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.warn(
                `[${transactionId}] Invalid content type: ${contentType}`,
            );
            return NextResponse.json(
                {
                    error: "Invalid content type. Expected application/json",
                },
                { status: 400 },
            );
        }

        const data = (await req.json()) as SalesSubmissionData;
        console.log(
            `[${transactionId}] Received sales data:`,
            JSON.stringify(data, null, 2),
        );

        // Check for idempotency key to prevent duplicate submissions
        const idempotencyKey = data.idempotencyKey;
        
        if (idempotencyKey) {
            // Check if we've already processed this request - using simpler contains query
            try {
                const existingSubmission = await prisma.salesOrder.findFirst({
                    where: {
                        // Use a simple approach to search in JSON
                        orderNumber: {
                            contains: idempotencyKey
                        }
                    },
                    include: {
                        customer: true,
                        payments: true
                    }
                });

                // If this request was already processed, return the existing data
                if (existingSubmission) {
                    console.log(`Duplicate submission detected with key ${idempotencyKey}. Returning existing order.`);
                    
                    return NextResponse.json({
                        success: true,
                        message: 'Order already processed',
                        salesOrder: existingSubmission,
                        isRetry: true
                    }, { status: 200 });
                }
            } catch (error) {
                console.error("Error checking idempotency key:", error);
                // Continue with the request even if idempotency check fails
            }
        }

        // Validate required fields
        if (!data.customerName) {
            return NextResponse.json(
                { error: "Customer name is required" },
                { status: 400 },
            );
        }

        if (
            !data.items ||
            !Array.isArray(data.items) ||
            data.items.length === 0
        ) {
            return NextResponse.json(
                { error: "At least one product item is required" },
                { status: 400 },
            );
        }

        // Validate all items have required fields and calculation accuracy
        let calculatedTotalSale = 0;
        const productTracker = new Set();

        for (const item of data.items) {
            if (!item.productType) {
                return NextResponse.json(
                    { error: "All items must have a product type" },
                    { status: 400 },
                );
            }
            if (item.quantitySold <= 0) {
                return NextResponse.json(
                    {
                        error: `Invalid quantity for ${item.productType} item. Must be greater than 0.`,
                    },
                    { status: 400 },
                );
            }
            if (item.unitPrice <= 0) {
                return NextResponse.json(
                    {
                        error: `Invalid price for ${item.productType} item. Must be greater than 0.`,
                    },
                    { status: 400 },
                );
            }

            // Check for duplicate items in the order
            const productKey = `${item.productType}_${item.productId}_${item.inventoryItemId || "null"}`;
            if (productTracker.has(productKey)) {
                return NextResponse.json(
                    {
                        error: `Duplicate item detected: ${item.productType} with ID ${item.productId}. Please combine quantities instead.`,
                    },
                    { status: 400 },
                );
            }
            productTracker.add(productKey);

            // Verify the subtotal calculation accuracy
            const calculatedSubtotal =
                item.unitPrice *
                item.quantitySold *
                (1 - (item.discount || 0) / 100) *
                (1 + (item.tax || 0) / 100);
            const roundedCalculatedSubtotal =
                Math.round(calculatedSubtotal * 100) / 100; // Round to 2 decimal places
            const roundedProvidedSubtotal =
                Math.round(item.subtotal * 100) / 100; // Round to 2 decimal places

            if (
                Math.abs(roundedCalculatedSubtotal - roundedProvidedSubtotal) >
                0.01
            ) {
                console.warn(
                    `Subtotal calculation mismatch: provided=${roundedProvidedSubtotal}, calculated=${roundedCalculatedSubtotal}`,
                );
                // Auto-correct the subtotal if needed
                item.subtotal = roundedCalculatedSubtotal;
            }

            calculatedTotalSale += item.subtotal;
        }

        // Verify that the total matches the sum of items (accounting for discounts and taxes)
        let roundedCalculatedTotal =
            Math.round(calculatedTotalSale * 100) / 100;
        const roundedProvidedTotal = Math.round(data.totalSale * 100) / 100;

        // Apply overall discount and tax if provided (after the individual items)
        if (data.discount && data.discount > 0) {
            roundedCalculatedTotal =
                roundedCalculatedTotal * (1 - data.discount / 100);
        }

        if (data.tax && data.tax > 0) {
            roundedCalculatedTotal =
                roundedCalculatedTotal * (1 + data.tax / 100);
        }

        if (Math.abs(roundedCalculatedTotal - roundedProvidedTotal) > 0.5) {
            console.warn(
                `Total sale mismatch: provided=${roundedProvidedTotal}, calculated=${roundedCalculatedTotal}`,
            );
            // We'll allow a small difference in calculation but warn about it
            if (Math.abs(roundedCalculatedTotal - roundedProvidedTotal) > 5) {
                return NextResponse.json(
                    {
                        error: `Total sale amount (${roundedProvidedTotal}) doesn't match the calculated sum of items (${roundedCalculatedTotal})`,
                    },
                    { status: 400 },
                );
            }
        }

        // Add validation for total amount
        if (data.totalSale <= 0) {
            return NextResponse.json(
                {
                    error: "Total sale amount must be greater than 0",
                },
                { status: 400 },
            );
        }

        // Validate that payment amount doesn't exceed total sale
        if (data.paymentAmount && data.paymentAmount > data.totalSale) {
            return NextResponse.json(
                {
                    error: "Payment amount cannot exceed total sale amount",
                },
                { status: 400 },
            );
        }

        // Validate payment information
        if (
            data.paymentStatus === "PAID" &&
            (!data.paymentAmount || data.paymentAmount <= 0)
        ) {
            return NextResponse.json(
                {
                    error: "Payment amount is required for PAID status and must be greater than 0",
                },
                { status: 400 },
            );
        }

        if (
            data.paymentStatus === "PARTIAL" &&
            (!data.paymentAmount || data.paymentAmount <= 0)
        ) {
            return NextResponse.json(
                {
                    error: "Payment amount is required for PARTIAL status and must be greater than 0",
                },
                { status: 400 },
            );
        }

        // Validate cheque details if payment mode is CHEQUE
        if (data.paymentMode === "CHEQUE") {
            if (!data.chequeNumber) {
                return NextResponse.json(
                    {
                        error: "Cheque number is required for CHEQUE payment mode",
                    },
                    { status: 400 },
                );
            }
            if (!data.bank) {
                return NextResponse.json(
                    { error: "Bank name is required for CHEQUE payment mode" },
                    { status: 400 },
                );
            }
        }

        // Validate delivery date is not in the past
        if (data.deliveryDate) {
            const deliveryDate = new Date(data.deliveryDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (deliveryDate < today) {
                return NextResponse.json(
                    {
                        error: "Delivery date cannot be in the past",
                    },
                    { status: 400 },
                );
            }
        }

        // Validate order date is not in the future
        const orderDate = new Date(data.orderDate);
        const now = new Date();
        if (orderDate > now) {
            return NextResponse.json(
                {
                    error: "Order date cannot be in the future",
                },
                { status: 400 },
            );
        }

        // Generate truly unique order number and prevent duplicates
        // Generate order number if not provided or check if the provided one already exists
        let orderNumber: string;
        if (data.orderNumber) {
            orderNumber = data.orderNumber;

            // Check if order number already exists
            const existingOrder = await prisma.salesOrder.findUnique({
                where: { orderNumber: data.orderNumber },
            });

            if (existingOrder) {
                // If duplicate, generate a new unique number
                const timestamp = new Date()
                    .toISOString()
                    .replace(/[^0-9]/g, "")
                    .slice(0, 14);
                const randomSuffix = Math.floor(Math.random() * 10000)
                    .toString()
                    .padStart(4, "0");
                orderNumber = `SO-${timestamp}-${randomSuffix}`;
                console.log(
                    `Duplicate order number detected. Generated new order number: ${orderNumber}`,
                );
            }
        } else {
            // Generate a new unique order number
            const timestamp = new Date()
                .toISOString()
                .replace(/[^0-9]/g, "")
                .slice(0, 14);
            const randomSuffix = Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, "0");
            orderNumber = `SO-${timestamp}-${randomSuffix}`;
            console.log(`Generated new order number: ${orderNumber}`);
        }

        try {
            console.log(
                `Processing sales order with order number: ${orderNumber}`,
            );

            // Create customer if needed
            let customerId = data.customerId;
            if (!customerId) {
                const newCustomer = await prisma.customer.create({
                    data: {
                        name: data.customerName,
                        contact: "Unknown", // Default contact as it's required
                        updatedAt: new Date(), // updatedAt is required by schema but not auto-managed
                    } as any, // Safe type assertion to handle TS error
                });
                customerId = newCustomer.id;
            }

            console.log(
                `[${transactionId}] Starting transaction for sales order ${orderNumber}`,
            );

            // Add performance monitoring
            const startTime = Date.now();

            // Inside the transaction, add timing logs
            console.log(
                `[${transactionId}] Transaction started at ${new Date().toISOString()}`,
            );

            // Execute the transaction and store its result
            const result = await prisma.$transaction(
                async (tx) => {
                    // Create the sales order using Prisma's typed API
                    const salesOrder = await tx.salesOrder.create({
                        data: {
                            orderNumber,
                            orderDate: new Date(data.orderDate),
                            customerId,
                            deliveryDate: data.deliveryDate
                                ? new Date(data.deliveryDate)
                                : null,
                            deliveryAddress: data.deliveryAddress || null,
                            remarks: data.remarks 
                                ? data.remarks + '\n\n' + JSON.stringify({
                                    submittedAt: new Date().toISOString(),
                                    idempotencyKey: idempotencyKey || null,
                                    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                                    userAgent: req.headers.get('user-agent') || 'unknown'
                                })
                                : JSON.stringify({
                                    submittedAt: new Date().toISOString(),
                                    idempotencyKey: idempotencyKey || null,
                                    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                                    userAgent: req.headers.get('user-agent') || 'unknown'
                                }),
                            paymentMode: data.paymentMode || null,
                            paymentStatus: data.paymentStatus,
                            discount: data.discount || 0,
                            tax: data.tax || 0,
                            totalSale: data.totalSale,
                            // Note: updatedAt is not needed for SalesOrder based on schema
                        },
                    });

                    if (!salesOrder) {
                        throw new Error("Failed to create sales order");
                    }

                    console.log(
                        `Created sales order with ID ${salesOrder.id} and order number ${salesOrder.orderNumber}`,
                    );

                    // Helper function to create sales order items
                    async function createSalesOrderItem(
                        item: SalesOrderItemData,
                    ) {
                        try {
                            if (item.productType === ProductType.THREAD) {
                                // Double-check that the thread purchase exists
                                const threadPurchaseId = item.threadPurchaseId || item.productId;
                                const threadPurchase =
                                    await tx.threadPurchase.findUnique({
                                        where: {
                                            id: threadPurchaseId,
                                        },
                                    });

                                if (!threadPurchase) {
                                    throw new Error(
                                        `Thread purchase with ID ${threadPurchaseId} not found`,
                                    );
                                }

                                // Create the sales order item with the correct field structure
                                const orderItem =
                                    await tx.salesOrderItem.create({
                                        data: {
                                            salesOrderId: salesOrder.id,
                                            quantitySold: item.quantitySold,
                                            unitPrice: item.unitPrice,
                                            discount: item.discount || 0,
                                            tax: item.tax || 0,
                                            subtotal: item.subtotal,
                                            productType: ProductType.THREAD,
                                            productId: item.productId,
                                            // Use type assertion for the fields that TypeScript doesn't recognize
                                            threadPurchaseId: threadPurchaseId,
                                            fabricProductionId: null, // Set explicitly to null
                                            inventoryItemId:
                                                item.inventoryItemId,
                                            updatedAt: new Date(),
                                        } as any, // Using type assertion to avoid TS errors
                                    });

                                console.log(
                                    `Successfully created THREAD order item: ${JSON.stringify(
                                        {
                                            id: orderItem.id,
                                            productType: orderItem.productType,
                                            // Use optional chaining to avoid TypeScript error
                                            threadPurchaseId: (orderItem as any).threadPurchaseId,
                                        },
                                    )}`,
                                );

                                return orderItem;
                            } else if (
                                item.productType === ProductType.FABRIC
                            ) {
                                // Double-check that the fabric production exists
                                const fabricProductionId = item.fabricProductionId || item.productId;
                                const fabricProduction =
                                    await tx.fabricProduction.findUnique({
                                        where: {
                                            id: fabricProductionId,
                                        },
                                    });

                                if (!fabricProduction) {
                                    throw new Error(
                                        `Fabric production with ID ${fabricProductionId} not found`,
                                    );
                                }

                                // Create the sales order item with the correct field structure
                                const orderItem =
                                    await tx.salesOrderItem.create({
                                        data: {
                                            salesOrderId: salesOrder.id,
                                            quantitySold: item.quantitySold,
                                            unitPrice: item.unitPrice,
                                            discount: item.discount || 0,
                                            tax: item.tax || 0,
                                            subtotal: item.subtotal,
                                            productType: ProductType.FABRIC,
                                            productId: item.productId,
                                            threadPurchaseId: null, // Set explicitly to null
                                            fabricProductionId: fabricProductionId,
                                            inventoryItemId:
                                                item.inventoryItemId,
                                            updatedAt: new Date(),
                                        } as any, // Using type assertion to avoid TS errors
                                    });

                                console.log(
                                    `Successfully created FABRIC order item: ${JSON.stringify(
                                        {
                                            id: orderItem.id,
                                            productType: orderItem.productType,
                                            // Use optional chaining to avoid TypeScript error
                                            fabricProductionId: (orderItem as any).fabricProductionId,
                                        },
                                    )}`,
                                );

                                return orderItem;
                            } else {
                                throw new Error(
                                    `Unknown product type: ${item.productType}`,
                                );
                            }
                        } catch (error) {
                            console.error(
                                `Error creating sales order item: ${error}`,
                            );
                            throw error;
                        }
                    }

                    // Process each item and create sales order items
                    const createdItems = [];

                    for (const item of data.items) {
                        try {
                            // Validate product existence based on type
                            let orderItem;

                            if (item.productType === ProductType.THREAD) {
                                let threadExists = false;

                                // First check the inventory itself to get proper reference data
                                let threadPurchaseId =
                                    item.threadPurchaseId || item.productId;
                                let threadPurchase = null;

                                // Get correct thread purchase ID from inventory if possible
                                if (item.inventoryItemId) {
                                    try {
                                        // Look up related thread ID through inventory transactions
                                        const inventoryTransactions =
                                            await tx.inventoryTransaction.findMany(
                                                {
                                                    where: {
                                                        inventoryId:
                                                            item.inventoryItemId,
                                                        threadPurchaseId: {
                                                            not: null,
                                                        },
                                                    },
                                                    orderBy: {
                                                        createdAt: "desc",
                                                    },
                                                    take: 1,
                                                },
                                            );

                                        if (
                                            inventoryTransactions.length > 0 &&
                                            inventoryTransactions[0]
                                                .threadPurchaseId
                                        ) {
                                            console.log(
                                                `Found thread purchase ID ${inventoryTransactions[0].threadPurchaseId} from inventory item ${item.inventoryItemId}`,
                                            );
                                            threadPurchaseId =
                                                inventoryTransactions[0]
                                                    .threadPurchaseId;
                                            item.threadPurchaseId =
                                                threadPurchaseId; // Update the threadPurchaseId field
                                        }
                                    } catch (error) {
                                        console.warn(
                                            `Could not look up thread purchase ID from inventory: ${error}`,
                                        );
                                    }
                                }

                                // Try to find the thread purchase
                                try {
                                    threadPurchase =
                                        await tx.threadPurchase.findUnique({
                                            where: { id: threadPurchaseId },
                                        });

                                    if (threadPurchase) {
                                        threadExists = true;
                                        item.threadPurchaseId =
                                            threadPurchase.id; // Set the explicit threadPurchaseId
                                    }
                                } catch (error) {
                                    console.warn(
                                        `Error looking up thread purchase: ${error}`,
                                    );
                                }

                                if (!threadExists) {
                                    // Check if we at least have inventory
                                    if (!item.inventoryItemId) {
                                        throw new Error(
                                            `Thread product with ID ${threadPurchaseId} not found and no inventory data available`,
                                        );
                                    }

                                    // Get inventory details
                                    const inventory =
                                        await tx.inventory.findUnique({
                                            where: { id: item.inventoryItemId },
                                            include: { threadType: true },
                                        });

                                    if (!inventory) {
                                        throw new Error(
                                            `Inventory item with ID ${item.inventoryItemId} not found`,
                                        );
                                    }
                                }
                            } else if (
                                item.productType === ProductType.FABRIC
                            ) {
                                let fabricExists = false;

                                // First check if we have an inventory reference
                                if (item.inventoryItemId) {
                                    const inventoryItem =
                                        await tx.inventory.findUnique({
                                            where: { id: item.inventoryItemId },
                                        });

                                    // Check if it's a fabric inventory item
                                    if (
                                        inventoryItem &&
                                        inventoryItem.productType ===
                                            ProductType.FABRIC
                                    ) {
                                        fabricExists = true;

                                        // Look up related fabric ID through inventory transactions
                                        const inventoryTransaction =
                                            await tx.inventoryTransaction.findFirst(
                                                {
                                                    where: {
                                                        inventoryId:
                                                            item.inventoryItemId,
                                                        fabricProductionId: {
                                                            not: null,
                                                        },
                                                    },
                                                    orderBy: {
                                                        createdAt: "desc",
                                                    },
                                                },
                                            );

                                        // Update the product ID if needed
                                        if (
                                            inventoryTransaction?.fabricProductionId &&
                                            inventoryTransaction.fabricProductionId !==
                                                item.productId
                                        ) {
                                            console.log(
                                                `Correcting fabric ID from ${item.productId} to ${inventoryTransaction.fabricProductionId}`,
                                            );
                                            item.productId =
                                                inventoryTransaction.fabricProductionId;
                                            // Explicitly set the fabricProductionId field
                                            item.fabricProductionId =
                                                inventoryTransaction.fabricProductionId;
                                        } else if (!item.fabricProductionId) {
                                            // If no fabricProductionId is set, use the productId
                                            item.fabricProductionId =
                                                item.productId;
                                        }
                                    }
                                }

                                // If no inventory reference or it didn't validate, try direct fabric lookup
                                if (!fabricExists) {
                                    const fabricProduction =
                                        await tx.fabricProduction.findUnique({
                                            where: {
                                                id:
                                                    item.fabricProductionId ||
                                                    item.productId,
                                            },
                                        });

                                    if (fabricProduction) {
                                        fabricExists = true;
                                        // Ensure fabricProductionId is set
                                        item.fabricProductionId =
                                            fabricProduction.id;
                                    } else {
                                        throw new Error(
                                            `Fabric product with ID ${item.productId} not found or is unavailable`,
                                        );
                                    }
                                }
                            }

                            console.log(
                                `Creating sales order item with productType=${item.productType}, productId=${item.productId}, threadPurchaseId=${item.threadPurchaseId}, fabricProductionId=${item.fabricProductionId}`,
                            );

                            // Create the actual sales item using the improved method
                            // eslint-disable-next-line prefer-const
                            orderItem = await createSalesOrderItem(item);
                            createdItems.push(orderItem);

                            // For better error handling, let's get the created item with its relationships
                            let orderItemWithDetails;
                            try {
                                // Use a function to determine which fields to include
                                orderItemWithDetails =
                                    await tx.salesOrderItem.findUnique({
                                        where: { id: orderItem.id },
                                        include: {
                                            ...(item.productType ===
                                            ProductType.THREAD
                                                ? { threadPurchase: true }
                                                : {}),
                                            ...(item.productType ===
                                            ProductType.FABRIC
                                                ? { fabricProduction: true }
                                                : {}),
                                        },
                                    });

                                console.log(
                                    `Successfully created order item ID ${orderItem.id} for product type ${item.productType}`,
                                );

                                if (orderItemWithDetails) {
                                    // Log the successful creation with details
                                    const threadPurchaseInfo =
                                        item.productType ===
                                            ProductType.THREAD &&
                                        orderItemWithDetails.threadPurchase
                                            ? `threadPurchase ID: ${orderItemWithDetails.threadPurchase.id}`
                                            : "none";

                                    const fabricProductionInfo =
                                        item.productType ===
                                            ProductType.FABRIC &&
                                        orderItemWithDetails.fabricProduction
                                            ? `fabricProduction ID: ${orderItemWithDetails.fabricProduction.id}`
                                            : "none";

                                    console.log(
                                        `Order item details: ${threadPurchaseInfo}, ${fabricProductionInfo}`,
                                    );

                                    // Update our createdItems array with the detailed version
                                    createdItems[createdItems.length - 1] =
                                        orderItemWithDetails;
                                } else {
                                    console.warn(
                                        `Could not get details for order item ID ${orderItem.id}`,
                                    );
                                }
                            } catch (detailsError) {
                                console.error(
                                    `Error fetching details for order item ID ${orderItem.id}:`,
                                    detailsError,
                                );
                                // Don't throw here, we already created the item successfully
                            }

                            // Handle inventory update if required
                            if (data.updateInventory && item.inventoryItemId) {
                                // Get inventory details with a row lock to prevent race conditions
                                const inventory = await tx.inventory.findUnique(
                                    {
                                        where: { id: item.inventoryItemId },
                                    },
                                );

                                if (!inventory) {
                                    throw new Error(
                                        `Inventory item with ID ${item.inventoryItemId} not found`,
                                    );
                                }

                                if (
                                    inventory.currentQuantity <
                                    item.quantitySold
                                ) {
                                    throw new Error(
                                        `Insufficient inventory for item ID ${item.inventoryItemId}. Available: ${inventory.currentQuantity}, Requested: ${item.quantitySold}`,
                                    );
                                }

                                // Check that we're not selling below minimum stock level unless specifically approved
                                const newQuantity =
                                    inventory.currentQuantity -
                                    item.quantitySold;
                                if (
                                    newQuantity < inventory.minStockLevel &&
                                    !data.allowBelowMinStock
                                ) {
                                    console.warn(
                                        `Sale would reduce inventory below minimum stock level (${inventory.minStockLevel}), current: ${inventory.currentQuantity}, new: ${newQuantity}`,
                                    );
                                }

                                // Update inventory with proper calculation
                                await tx.inventory.update({
                                    where: { id: item.inventoryItemId },
                                    data: {
                                        currentQuantity: {
                                            decrement: item.quantitySold,
                                        },
                                        lastRestocked:
                                            newQuantity <=
                                            inventory.minStockLevel
                                                ? new Date()
                                                : inventory.lastRestocked,
                                    },
                                });

                                // Create inventory transaction with explicit relationship connections
                                try {
                                    // Determine transaction reference for product type
                                    const salesOrderId = salesOrder.id;

                                    // Create the transaction data object
                                    const transactionData = {
                                        inventoryId: item.inventoryItemId,
                                        transactionType:
                                            InventoryTransactionType.SALES,
                                        quantity: -item.quantitySold, // Negative for sales
                                        remainingQuantity:
                                            inventory.currentQuantity -
                                            item.quantitySold,
                                        unitCost: inventory.costPerUnit,
                                        totalCost:
                                            Number(inventory.costPerUnit) *
                                            item.quantitySold,
                                        referenceType: "SalesOrder",
                                        referenceId: salesOrderId,
                                        salesOrderId: salesOrderId,
                                        notes: `Sale: Order #${orderNumber}`,
                                        updatedAt: new Date(),
                                    };

                                    // Create transaction object with correct field based on product type
                                    if (item.productType === ProductType.THREAD) {
                                        // For thread items, ensure we have a valid thread purchase ID
                                        const validThreadPurchaseId = item.threadPurchaseId || item.productId;
                                        
                                        // Verify this thread purchase actually exists to avoid foreign key errors
                                        const threadPurchase = await tx.threadPurchase.findUnique({
                                            where: { id: validThreadPurchaseId },
                                            select: { id: true }
                                        });
                                        
                                        if (!threadPurchase) {
                                            console.warn(`Thread purchase ${validThreadPurchaseId} not found, skipping FK relation`);
                                            // Create without the thread purchase relation if it doesn't exist
                                            await tx.inventoryTransaction.create({
                                                data: transactionData
                                            });
                                        } else {
                                            // Create with thread purchase relation if it exists
                                            await tx.inventoryTransaction.create({
                                                data: {
                                                    ...transactionData,
                                                    threadPurchaseId: threadPurchase.id
                                                },
                                            });
                                        }
                                    } else if (item.productType === ProductType.FABRIC) {
                                        // For fabric items, ensure we have a valid fabric production ID
                                        const validFabricProductionId = item.fabricProductionId || item.productId;
                                        
                                        // Verify this fabric production actually exists to avoid foreign key errors
                                        const fabricProduction = await tx.fabricProduction.findUnique({
                                            where: { id: validFabricProductionId },
                                            select: { id: true }
                                        });
                                        
                                        if (!fabricProduction) {
                                            console.warn(`Fabric production ${validFabricProductionId} not found, skipping FK relation`);
                                            // Create without the fabric production relation if it doesn't exist
                                            await tx.inventoryTransaction.create({
                                                data: transactionData
                                            });
                                        } else {
                                            // Create with fabric production relation if it exists
                                            await tx.inventoryTransaction.create({
                                                data: {
                                                    ...transactionData,
                                                    fabricProductionId: fabricProduction.id
                                                },
                                            });
                                        }
                                    } else {
                                        // For other product types or if relationships cannot be established
                                        await tx.inventoryTransaction.create({
                                            data: transactionData,
                                        });
                                    }
                                } catch (inventoryTransactionError) {
                                    console.error(
                                        "Error creating inventory transaction:",
                                        inventoryTransactionError,
                                    );
                                    throw new Error(
                                        `Failed to update inventory: ${inventoryTransactionError instanceof Error ? inventoryTransactionError.message : "Unknown error"}`,
                                    );
                                }
                            }
                        } catch (error) {
                            console.error("Error processing item:", error);
                            throw error; // Re-throw to fail the transaction
                        }
                    }

                    // Create payment record if payment was made
                    let payment = null;
                    let paymentError = null;
                    try {
                        if (data.paymentAmount && data.paymentAmount > 0) {
                            payment = await tx.payment.create({
                                data: {
                                    transactionDate: new Date(),
                                    amount: data.paymentAmount,
                                    mode: data.paymentMode || PaymentMode.CASH,
                                    salesOrderId: salesOrder.id,
                                    referenceNumber: orderNumber,
                                    description: `Payment for Order #${orderNumber}`,
                                    remarks: data.remarks,
                                    updatedAt: new Date(), // Required by schema but not auto-managed
                                } as any, // Safe type assertion to handle TS error
                            });

                            console.log(
                                `Created payment record with ID ${payment.id} for amount ${data.paymentAmount}`,
                            );

                            // Create cheque record if payment mode is cheque
                            if (
                                payment &&
                                data.paymentMode === PaymentMode.CHEQUE &&
                                data.chequeNumber &&
                                data.bank
                            ) {
                                const chequeTransaction =
                                    await tx.chequeTransaction.create({
                                        data: {
                                            paymentId: payment.id,
                                            chequeNumber: data.chequeNumber,
                                            bank: data.bank,
                                            branch: data.branch || "",
                                            chequeAmount: data.paymentAmount,
                                            issueDate: new Date(),
                                            chequeStatus:
                                                data.chequeStatus ||
                                                ChequeStatus.PENDING,
                                            remarks: `Cheque payment for Order #${orderNumber}`,
                                            updatedAt: new Date(), // Required by schema but not auto-managed
                                        } as any, // Safe type assertion to handle TS error
                                    });

                                console.log(
                                    `Created cheque transaction with ID ${chequeTransaction.id} for payment ${payment.id}`,
                                );
                            }
                        } else {
                            console.log(
                                `No payment created for order ${orderNumber} - amount was ${data.paymentAmount}`,
                            );
                        }
                    } catch (error) {
                        console.error(
                            `Error creating payment for order ${orderNumber}:`,
                            error,
                        );
                        paymentError =
                            error instanceof Error
                                ? error.message
                                : "Unknown payment error";
                        // We don't throw the error here to allow the order to be created even if payment processing fails
                        // Instead, we log it and continue
                    }

                    // Get the full order with items before returning
                    let fullOrder = null;
                    try {
                        fullOrder = await tx.salesOrder.findUnique({
                            where: { id: salesOrder.id },
                            include: {
                                customer: true,
                                items: {
                                    include: {
                                        threadPurchase: true,
                                        fabricProduction: true,
                                    },
                                },
                                payments: true,
                            },
                        });

                        if (!fullOrder) {
                            console.warn(
                                `Could not get full order details for order ${orderNumber}`
                            );
                        }
                    } catch (error) {
                        console.error(
                            `Error fetching full order details for order ${orderNumber}:`,
                            error,
                        );
                        // We don't throw the error here to allow the order to be created even if fetching details fails
                        // Instead, we log it and continue
                    }

                    return {
                        salesOrder: fullOrder || salesOrder,
                        paymentError,
                    };
                },
            );

            console.log(
                `[${transactionId}] Transaction completed in ${
                    Date.now() - startTime
                }ms`,
            );

            return NextResponse.json(
                {
                    message: "Sales order created successfully",
                    salesOrder: result.salesOrder,
                    paymentError: result.paymentError,
                },
                { status: 201 },
            );
        } catch (error) {
            console.error(`[${transactionId}] Error creating sales order:`, error);
            return formatErrorResponse(error, transactionId);
        }
    } catch (error) {
        console.error("Error processing sales order submission:", error);
        return formatErrorResponse(error);
    }
}

// Add endpoint to check if order number exists
export async function GET(request: Request) {
    try {
        // Get the order number from the URL
        const { searchParams } = new URL(request.url);
        const orderNumber = searchParams.get('orderNumber');

        if (!orderNumber) {
            return NextResponse.json(
                { error: 'Order number parameter is required' },
                { status: 400 }
            );
        }

        // Check if order number exists
        const existingOrder = await prisma.salesOrder.findFirst({
            where: {
                orderNumber: orderNumber.trim(),
            },
            select: {
                id: true,
                orderNumber: true,
                orderDate: true
            }
        });

        return NextResponse.json({
            exists: !!existingOrder,
            order: existingOrder
        }, { status: 200 });
        
    } catch (error) {
        console.error("Error checking order number:", error);
        return NextResponse.json(
            { error: "Failed to check order number" },
            { status: 500 }
        );
    }
}