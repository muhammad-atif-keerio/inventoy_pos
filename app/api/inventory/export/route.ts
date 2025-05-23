import { NextResponse } from "next/server";

import { ProductType } from "@prisma/client";

import { db } from "@/lib/db";

export async function GET() {
    try {
        // Fetch all inventory items with their relations
        const inventoryItems = await db.inventory.findMany({
            include: {
                threadType: true,
                fabricType: true,
                transactions: {
                    take: 1,
                    orderBy: {
                        transactionDate: "desc",
                    },
                },
            },
            orderBy: {
                itemCode: "asc",
            },
        });

        if (!inventoryItems || inventoryItems.length === 0) {
            return NextResponse.json(
                { error: "No inventory data found" },
                { status: 404 },
            );
        }

        // Generate CSV header
        const headers = [
            "Item Code",
            "Description",
            "Type",
            "Current Quantity",
            "Unit",
            "Min Stock Level",
            "Location",
            "Cost Per Unit",
            "Sale Price",
            "Last Restocked",
            "Thread Type",
            "Fabric Type",
            "Notes",
            "Created At",
        ];

        // Generate CSV rows
        const rows = inventoryItems.map((item) => [
            item.itemCode,
            item.description,
            item.productType === ProductType.THREAD ? "Thread" : "Fabric",
            item.currentQuantity.toString(),
            item.unitOfMeasure,
            item.minStockLevel?.toString() || "",
            item.location || "",
            item.costPerUnit?.toString() || "",
            item.salePrice?.toString() || "",
            item.lastRestocked
                ? new Date(item.lastRestocked).toISOString()
                : "",
            item.threadType?.name || "",
            item.fabricType?.name || "",
            item.notes || "",
            new Date(item.createdAt).toISOString(),
        ]);

        // Combine header and rows
        const csvContent = [
            headers.join(","),
            ...rows.map((row) =>
                row
                    .map((cell) => `"${cell?.replace(/"/g, '""') || ""}"`)
                    .join(","),
            ),
        ].join("\n");

        // Create response with CSV content
        const response = new NextResponse(csvContent);

        // Set headers
        response.headers.set("Content-Type", "text/csv; charset=utf-8");
        response.headers.set(
            "Content-Disposition",
            `attachment; filename="inventory-export-${new Date().toISOString().split("T")[0]}.csv"`,
        );

        return response;
    } catch (error) {
        console.error("Error exporting inventory data:", error);
        return NextResponse.json(
            {
                error: "Failed to export inventory data",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
