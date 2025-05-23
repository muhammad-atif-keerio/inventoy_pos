import { NextRequest, NextResponse } from "next/server";

import { DyeingProcess, Payment, ThreadPurchase } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/vendors/[id]
 * Fetch a single vendor by ID with related data
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid vendor ID" },
                { status: 400 },
            );
        }

        // Fetch vendor from database with related data
        const vendor = await db.vendor.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                threadPurchases: {
                    orderBy: {
                        orderDate: "desc",
                    },
                    include: {
                        paymentTransactions: true,
                        dyeingProcesses: true,
                    },
                },
                _count: {
                    select: {
                        threadPurchases: true,
                    },
                },
            },
        });

        if (!vendor) {
            return NextResponse.json(
                { error: "Vendor not found" },
                { status: 404 },
            );
        }

        // Transform data for response
        const transformedVendor = {
            ...vendor,
            createdAt: vendor.createdAt.toISOString(),
            updatedAt: vendor.updatedAt.toISOString(),
            totalThreadPurchases: vendor._count.threadPurchases,
            // Calculate sum of all purchases
            totalPurchaseValue: vendor.threadPurchases.reduce(
                (sum: number, order: ThreadPurchase) => {
                    return sum + Number(order.totalCost);
                },
                0,
            ),
            // Calculate pending orders (not received)
            pendingOrders: vendor.threadPurchases.filter(
                (order: ThreadPurchase) => !order.received,
            ).length,
            // Format thread purchases
            threadPurchases: vendor.threadPurchases.map(
                (
                    purchase: ThreadPurchase & {
                        paymentTransactions: Payment[];
                        dyeingProcesses: DyeingProcess[];
                    },
                ) => ({
                    ...purchase,
                    orderDate: purchase.orderDate.toISOString(),
                    deliveryDate: purchase.deliveryDate
                        ? purchase.deliveryDate.toISOString()
                        : null,
                    receivedAt: purchase.receivedAt
                        ? purchase.receivedAt.toISOString()
                        : null,
                    unitPrice: Number(purchase.unitPrice),
                    totalCost: Number(purchase.totalCost),
                    // Convert decimal fields in associated records
                    payments: purchase.paymentTransactions.map(
                        (payment: Payment) => ({
                            ...payment,
                            amount: Number(payment.amount),
                            transactionDate:
                                payment.transactionDate.toISOString(),
                            createdAt: payment.createdAt.toISOString(),
                            updatedAt: payment.updatedAt.toISOString(),
                        }),
                    ),
                    dyeingProcesses: purchase.dyeingProcesses.map(
                        (dyeingProcess: DyeingProcess) => ({
                            ...dyeingProcess,
                            dyeDate: dyeingProcess.dyeDate.toISOString(),
                            laborCost: dyeingProcess.laborCost
                                ? Number(dyeingProcess.laborCost)
                                : null,
                            dyeMaterialCost: dyeingProcess.dyeMaterialCost
                                ? Number(dyeingProcess.dyeMaterialCost)
                                : null,
                            totalCost: dyeingProcess.totalCost
                                ? Number(dyeingProcess.totalCost)
                                : null,
                            completionDate: dyeingProcess.completionDate
                                ? dyeingProcess.completionDate.toISOString()
                                : null,
                        }),
                    ),
                }),
            ),
        };

        return NextResponse.json(transformedVendor);
    } catch (error) {
        console.error("Error fetching vendor:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch vendor",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/vendors/[id]
 * Update a vendor by ID
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid vendor ID" },
                { status: 400 },
            );
        }

        const body = await request.json();

        // Validate required fields
        if (body.name !== undefined && body.name.trim() === "") {
            return NextResponse.json(
                { error: "Name cannot be empty" },
                { status: 400 },
            );
        }

        if (body.contact !== undefined && body.contact.trim() === "") {
            return NextResponse.json(
                { error: "Contact cannot be empty" },
                { status: 400 },
            );
        }

        // Update vendor in database
        const updatedVendor = await db.vendor.update({
            where: {
                id: Number(id),
            },
            data: {
                name: body.name,
                contact: body.contact,
                email: body.email,
                address: body.address,
                city: body.city,
                notes: body.notes,
            },
        });

        return NextResponse.json({
            success: true,
            vendor: {
                ...updatedVendor,
                createdAt: updatedVendor.createdAt.toISOString(),
                updatedAt: updatedVendor.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("Error updating vendor:", error);

        // Handle not found error
        if (
            error instanceof Error &&
            error.message.includes("Record to update not found")
        ) {
            return NextResponse.json(
                { error: "Vendor not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(
            {
                error: "Failed to update vendor",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/vendors/[id]
 * Delete a vendor by ID
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        const { id } = await params;

        if (isNaN(id)) {
            return NextResponse.json(
                { error: "Invalid vendor ID" },
                { status: 400 },
            );
        }

        // Check if vendor has any thread purchases
        const vendorWithPurchases = await db.vendor.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                threadPurchases: {
                    take: 1, // We only need to know if there are any
                },
            },
        });

        if (!vendorWithPurchases) {
            return NextResponse.json(
                { error: "Vendor not found" },
                { status: 404 },
            );
        }

        if (vendorWithPurchases.threadPurchases.length > 0) {
            return NextResponse.json(
                {
                    error: "Cannot delete vendor with thread purchases. Remove all purchases first or archive the vendor instead.",
                },
                { status: 400 },
            );
        }

        // Delete vendor from database
        await db.vendor.delete({
            where: {
                id: Number(id),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Vendor deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting vendor:", error);
        return NextResponse.json(
            {
                error: "Failed to delete vendor",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
