import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

// GET handler to fetch a specific thread purchase by ID
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;
        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid thread purchase ID" },
                { status: 400 },
            );
        }

        const threadPurchase = await db.threadPurchase.findUnique({
            where: { id: Number(id) },
            include: {
                vendor: true,
                dyeingProcess: true,
                payments: true,
                inventoryTransaction: true,
                fabricProduction: true,
            },
        });

        if (!threadPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Format the response
        const formattedThreadPurchase = {
            ...threadPurchase,
            orderDate: threadPurchase.orderDate.toISOString(),
            deliveryDate: threadPurchase.deliveryDate?.toISOString() || null,
            receivedAt: threadPurchase.receivedAt?.toISOString() || null,
            unitPrice: Number(threadPurchase.unitPrice),
            totalCost: Number(threadPurchase.totalCost),
        };

        return NextResponse.json({
            success: true,
            data: formattedThreadPurchase,
        });
    } catch (error) {
        console.error("Error fetching thread purchase:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread purchase" },
            { status: 500 },
        );
    }
}

// PATCH handler to update a specific thread purchase by ID
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;
        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid thread purchase ID" },
                { status: 400 },
            );
        }

        const body = await req.json();

        // Update thread purchase
        const updatedThreadPurchase = await db.threadPurchase.update({
            where: { id: Number(id) },
            data: {
                threadType: body.threadType,
                color: body.color,
                colorStatus: body.colorStatus,
                quantity: body.quantity,
                unitPrice: body.unitPrice,
                totalCost:
                    body.totalCost ||
                    (body.quantity && body.unitPrice
                        ? body.quantity * body.unitPrice
                        : undefined),
                unitOfMeasure: body.unitOfMeasure,
                deliveryDate: body.deliveryDate
                    ? new Date(body.deliveryDate)
                    : null,
                remarks: body.remarks,
                reference: body.reference,
                received: body.received,
                receivedAt:
                    body.received && !body.receivedAt
                        ? new Date()
                        : body.receivedAt
                          ? new Date(body.receivedAt)
                          : null,
            },
            include: {
                vendor: true,
                dyeingProcess: true,
                payments: true,
                inventoryTransaction: true,
                fabricProduction: true,
            },
        });

        // Format the response
        const formattedThreadPurchase = {
            ...updatedThreadPurchase,
            orderDate: updatedThreadPurchase.orderDate.toISOString(),
            deliveryDate:
                updatedThreadPurchase.deliveryDate?.toISOString() || null,
            receivedAt: updatedThreadPurchase.receivedAt?.toISOString() || null,
            unitPrice: Number(updatedThreadPurchase.unitPrice),
            totalCost: Number(updatedThreadPurchase.totalCost),
        };

        return NextResponse.json({
            success: true,
            data: formattedThreadPurchase,
        });
    } catch (error) {
        console.error("Error updating thread purchase:", error);
        return NextResponse.json(
            { error: "Failed to update thread purchase" },
            { status: 500 },
        );
    }
}

// DELETE handler to delete a specific thread purchase by ID
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;
        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid thread purchase ID" },
                { status: 400 },
            );
        }

        // Check if thread purchase exists and has any related records
        const threadPurchase = await db.threadPurchase.findUnique({
            where: { id: Number(id) },
            include: {
                fabricProduction: true,
                dyeingProcess: true,
                payments: true,
                inventoryTransaction: true,
            },
        });

        if (!threadPurchase) {
            return NextResponse.json(
                { error: "Thread purchase not found" },
                { status: 404 },
            );
        }

        // Check if it's used in fabric production
        if (
            threadPurchase.fabricProduction &&
            threadPurchase.fabricProduction.length > 0
        ) {
            return NextResponse.json(
                {
                    error: "Cannot delete thread purchase that has been used in fabric production",
                },
                { status: 400 },
            );
        }

        // Delete related records first
        await Promise.all([
            db.dyeingProcess.deleteMany({
                where: { threadPurchaseId: id },
            }),
            db.payment.deleteMany({
                where: { threadPurchaseId: id },
            }),
            db.inventoryTransaction.deleteMany({
                where: { threadPurchaseId: id },
            }),
        ]);

        // Delete the thread purchase
        await db.threadPurchase.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting thread purchase:", error);
        return NextResponse.json(
            { error: "Failed to delete thread purchase" },
            { status: 500 },
        );
    }
}
