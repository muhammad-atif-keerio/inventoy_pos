import { NextRequest, NextResponse } from "next/server";

import { db } from "../../../../lib/db";

// Default khatas to return if database connection fails
const defaultKhatas = [
    {
        id: 1,
        name: "Main Account Book",
        description: "Primary business khata",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

/**
 * GET /api/ledger/khata
 * Get all khatas (account books)
 */
export async function GET() {
    try {
        console.log("Fetching khatas from database...");

        // Check first if default khata exists, create if not
        const defaultKhata = await db.ledgerEntry.findFirst({
            where: {
                entryType: "KHATA",
            },
        });

        // If no default khata, create one
        if (!defaultKhata) {
            try {
                console.log("No khatas found, creating default khata");
                await db.ledgerEntry.create({
                    data: {
                        entryType: "KHATA",
                        description: "Main Account Book",
                        notes: "Primary business khata",
                        amount: 0,
                        remainingAmount: 0,
                        status: "PENDING",
                        entryDate: new Date(),
                        updatedAt: new Date(),
                    },
                });
                console.log("Default khata created successfully");
            } catch (createError) {
                console.error("Failed to create default khata:", createError);
            }
        }

        // Get all khatas from the database
        try {
            const khataEntries = await db.ledgerEntry.findMany({
                where: {
                    entryType: "KHATA",
                },
                orderBy: {
                    description: "asc", // Use description as the name for khatas
                },
            });

            // If no khatas found (shouldn't happen at this point), return a default khata
            if (!khataEntries || khataEntries.length === 0) {
                console.log(
                    "Still no khatas found after attempting to create one, using default khata",
                );
                return NextResponse.json({
                    khatas: defaultKhatas,
                });
            }

            // Format and return khatas
            return NextResponse.json({
                khatas: khataEntries.map((entry) => ({
                    id: entry.id,
                    name: entry.description, // Use description field for name
                    description: entry.notes || null,
                    createdAt: entry.createdAt.toISOString(),
                    updatedAt: entry.updatedAt.toISOString(),
                })),
            });
        } catch (queryError) {
            console.error("Error querying khatas:", queryError);
            return NextResponse.json({
                khatas: defaultKhatas,
                error: "Failed to query khatas, using default",
                databaseError: true,
            });
        }
    } catch (error) {
        console.error("Error fetching khatas:", error);

        // Return a default khata to prevent UI issues
        return NextResponse.json({
            khatas: defaultKhatas,
            error: "Failed to fetch khatas, using default",
            databaseError: true,
        });
    }
}

/**
 * POST /api/ledger/khata
 * Create a new khata (account book)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || body.name.trim() === "") {
            return NextResponse.json(
                { error: "Khata name is required" },
                { status: 400 },
            );
        }

        // Create a new khata in the database
        try {
            const newKhata = await db.ledgerEntry.create({
                data: {
                    entryType: "KHATA",
                    description: body.name.trim(), // Use description field for name
                    notes: body.description?.trim() || null,
                    amount: 0, // Khata entries have 0 amount
                    remainingAmount: 0,
                    status: "PENDING",
                    entryDate: new Date(),
                    updatedAt: new Date(),
                },
            });

            return NextResponse.json(
                {
                    khata: {
                        id: newKhata.id,
                        name: newKhata.description,
                        description: newKhata.notes,
                        createdAt: newKhata.createdAt.toISOString(),
                        updatedAt: newKhata.updatedAt.toISOString(),
                    },
                },
                { status: 201 },
            );
        } catch (createError) {
            console.error("Error creating khata:", createError);
            return NextResponse.json(
                {
                    error: "Failed to create khata",
                    details:
                        createError instanceof Error
                            ? createError.message
                            : String(createError),
                    databaseError: true,
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Error processing request:", error);
        return NextResponse.json(
            {
                error: "Failed to process request",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
