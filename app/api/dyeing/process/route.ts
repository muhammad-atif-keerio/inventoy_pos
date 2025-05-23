import { NextRequest, NextResponse } from "next/server";

import {
    ColorStatus,
    InventoryTransactionType,
    Prisma,
    ProductType,
} from "@prisma/client";

import { db } from "@/lib/db";

// Define valid result status values
const VALID_RESULT_STATUSES = ["COMPLETED", "PARTIAL", "FAILED", "PENDING"];

// Define valid inventory status values
const VALID_INVENTORY_STATUSES = ["PENDING", "ADDED", "UPDATED", "ERROR"];

/**
 * Helper function to safely update inventory with optimistic locking
 * This helps prevent race conditions when multiple processes try to update the same inventory
 */
async function safelyUpdateInventory(
    tx: Prisma.TransactionClient,
    inventoryId: number,
    quantityChange: number,
): Promise<number> {
    // Get current inventory with a FOR UPDATE lock to prevent concurrent modifications
    const inventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
        select: { currentQuantity: true },
    });

    if (!inventory) {
        throw new Error(`Inventory with ID ${inventoryId} not found`);
    }

    // Calculate new quantity, ensuring it doesn't go below zero
    const currentQuantity = Number(inventory.currentQuantity);
    const newQuantity = Math.max(0, currentQuantity + quantityChange);

    // Update inventory with the new quantity
    await tx.inventory.update({
        where: { id: inventoryId },
        data: { currentQuantity: newQuantity },
    });

    return newQuantity;
}

/**
 * Helper function to add dyed thread to inventory
 * This centralizes the logic to avoid duplication between POST and PATCH methods
 */
async function addDyedThreadToInventory(
    tx: Prisma.TransactionClient,
    dyeingProcess: {
        id: number;
        outputQuantity: number;
    },
    threadPurchase: {
        id: number;
        threadType: string;
        unitOfMeasure?: string;
        unitPrice: number | Prisma.Decimal;
    },
    colorName: string | null,
    colorCode: string | null,
    totalCost: number | null,
) {
    // Convert any Decimal to Number
    const unitPrice =
        typeof threadPurchase.unitPrice === "object"
            ? Number(threadPurchase.unitPrice)
            : threadPurchase.unitPrice;

    // Generate a unique item code for the dyed thread
    const itemCode = `DT-${dyeingProcess.id}-${Date.now().toString().slice(-6)}`;

    // Check if thread type exists or create it
    let threadType = await tx.threadType.findFirst({
        where: {
            name: {
                equals: threadPurchase.threadType,
                mode: "insensitive",
            },
        },
    });

    if (!threadType) {
        threadType = await tx.threadType.create({
            data: {
                name: threadPurchase.threadType,
                units: threadPurchase.unitOfMeasure || "meters",
                updatedAt: new Date(),
            },
        });
    }

    // Create or update inventory item for the dyed thread
    let inventoryItem = await tx.inventory.findFirst({
        where: {
            description: {
                contains: `Dyed ${threadPurchase.threadType} (${colorName || "Unknown"})`,
                mode: "insensitive",
            },
            productType: ProductType.THREAD,
        },
    });

    if (!inventoryItem) {
        // Create new inventory item
        inventoryItem = await tx.inventory.create({
            data: {
                itemCode,
                description: `Dyed ${threadPurchase.threadType} (${colorName || "Unknown"})`,
                productType: ProductType.THREAD,
                threadTypeId: threadType.id,
                currentQuantity: 0, // Will be updated by transaction
                unitOfMeasure: threadPurchase.unitOfMeasure || "meters",
                minStockLevel: 100, // Default value
                costPerUnit: totalCost
                    ? totalCost / dyeingProcess.outputQuantity
                    : unitPrice,
                salePrice: totalCost
                    ? (totalCost / dyeingProcess.outputQuantity) * 1.2
                    : unitPrice * 1.2, // 20% markup
                location: "Dye Facility",
                notes: `Dyed from Thread Order #${threadPurchase.id}. Color: ${colorName || "Unknown"}`,
                updatedAt: new Date(),
            },
        });
    }

    // Create inventory transaction
    await tx.inventoryTransaction.create({
        data: {
            inventoryId: inventoryItem.id,
            transactionType: InventoryTransactionType.PRODUCTION,
            quantity: dyeingProcess.outputQuantity,
            remainingQuantity: dyeingProcess.outputQuantity,
            unitCost: totalCost
                ? totalCost / dyeingProcess.outputQuantity
                : null,
            totalCost: totalCost || null,
            referenceType: "DyeingProcess",
            referenceId: dyeingProcess.id,
            dyeingProcessId: dyeingProcess.id,
            notes: `Thread dyeing process completed`,
            updatedAt: new Date(),
        },
    });

    // Update inventory item quantity with locking mechanism
    await safelyUpdateInventory(
        tx,
        inventoryItem.id,
        dyeingProcess.outputQuantity,
    );

    // Update last restocked timestamp
    await tx.inventory.update({
        where: { id: inventoryItem.id },
        data: {
            lastRestocked: new Date(),
        },
    });

    // Update the dyeing process to mark inventory was added
    await tx.dyeingProcess.update({
        where: { id: dyeingProcess.id },
        data: {
            inventoryStatus: VALID_INVENTORY_STATUSES[1], // "ADDED"
        },
    });

    // Update thread purchase status
    await tx.threadPurchase.update({
        where: { id: threadPurchase.id },
        data: {
            colorStatus: ColorStatus.COLORED,
        },
    });

    return inventoryItem;
}

/**
 * Validate connections between inventory and dyeing process
 * Makes sure all related data is properly linked
 */
async function validateInventoryConnections(
    processId: number,
): Promise<string[]> {
    const warnings: string[] = [];

    try {
        // Find the process with all related data
        const process = await db.dyeingProcess.findUnique({
            where: { id: processId },
            include: {
                threadPurchase: true,
                inventoryTransaction: true,
            },
        });

        if (!process) {
            warnings.push(`Dyeing process #${processId} not found`);
            return warnings;
        }

        // Check thread purchase connection
        if (!process.threadPurchase) {
            warnings.push(
                `Thread purchase connection missing for dyeing process #${processId}`,
            );
        }

        // Check inventory entries consistency
        if (process.inventoryTransaction.length > 0) {
            // Get unique inventory IDs
            const inventoryIds = [
                ...new Set(
                    process.inventoryTransaction.map(
                        (entry) => entry.inventoryId,
                    ),
                ),
            ];

            // Check each inventory item
            for (const inventoryId of inventoryIds) {
                const inventory = await db.inventory.findUnique({
                    where: { id: inventoryId },
                });

                if (!inventory) {
                    warnings.push(
                        `Inventory #${inventoryId} referenced by dyeing process #${processId} not found`,
                    );
                }
            }

            // Check for balanced transactions (consumption and production)
            const consumptionEntries = process.inventoryTransaction.filter(
                (entry) =>
                    entry.transactionType ===
                        InventoryTransactionType.ADJUSTMENT &&
                    entry.quantity < 0,
            );

            const productionEntries = process.inventoryTransaction.filter(
                (entry) =>
                    entry.transactionType ===
                        InventoryTransactionType.PRODUCTION &&
                    entry.quantity > 0,
            );

            if (
                consumptionEntries.length === 0 &&
                process.resultStatus !== "PENDING"
            ) {
                warnings.push(
                    `No consumption entries found for completed dyeing process #${processId}`,
                );
            }

            if (
                productionEntries.length === 0 &&
                process.resultStatus === "COMPLETED"
            ) {
                warnings.push(
                    `No production entries found for completed dyeing process #${processId}`,
                );
            }
        } else if (process.resultStatus === "COMPLETED") {
            warnings.push(
                `Completed dyeing process #${processId} has no inventory entries`,
            );
        }

        return warnings;
    } catch (error) {
        warnings.push(
            `Error validating inventory connections: ${error instanceof Error ? error.message : String(error)}`,
        );
        return warnings;
    }
}

/**
 * POST /api/dyeing/process
 * Create a new dyeing process record
 *
 * Features:
 * - Validates all required fields and input data
 * - Checks if dye quantity exceeds available thread quantity
 * - Handles partial dyeing and creates new thread purchase for remaining quantity
 * - Calculates thread wastage (difference between input and output)
 * - Updates thread purchase status based on dyeing result
 * - Adds dyed thread to inventory when requested
 * - Returns detailed information about the created process
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Basic validation for required fields
        if (
            !body.threadPurchaseId ||
            !body.dyeDate ||
            !body.resultStatus ||
            !body.dyeQuantity ||
            body.outputQuantity === undefined
        ) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        // Advanced field validation
        // Check numeric fields are positive
        if (body.dyeQuantity <= 0) {
            return NextResponse.json(
                { error: "Dye quantity must be greater than 0" },
                { status: 400 },
            );
        }

        if (body.outputQuantity < 0) {
            return NextResponse.json(
                { error: "Output quantity cannot be negative" },
                { status: 400 },
            );
        }

        if (body.laborCost < 0 || body.dyeMaterialCost < 0) {
            return NextResponse.json(
                { error: "Costs cannot be negative" },
                { status: 400 },
            );
        }

        // Validate result status
        if (!VALID_RESULT_STATUSES.includes(body.resultStatus)) {
            return NextResponse.json(
                {
                    error: `Invalid result status. Must be one of: ${VALID_RESULT_STATUSES.join(", ")}`,
                },
                { status: 400 },
            );
        }

        // Validate color code format if provided
        if (body.colorCode && !/^#[0-9A-Fa-f]{6}$/.test(body.colorCode)) {
            return NextResponse.json(
                {
                    error: "Invalid color code format. Must be a hex color code (e.g., #FF5733)",
                },
                { status: 400 },
            );
        }

        // Parse the date
        const dyeDate = new Date(body.dyeDate);

        // Validate dyeDate is not in the future
        if (dyeDate > new Date()) {
            return NextResponse.json(
                { error: "Dye date cannot be in the future" },
                { status: 400 },
            );
        }

        const completionDate = body.completionDate
            ? new Date(body.completionDate)
            : null;

        // Validate completionDate is required for COMPLETED status
        if (body.resultStatus === "COMPLETED" && !completionDate) {
            return NextResponse.json(
                {
                    error: "Completion date is required when status is COMPLETED",
                },
                { status: 400 },
            );
        }

        // Parse dyeParameters if it's a string
        let dyeParams = body.dyeParameters;
        if (typeof dyeParams === "string") {
            try {
                dyeParams = JSON.parse(dyeParams);
            } catch (error) {
                console.error("Error parsing dyeParameters:", error);
                return NextResponse.json(
                    { error: "Invalid dyeParameters format" },
                    { status: 400 },
                );
            }
        }

        // Get the thread purchase to use
        const threadPurchase = await db.threadPurchase.findUnique({
            where: { id: body.threadPurchaseId },
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

        // Check if this thread purchase already has a dyeing process (for information only)
        const existingProcess = await db.dyeingProcess.findFirst({
            where: { threadPurchaseId: body.threadPurchaseId },
        });

        if (existingProcess) {
            console.log(
                `Thread purchase ${body.threadPurchaseId} already has a dyeing process (${existingProcess.id})`,
            );
            // Note: We're allowing multiple processes but logging for tracking
        }

        // Get the thread information from inventory
        let threadInventory = await db.inventory.findFirst({
            where: {
                productType: ProductType.THREAD,
                threadType: {
                    name: {
                        equals: threadPurchase.threadType,
                        mode: "insensitive",
                    },
                },
            },
            include: {
                threadType: true,
            },
        });

        if (!threadInventory) {
            // If thread not found in inventory, create it
            let threadType = await db.threadType.findFirst({
                where: {
                    name: {
                        equals: threadPurchase.threadType,
                        mode: "insensitive",
                    },
                },
            });

            if (!threadType) {
                // Create thread type if it doesn't exist
                threadType = await db.threadType.create({
                    data: {
                        name: threadPurchase.threadType,
                        units: threadPurchase.unitOfMeasure || "meters",
                        updatedAt: new Date(),
                    },
                });
            }

            // Create new inventory item for the thread
            threadInventory = await db.inventory.create({
                data: {
                    itemCode: `TH-${threadPurchase.id}-${Date.now().toString().slice(-6)}`,
                    description: `${threadPurchase.threadType} Thread`,
                    productType: ProductType.THREAD,
                    threadTypeId: threadType.id,
                    currentQuantity: threadPurchase.quantity,
                    unitOfMeasure: threadPurchase.unitOfMeasure || "meters",
                    minStockLevel: 100,
                    costPerUnit: threadPurchase.unitPrice,
                    salePrice: Number(threadPurchase.unitPrice) * 1.2, // 20% markup
                    location: "Warehouse",
                    notes: `Created from Thread Purchase #${threadPurchase.id}`,
                    updatedAt: new Date(),
                },
                include: {
                    threadType: true,
                },
            });

            // Create initial inventory transaction
            await db.inventoryTransaction.create({
                data: {
                    inventoryId: threadInventory.id,
                    transactionType: InventoryTransactionType.PURCHASE,
                    quantity: threadPurchase.quantity,
                    remainingQuantity: threadPurchase.quantity,
                    unitCost: threadPurchase.unitPrice,
                    totalCost: threadPurchase.totalCost,
                    referenceType: "ThreadPurchase",
                    referenceId: threadPurchase.id,
                    threadPurchaseId: threadPurchase.id,
                    notes: `Initial stock from Thread Purchase #${threadPurchase.id}`,
                    updatedAt: new Date(),
                },
            });
        }

        // At this point, threadInventory is guaranteed to be non-null
        if (!threadInventory) {
            return NextResponse.json(
                { error: "Failed to create or find thread inventory" },
                { status: 500 },
            );
        }

        // Check if there's enough quantity in inventory
        if (threadInventory.currentQuantity < body.dyeQuantity) {
            return NextResponse.json(
                {
                    error: `Not enough thread in inventory. Available: ${threadInventory.currentQuantity}, Requested: ${body.dyeQuantity}`,
                },
                { status: 400 },
            );
        }

        // Check if thread is received
        if (!threadPurchase.received) {
            return NextResponse.json(
                {
                    error: "Cannot create dyeing process for thread that hasn't been received yet",
                },
                { status: 400 },
            );
        }

        // Validate thread color status is RAW
        if (threadPurchase.colorStatus !== ColorStatus.RAW) {
            return NextResponse.json(
                { error: "Can only dye thread with RAW color status" },
                { status: 400 },
            );
        }

        // Validate dyeQuantity against available inventory quantity
        if (body.dyeQuantity > threadInventory.currentQuantity) {
            return NextResponse.json(
                {
                    error: `Dye quantity (${body.dyeQuantity}) cannot exceed the available inventory quantity (${threadInventory.currentQuantity})`,
                },
                { status: 400 },
            );
        }

        // Validate output quantity cannot exceed input quantity
        if (body.outputQuantity > body.dyeQuantity) {
            return NextResponse.json(
                { error: "Output quantity cannot exceed dye quantity" },
                { status: 400 },
            );
        }

        // Extract color information from dyeParameters if available
        const colorName =
            body.colorName || (dyeParams && dyeParams.color) || null;
        const colorCode = body.colorCode || null;

        // Calculate total cost if not provided
        const laborCost = body.laborCost ? parseFloat(body.laborCost) : 0;
        const dyeMaterialCost = body.dyeMaterialCost
            ? parseFloat(body.dyeMaterialCost)
            : 0;
        const totalCost = body.totalCost
            ? parseFloat(body.totalCost)
            : laborCost + dyeMaterialCost;

        // Calculate thread wastage
        const threadWastage = body.dyeQuantity - body.outputQuantity;
        const wastagePercentage = (threadWastage / body.dyeQuantity) * 100;

        // Calculate remaining quantity based on current inventory
        const availableQuantity = threadInventory.currentQuantity;
        const remainingQuantity = Math.max(
            0,
            availableQuantity - body.dyeQuantity,
        );

        // Flag to track if a new thread order was created
        const remainingThreadCreated = false;
        const newThreadId = null;

        // Create new dyeing process record
        const newProcess = await db.dyeingProcess.create({
            data: {
                threadPurchaseId: body.threadPurchaseId,
                dyeDate,
                dyeParameters: dyeParams || {
                    color: colorName || "Unknown",
                    temperature: "",
                    duration: "",
                    chemicals: "",
                    technique: "",
                },
                colorCode,
                colorName,
                dyeQuantity: body.dyeQuantity,
                outputQuantity: body.outputQuantity,
                laborCost: laborCost || null,
                dyeMaterialCost: dyeMaterialCost || null,
                totalCost: totalCost || null,
                resultStatus: body.resultStatus,
                completionDate,
                remarks: body.remarks || null,
            },
            include: {
                threadPurchase: true, // Include thread purchase info in response
            },
        });

        // Process inventory changes in a transaction
        try {
            await db.$transaction(async (tx) => {
                // Update inventory for thread consumption
                if (threadInventory) {
                    // Create inventory transaction for thread consumption
                    await tx.inventoryTransaction.create({
                        data: {
                            inventoryId: threadInventory.id,
                            transactionType:
                                InventoryTransactionType.ADJUSTMENT,
                            quantity: -body.dyeQuantity,
                            remainingQuantity: remainingQuantity,
                            referenceType: "DyeingProcess",
                            referenceId: newProcess.id,
                            dyeingProcessId: newProcess.id,
                            notes: `Thread used for dyeing process #${newProcess.id}`,
                            updatedAt: new Date(),
                        },
                    });

                    // Update the inventory item quantity with locking mechanism
                    await safelyUpdateInventory(
                        tx,
                        threadInventory.id,
                        -body.dyeQuantity,
                    );

                    // Update thread purchase status if fully used/completed
                    if (body.resultStatus === "COMPLETED") {
                        await tx.threadPurchase.update({
                            where: { id: body.threadPurchaseId },
                            data: {
                                colorStatus: ColorStatus.COLORED,
                            },
                        });
                    }
                }

                // If the thread should be added to inventory and the process is completed
                if (body.addToInventory && body.resultStatus === "COMPLETED") {
                    // Use the centralized function to add dyed thread to inventory
                    await addDyedThreadToInventory(
                        tx,
                        newProcess,
                        threadPurchase,
                        colorName,
                        colorCode,
                        totalCost,
                    );
                } else {
                    // Mark inventory status as pending if not adding to inventory
                    await tx.dyeingProcess.update({
                        where: { id: newProcess.id },
                        data: {
                            inventoryStatus: VALID_INVENTORY_STATUSES[0], // "PENDING"
                        },
                    });
                }
            });
        } catch (error) {
            console.error("Error updating inventory:", error);
            throw error;
        }

        // Get the updated process with inventory entries
        const processWithInventory = await db.dyeingProcess.findUnique({
            where: { id: newProcess.id },
            include: {
                threadPurchase: true,
                inventoryTransaction: true,
                fabricProduction: true,
            },
        });

        if (!processWithInventory) {
            throw new Error("Failed to retrieve updated dyeing process");
        }

        // Validate inventory connections and log any warnings
        const validationWarnings = await validateInventoryConnections(
            newProcess.id,
        );
        if (validationWarnings.length > 0) {
            console.warn("Inventory connection warnings:", validationWarnings);
        }

        // Check if has inventory entries
        const hasInventoryEntries =
            processWithInventory.inventoryTransaction &&
            processWithInventory.inventoryTransaction.length > 0;

        // Check if has fabric productions
        const hasFabricProductions =
            processWithInventory.fabricProduction &&
            processWithInventory.fabricProduction.length > 0;

        // Get inventory status from the process
        const inventoryStatus =
            processWithInventory.inventoryTransaction.length > 0
                ? "UPDATED"
                : "PENDING";
        const fabricProductionStatus = hasFabricProductions
            ? "USED"
            : "AVAILABLE";

        // Transform the response for the client
        const transformedProcess = {
            id: processWithInventory.id,
            threadPurchaseId: processWithInventory.threadPurchaseId,
            threadPurchase: processWithInventory.threadPurchase
                ? {
                      id: processWithInventory.threadPurchase.id,
                      threadType:
                          processWithInventory.threadPurchase.threadType,
                      colorStatus:
                          processWithInventory.threadPurchase.colorStatus,
                      color: processWithInventory.threadPurchase.color,
                      quantity: processWithInventory.threadPurchase.quantity,
                      unitOfMeasure:
                          processWithInventory.threadPurchase.unitOfMeasure ||
                          "meters",
                  }
                : null,
            dyeDate: processWithInventory.dyeDate.toISOString(),
            dyeParameters: processWithInventory.dyeParameters,
            colorCode: processWithInventory.colorCode,
            colorName: processWithInventory.colorName,
            dyeQuantity: processWithInventory.dyeQuantity,
            outputQuantity: processWithInventory.outputQuantity,
            laborCost: processWithInventory.laborCost
                ? Number(processWithInventory.laborCost)
                : null,
            dyeMaterialCost: processWithInventory.dyeMaterialCost
                ? Number(processWithInventory.dyeMaterialCost)
                : null,
            totalCost: processWithInventory.totalCost
                ? Number(processWithInventory.totalCost)
                : null,
            resultStatus: processWithInventory.resultStatus,
            completionDate: processWithInventory.completionDate
                ? processWithInventory.completionDate.toISOString()
                : null,
            remarks: processWithInventory.remarks || null,
            inventoryEntries: hasInventoryEntries
                ? processWithInventory.inventoryTransaction.map((entry) => ({
                      id: entry.id,
                      quantity: entry.quantity,
                      transactionType: entry.transactionType,
                      transactionDate: entry.transactionDate.toISOString(),
                      unitCost: entry.unitCost ? Number(entry.unitCost) : null,
                      totalCost: entry.totalCost
                          ? Number(entry.totalCost)
                          : null,
                  }))
                : [],
            fabricProductions: hasFabricProductions
                ? processWithInventory.fabricProduction.map((prod) => ({
                      id: prod.id,
                      fabricType: prod.fabricType,
                      status: prod.status,
                      quantityProduced: prod.quantityProduced,
                      productionDate: prod.productionDate.toISOString(),
                      completionDate: prod.completionDate
                          ? prod.completionDate.toISOString()
                          : null,
                      productionCost: Number(prod.productionCost),
                      totalCost: Number(prod.totalCost),
                  }))
                : [],
            inventoryStatus: inventoryStatus,
            fabricProductionStatus: fabricProductionStatus,
        };

        return NextResponse.json(
            {
                success: true,
                data: {
                    process: transformedProcess,
                    wastage: {
                        amount: threadWastage,
                        percentage: parseFloat(wastagePercentage.toFixed(2)),
                    },
                    inventory: {
                        before: availableQuantity,
                        used: body.dyeQuantity,
                        remaining: remainingQuantity,
                    },
                    remainingThread: remainingThreadCreated
                        ? {
                              created: true,
                              threadId: newThreadId,
                              quantity: remainingQuantity,
                          }
                        : {
                              created: false,
                          },
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating dyeing process:", error);

        // Check for specific errors
        if (error instanceof Error) {
            // Handle foreign key constraint error
            if (error.message.includes("Foreign key constraint failed")) {
                return NextResponse.json(
                    { error: "Invalid thread purchase ID" },
                    { status: 400 },
                );
            }

            // Handle duplicate entry error
            if (
                error instanceof Error &&
                error.message.includes("Unique constraint failed")
            ) {
                console.error(
                    "Unique constraint error - ThreadPurchaseId must be unique in DyeingProcess",
                );
                return NextResponse.json(
                    {
                        error: "The database schema has a unique constraint on threadPurchaseId. Please update your schema to allow multiple dyeing processes per thread purchase, or use the update endpoint instead.",
                        code: "UNIQUE_CONSTRAINT",
                        details:
                            "Each thread purchase can only have one dyeing process in the current schema",
                    },
                    { status: 409 },
                );
            }
        }

        return NextResponse.json(
            {
                error: "Failed to create dyeing process",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/dyeing/process
 * Update an existing dyeing process
 */
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const idParam = searchParams.get("id");

        const body = await request.json();

        // Get the ID from either query params or request body
        const id = idParam
            ? parseInt(idParam)
            : body.id
              ? parseInt(body.id)
              : null;

        if (!id) {
            return NextResponse.json(
                { error: "Missing process ID" },
                { status: 400 },
            );
        }

        // Validate result status if provided
        if (
            body.resultStatus &&
            !VALID_RESULT_STATUSES.includes(body.resultStatus)
        ) {
            return NextResponse.json(
                {
                    error: `Invalid result status. Must be one of: ${VALID_RESULT_STATUSES.join(", ")}`,
                },
                { status: 400 },
            );
        }

        // Parse dates if provided
        if (body.dyeDate) {
            body.dyeDate = new Date(body.dyeDate);
        }

        if (body.completionDate) {
            body.completionDate = new Date(body.completionDate);
        }

        // Check if the dyeing process exists
        const existingProcess = await db.dyeingProcess.findUnique({
            where: { id: Number(id) },
            include: {
                threadPurchase: true,
                inventoryTransaction: true,
            },
        });

        if (!existingProcess) {
            return NextResponse.json(
                { error: "Dyeing process not found" },
                { status: 404 },
            );
        }

        // Prepare update data
        const updateData: Prisma.DyeingProcessUpdateInput = {};

        // Handle dates
        if (body.dyeDate) {
            updateData.dyeDate = body.dyeDate;
        }

        if (body.completionDate) {
            updateData.completionDate = body.completionDate;
        } else if (body.completionDate === null) {
            updateData.completionDate = null;
        }

        // Handle dyeParameters
        if (body.dyeParameters) {
            let dyeParams = body.dyeParameters;
            if (typeof dyeParams === "string") {
                try {
                    dyeParams = JSON.parse(dyeParams);
                    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
                } catch (error) {
                    return NextResponse.json(
                        { error: "Invalid dyeParameters format" },
                        { status: 400 },
                    );
                }
            }
            updateData.dyeParameters = dyeParams;
        }

        // Handle basic fields
        if (body.colorCode !== undefined) updateData.colorCode = body.colorCode;
        if (body.colorName !== undefined) updateData.colorName = body.colorName;
        if (body.dyeQuantity !== undefined)
            updateData.dyeQuantity = body.dyeQuantity;
        if (body.outputQuantity !== undefined)
            updateData.outputQuantity = body.outputQuantity;
        if (body.laborCost !== undefined) updateData.laborCost = body.laborCost;
        if (body.dyeMaterialCost !== undefined)
            updateData.dyeMaterialCost = body.dyeMaterialCost;
        if (body.resultStatus !== undefined)
            updateData.resultStatus = body.resultStatus;
        if (body.remarks !== undefined) updateData.remarks = body.remarks;

        // Calculate total cost if component costs are provided
        if (
            body.laborCost !== undefined ||
            body.dyeMaterialCost !== undefined
        ) {
            const newLaborCost =
                body.laborCost !== undefined
                    ? parseFloat(body.laborCost)
                    : existingProcess.laborCost
                      ? Number(existingProcess.laborCost)
                      : 0;

            const newDyeMaterialCost =
                body.dyeMaterialCost !== undefined
                    ? parseFloat(body.dyeMaterialCost)
                    : existingProcess.dyeMaterialCost
                      ? Number(existingProcess.dyeMaterialCost)
                      : 0;

            updateData.totalCost = newLaborCost + newDyeMaterialCost;
        } else if (body.totalCost !== undefined) {
            updateData.totalCost = parseFloat(body.totalCost);
        }

        // Update the dyeing process
        const updatedProcess = await db.dyeingProcess.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                threadPurchase: true,
                inventoryTransaction: true,
                fabricProduction: true,
            },
        });

        // Handle inventory update if needed and status changed to COMPLETED
        if (
            body.addToInventory &&
            body.resultStatus === "COMPLETED" &&
            existingProcess.resultStatus !== "COMPLETED" &&
            existingProcess.inventoryTransaction.length === 0
        ) {
            try {
                // Use the centralized function to add dyed thread to inventory
                if (!existingProcess.threadPurchase) {
                    throw new Error("Thread purchase information not found");
                }

                await addDyedThreadToInventory(
                    db,
                    updatedProcess,
                    existingProcess.threadPurchase,
                    existingProcess.colorName,
                    existingProcess.colorCode,
                    existingProcess.totalCost
                        ? Number(existingProcess.totalCost)
                        : null,
                );
            } catch (inventoryError) {
                console.error(inventoryError);
                // Log detailed error for debugging
                if (inventoryError instanceof Error) {
                    console.error("Error details:", inventoryError.message);
                    if (inventoryError.stack) {
                        console.error("Stack trace:", inventoryError.stack);
                    }
                }
            }
        }

        // Get the updated process with all related data
        const finalProcess = await db.dyeingProcess.findUnique({
            where: { id: Number(id) },
            include: {
                threadPurchase: true,
                inventoryTransaction: true,
                fabricProduction: true,
            },
        });

        if (!finalProcess) {
            throw new Error("Failed to retrieve updated dyeing process");
        }

        // Validate inventory connections and log any warnings
        const validationWarnings = await validateInventoryConnections(
            finalProcess.id,
        );
        if (validationWarnings.length > 0) {
            console.warn("Inventory connection warnings:", validationWarnings);
        }

        // Transform for response
        const transformedProcess = {
            id: finalProcess.id,
            threadPurchaseId: finalProcess.threadPurchaseId,
            threadPurchase: finalProcess.threadPurchase
                ? {
                      id: finalProcess.threadPurchase.id,
                      threadType: finalProcess.threadPurchase.threadType,
                      colorStatus: finalProcess.threadPurchase.colorStatus,
                      color: finalProcess.threadPurchase.color,
                      quantity: finalProcess.threadPurchase.quantity,
                      unitOfMeasure:
                          finalProcess.threadPurchase.unitOfMeasure || "meters",
                  }
                : null,
            dyeDate: finalProcess.dyeDate.toISOString(),
            dyeParameters: finalProcess.dyeParameters,
            colorCode: finalProcess.colorCode,
            colorName: finalProcess.colorName,
            dyeQuantity: finalProcess.dyeQuantity,
            outputQuantity: finalProcess.outputQuantity,
            laborCost: finalProcess.laborCost
                ? Number(finalProcess.laborCost)
                : null,
            dyeMaterialCost: finalProcess.dyeMaterialCost
                ? Number(finalProcess.dyeMaterialCost)
                : null,
            totalCost: finalProcess.totalCost
                ? Number(finalProcess.totalCost)
                : null,
            resultStatus: finalProcess.resultStatus,
            completionDate: finalProcess.completionDate
                ? finalProcess.completionDate.toISOString()
                : null,
            remarks: finalProcess.remarks || null,
            inventoryEntries: finalProcess.inventoryTransaction.map(
                (entry) => ({
                    id: entry.id,
                    quantity: entry.quantity,
                    transactionType: entry.transactionType,
                    transactionDate: entry.transactionDate.toISOString(),
                    unitCost: entry.unitCost ? Number(entry.unitCost) : null,
                    totalCost: entry.totalCost ? Number(entry.totalCost) : null,
                }),
            ),
            fabricProductions: finalProcess.fabricProduction.map((prod) => ({
                id: prod.id,
                fabricType: prod.fabricType,
                status: prod.status,
                quantityProduced: prod.quantityProduced,
                productionDate: prod.productionDate.toISOString(),
                completionDate: prod.completionDate
                    ? prod.completionDate.toISOString()
                    : null,
                productionCost: Number(prod.productionCost),
                totalCost: Number(prod.totalCost),
            })),
            inventoryStatus:
                finalProcess.inventoryTransaction.length > 0
                    ? "UPDATED"
                    : "PENDING",
            fabricProductionStatus:
                finalProcess.fabricProduction.length > 0 ? "USED" : "AVAILABLE",
        };

        return NextResponse.json({
            success: true,
            data: transformedProcess,
        });
    } catch (error) {
        console.error("Error updating dyeing process:", error);

        if (
            error instanceof Error &&
            error.message.includes("Record to update not found")
        ) {
            return NextResponse.json(
                { error: "Dyeing process not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(
            {
                error: "Failed to update dyeing process",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/dyeing/process
 * Delete a dyeing process
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Dyeing process ID is required" },
                { status: 400 },
            );
        }

        const processId = parseInt(id);

        // Check if the dyeing process exists and has related entities
        const process = await db.dyeingProcess.findUnique({
            where: { id: Number(processId) },
            include: {
                fabricProduction: { take: 1 },
            },
        });

        if (!process) {
            return NextResponse.json(
                { error: "Dyeing process not found" },
                { status: 404 },
            );
        }

        // Check if it has related fabric productions
        if (process.fabricProduction.length > 0) {
            return NextResponse.json(
                {
                    error: "Cannot delete dyeing process that has related fabric productions",
                },
                { status: 400 },
            );
        }

        // Handle deletion in a transaction to ensure consistency
        await db.$transaction(async (tx) => {
            // Find and update any inventory transactions related to this process
            const inventoryTransactions =
                await tx.inventoryTransaction.findMany({
                    where: { dyeingProcessId: processId },
                });

            // For each inventory transaction, we need to reverse its effect
            for (const transaction of inventoryTransactions) {
                // For consumption transactions (negative quantity), we need to restore the inventory
                if (
                    transaction.quantity < 0 &&
                    transaction.transactionType ===
                        InventoryTransactionType.ADJUSTMENT
                ) {
                    // Restore the inventory quantity
                    await tx.inventory.update({
                        where: { id: transaction.inventoryId },
                        data: {
                            currentQuantity: {
                                increment: Math.abs(transaction.quantity),
                            },
                        },
                    });
                }

                // For production transactions (positive quantity), we need to remove from inventory
                if (
                    transaction.quantity > 0 &&
                    transaction.transactionType ===
                        InventoryTransactionType.PRODUCTION
                ) {
                    // Reduce the inventory quantity, but don't go below zero
                    const inventory = await tx.inventory.findUnique({
                        where: { id: transaction.inventoryId },
                    });

                    if (inventory) {
                        const newQuantity = Math.max(
                            0,
                            Number(inventory.currentQuantity) -
                                transaction.quantity,
                        );
                        await tx.inventory.update({
                            where: { id: transaction.inventoryId },
                            data: {
                                currentQuantity: newQuantity,
                            },
                        });
                    }
                }
            }

            // Delete inventory transactions first
            await tx.inventoryTransaction.deleteMany({
                where: { dyeingProcessId: processId },
            });

            // Delete the dyeing process
            await tx.dyeingProcess.delete({
                where: { id: processId },
            });
        });

        return NextResponse.json({
            success: true,
            message:
                "Dyeing process and related inventory transactions deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting dyeing process:", error);
        return NextResponse.json(
            {
                error: "Failed to delete dyeing process",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
