import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orderNumber = searchParams.get("orderNumber");

        if (!orderNumber) {
            return NextResponse.json(
                { error: "Order number parameter is required" },
                { status: 400 },
            );
        }

        const existingOrder = await prisma.salesOrder.findFirst({
            where: {
                orderNumber: orderNumber.trim(),
            },
            select: {
                id: true,
                orderNumber: true,
                orderDate: true,
            },
        });

        return NextResponse.json(
            {
                exists: !!existingOrder,
                order: existingOrder,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Error checking order number:", error);
        return NextResponse.json(
            { error: "Failed to check order number" },
            { status: 500 },
        );
    }
} 