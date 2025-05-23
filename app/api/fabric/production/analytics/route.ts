import { NextRequest, NextResponse } from "next/server";

import { ProductionStatus } from "@prisma/client";

import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    // Initialize default/fallback values
    let totalProduction = 0;
    let totalCost = 0;
    let monthlyProduction: { month: string; quantity: number }[] = [];
    let fabricTypeDistribution: { name: string; value: number }[] = [];
    let costBreakdown: { category: string; value: number }[] = [];
    let hadErrors = false;

    try {
        // Get the range from query params
        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "30days";

        // Calculate date range based on the requested range
        const startDate = new Date();
        if (range === "7days") {
            startDate.setDate(startDate.getDate() - 7);
        } else if (range === "30days") {
            startDate.setDate(startDate.getDate() - 30);
        } else if (range === "1year") {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        // Try to get total production quantity with fallback
        try {
            const totalProductionResult = await db.fabricProduction.aggregate({
                where: {
                    productionDate: {
                        gte: startDate,
                    },
                    status: ProductionStatus.COMPLETED,
                },
                _sum: {
                    quantityProduced: true,
                    totalCost: true,
                },
            });
            totalProduction = totalProductionResult._sum.quantityProduced || 0;
            totalCost = totalProductionResult._sum.totalCost?.toNumber() || 0;
        } catch (aggError) {
            console.error("Error fetching total production:", aggError);
            hadErrors = true;
            // Continue with default value for totalProduction
        }

        // Try to get monthly production with fallback
        try {
            // Try a simpler approach with groupBy if raw query fails
            const monthlyData = await db.fabricProduction.groupBy({
                by: ["productionDate"],
                where: {
                    productionDate: {
                        gte: startDate,
                    },
                    status: ProductionStatus.COMPLETED,
                },
                _sum: {
                    quantityProduced: true,
                },
            });

            // Process the grouped data by month
            const monthMap = new Map<string, number>();
            monthlyData.forEach((item) => {
                const date = new Date(item.productionDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                const currentValue = monthMap.get(monthKey) || 0;
                monthMap.set(
                    monthKey,
                    currentValue + (item._sum.quantityProduced || 0),
                );
            });

            // Convert map to array
            monthlyProduction = Array.from(monthMap)
                .map(([month, quantity]) => ({
                    month,
                    quantity,
                }))
                .sort((a, b) => a.month.localeCompare(b.month));
        } catch (monthlyError) {
            console.error("Error fetching monthly production:", monthlyError);
            hadErrors = true;
            // Continue with empty monthly production
        }

        // Try to get fabric type distribution with fallback
        try {
            const fabricTypeData = await db.fabricProduction.groupBy({
                by: ["fabricType"],
                where: {
                    productionDate: {
                        gte: startDate,
                    },
                    status: ProductionStatus.COMPLETED,
                },
                _sum: {
                    quantityProduced: true,
                },
            });

            fabricTypeDistribution = fabricTypeData.map((item) => ({
                name: item.fabricType,
                value: item._sum.quantityProduced || 0,
            }));
        } catch (distError) {
            console.error(
                "Error fetching fabric type distribution:",
                distError,
            );
            hadErrors = true;
            // Continue with empty distribution
        }

        // Get cost breakdown - production, labor, and materials
        try {
            const costData = await db.fabricProduction.aggregate({
                where: {
                    productionDate: {
                        gte: startDate,
                    },
                    status: ProductionStatus.COMPLETED,
                },
                _sum: {
                    productionCost: true,
                    laborCost: true,
                },
            });

            const productionCost =
                costData._sum.productionCost?.toNumber() || 0;
            const laborCost = costData._sum.laborCost?.toNumber() || 0;

            costBreakdown = [
                { category: "Production", value: productionCost },
                { category: "Labor", value: laborCost },
            ];
        } catch (costError) {
            console.error("Error fetching cost breakdown:", costError);
            hadErrors = true;
            // Continue with empty cost breakdown
        }

        // Get dyeing related stats
        let dyedFabricCount = 0;
        let rawThreadFabricCount = 0;
        let totalFabricCount = 0;

        try {
            // Get count of fabric productions from dyed threads
            dyedFabricCount = await db.fabricProduction.count({
                where: {
                    dyeingProcessId: { not: null },
                    status: ProductionStatus.COMPLETED,
                    productionDate: { gte: startDate },
                },
            });

            // Get total completed fabric count
            totalFabricCount = await db.fabricProduction.count({
                where: {
                    status: ProductionStatus.COMPLETED,
                    productionDate: { gte: startDate },
                },
            });

            // Calculate raw thread fabric count
            rawThreadFabricCount = totalFabricCount - dyedFabricCount;
        } catch (error) {
            console.error("Error fetching thread source stats:", error);
            hadErrors = true;
        }

        // Return data with warning flag if there were any errors
        return NextResponse.json({
            totalProduction,
            totalCost,
            monthlyProduction,
            fabricTypeDistribution,
            costBreakdown,
            threadSourceStats: {
                dyedThreadFabric: dyedFabricCount,
                rawThreadFabric: rawThreadFabricCount,
                total: totalFabricCount,
            },
            partialData: hadErrors,
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        // Return fallback data with error indication
        return NextResponse.json(
            {
                totalProduction: 0,
                totalCost: 0,
                monthlyProduction: [],
                fabricTypeDistribution: [],
                costBreakdown: [],
                threadSourceStats: {
                    dyedThreadFabric: 0,
                    rawThreadFabric: 0,
                    total: 0,
                },
                error: "Failed to fetch analytics data",
                partialData: true,
            },
            { status: 200 },
        ); // Return 200 with empty data instead of 500
    }
}
