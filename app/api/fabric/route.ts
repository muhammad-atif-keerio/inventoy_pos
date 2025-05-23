import { NextResponse } from "next/server";

import { Prisma, ProductType } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/fabric
 * Fetch fabric inventory and types
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        // Filtering params
        const fabricType = searchParams.get("fabricType");
        const searchQuery = searchParams.get("query") || "";

        // Build where clause for inventory
        const where: Prisma.InventoryWhereInput = {
            productType: ProductType.FABRIC,
        };

        if (fabricType) {
            where.fabricType = {
                name: {
                    equals: fabricType,
                    mode: "insensitive",
                },
            };
        }

        if (searchQuery) {
            where.OR = [
                { description: { contains: searchQuery, mode: "insensitive" } },
                { itemCode: { contains: searchQuery, mode: "insensitive" } },
                {
                    fabricType: {
                        name: { contains: searchQuery, mode: "insensitive" },
                    },
                },
            ];
        }

        // Fetch fabric inventory with fabric type info
        const [fabricInventory, totalCount] = await Promise.all([
            db.inventory.findMany({
                where,
                skip,
                take: limit,
                include: {
                    fabricType: true,
                    transactions: {
                        orderBy: {
                            transactionDate: "desc",
                        },
                        take: 5,
                    },
                },
                orderBy: {
                    updatedAt: "desc",
                },
            }),
            db.inventory.count({ where }),
        ]);

        // Get all fabric types
        const fabricTypes = await db.fabricType.findMany({
            orderBy: {
                name: "asc",
            },
        });

        // Transform the response for the client
        const transformedInventory = fabricInventory.map((item) => {
            return {
                id: item.id,
                itemCode: item.itemCode,
                description: item.description,
                fabricType: item.fabricType
                    ? {
                          id: item.fabricType.id,
                          name: item.fabricType.name,
                          units: item.fabricType.units,
                      }
                    : null,
                currentQuantity: item.currentQuantity,
                unitOfMeasure: item.unitOfMeasure,
                location: item.location,
                minStockLevel: item.minStockLevel,
                costPerUnit: Number(item.costPerUnit),
                salePrice: Number(item.salePrice),
                lastRestocked: item.lastRestocked
                    ? item.lastRestocked.toISOString()
                    : null,
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString(),
                notes: item.notes,
                recentTransactions: item.transactions.map((tx) => ({
                    id: tx.id,
                    transactionType: tx.transactionType,
                    quantity: tx.quantity,
                    transactionDate: tx.transactionDate.toISOString(),
                    notes: tx.notes,
                })),
            };
        });

        return NextResponse.json({
            data: transformedInventory,
            fabricTypes: fabricTypes.map((type) => ({
                id: type.id,
                name: type.name,
                units: type.units,
            })),
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching fabric data:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch fabric data",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/fabric
 * Create a new fabric type
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || !body.units) {
            return NextResponse.json(
                { error: "Missing required fields (name, units)" },
                { status: 400 },
            );
        }

        // Check if fabric type already exists
        const existingType = await db.fabricType.findFirst({
            where: {
                name: {
                    equals: body.name,
                    mode: "insensitive",
                },
            },
        });

        if (existingType) {
            return NextResponse.json(
                { error: "Fabric type with this name already exists" },
                { status: 409 },
            );
        }

        // Create new fabric type
        const newFabricType = await db.fabricType.create({
            data: {
                name: body.name,
                description: body.description || null,
                units: body.units,
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: newFabricType,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating fabric type:", error);
        return NextResponse.json(
            {
                error: "Failed to create fabric type",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
