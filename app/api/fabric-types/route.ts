import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * GET /api/fabric-types
 * Fetch all fabric types
 */
export async function GET() {
    try {
        const fabricTypes = await db.fabricType.findMany({
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json(
            fabricTypes.map((type) => ({
                id: type.id,
                name: type.name,
                description: type.description,
                units: type.units,
            })),
        );
    } catch (error) {
        console.error("Error fetching fabric types:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch fabric types",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/fabric-types
 * Create a new fabric type
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name) {
            return NextResponse.json(
                { error: "Fabric type name is required" },
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
                units: body.units || "meters",
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
