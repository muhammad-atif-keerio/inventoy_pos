import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Get total inventory value
        const inventoryResult = await prisma.$queryRaw`
      SELECT 
        SUM("currentQuantity" * "costPerUnit") as total_value,
        COUNT(*) as item_count
      FROM "Inventory"
    `;

        const inventoryStats =
            Array.isArray(inventoryResult) && inventoryResult.length > 0
                ? inventoryResult[0]
                : { total_value: 0, item_count: 0 };

        // Get low stock items count
        const lowStockCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "Inventory" 
      WHERE "currentQuantity" <= "minStockLevel"
    `;

        const lowStockValue =
            Array.isArray(lowStockCount) && lowStockCount.length > 0
                ? Number(lowStockCount[0].count) || 0
                : 0;

        // Get recent sales
        const salesResult = await prisma.$queryRaw`
      SELECT 
        SUM("totalSale") as total_sales,
        COUNT(*) as order_count
      FROM "SalesOrder"
      WHERE "orderDate" >= NOW() - INTERVAL '30 days'
    `;

        const salesStats =
            Array.isArray(salesResult) && salesResult.length > 0
                ? salesResult[0]
                : { total_sales: 0, order_count: 0 };

        // Get pending payments
        const pendingPayments = await prisma.salesOrder.count({
            where: {
                paymentStatus: "PENDING",
            },
        });

        // Get top selling products
        const topSellingProductsResult = await prisma.$queryRaw`
      SELECT 
        "productType", 
        SUM("quantitySold") as total_quantity,
        SUM("subtotal") as total_value
      FROM "SalesOrderItem"
      GROUP BY "productType"
      ORDER BY total_quantity DESC
      LIMIT 5
    `;

        // Get production status
        const productionStats = await prisma.fabricProduction.groupBy({
            by: ["status"],
            _count: {
                id: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                inventory: {
                    totalValue: inventoryStats.total_value || 0,
                    itemCount: inventoryStats.item_count || 0,
                    lowStockCount: lowStockValue,
                },
                sales: {
                    last30Days: {
                        totalSales: salesStats.total_sales || 0,
                        orderCount: salesStats.order_count || 0,
                    },
                    pendingPayments,
                },
                topSellingProducts: topSellingProductsResult,
                productionStats: productionStats.reduce(
                    (acc, curr) => {
                        acc[curr.status] = curr._count.id;
                        return acc;
                    },
                    {} as Record<string, number>,
                ),
            },
        });
    } catch (error) {
        console.error("Error generating dashboard summary:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to generate dashboard summary",
            },
            { status: 500 },
        );
    }
}
