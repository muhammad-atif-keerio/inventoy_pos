import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * GET /api/dyeing/available
 * Fetch all completed dyeing processes that haven't been added to inventory yet
 */
export async function GET() {
    try {
        // First, get all successful dyeing processes
        const successfulDyeingProcesses = await db.dyeingProcess.findMany({
            where: {
                resultStatus: "COMPLETED", // Changed from "SUCCESS" to "COMPLETED" to match form values
            },
            include: {
                threadPurchase: {
                    include: {
                        vendor: true,
                    },
                },
            },
            orderBy: {
                completionDate: "desc",
            },
        });

        // Get IDs of dyeing processes that are already in inventory
        const inventoryTransactions = await db.inventoryTransaction.findMany({
            where: {
                dyeingProcessId: {
                    not: null,
                },
            },
            select: {
                dyeingProcessId: true,
            },
        });

        // Extract the IDs into a Set for fast lookups
        const dyeingProcessIdsInInventory = new Set(
            inventoryTransactions
                .map((transaction) => transaction.dyeingProcessId)
                .filter((id) => id !== null) as number[],
        );

        // Filter out processes that already have inventory entries
        const availableProcesses = successfulDyeingProcesses.filter(
            (process) => !dyeingProcessIdsInInventory.has(process.id),
        );

        // Transform the data for the client
        const availableDyedThreads = availableProcesses.map((process) => {
            return {
                id: process.id,
                threadPurchaseId: process.threadPurchaseId,
                threadPurchase: process.threadPurchase
                    ? {
                          id: process.threadPurchase.id,
                          vendorId: process.threadPurchase.vendorId,
                          vendor: process.threadPurchase.vendor,
                          threadType: process.threadPurchase.threadType,
                          colorStatus: process.threadPurchase.colorStatus,
                          color: process.threadPurchase.color,
                          unitOfMeasure: process.threadPurchase.unitOfMeasure,
                      }
                    : null,
                dyeDate: process.dyeDate.toISOString(),
                colorName: process.colorName,
                colorCode: process.colorCode,
                outputQuantity: process.outputQuantity,
                totalCost: process.totalCost ? Number(process.totalCost) : null,
                resultStatus: process.resultStatus,
                completionDate: process.completionDate
                    ? process.completionDate.toISOString()
                    : null,
                inventoryStatus: "AVAILABLE",
            };
        });

        // Return the filtered list
        return NextResponse.json(availableDyedThreads);
    } catch (error) {
        console.error("Error fetching available dyed threads:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch available dyed threads",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
