/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/vendors
 * Fetch all vendors with optional pagination and searching
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination parameters
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "100"); // Increased default limit
        const skip = (page - 1) * limit;

        // Search parameter
        const search = searchParams.get("search") || "";
        const orderBy = searchParams.get("orderBy") || "name";
        const order = searchParams.get("order") || "asc";

        // Active orders filter
        const hasActiveOrders = searchParams.get("hasActiveOrders") === "true";

        // Build filter based on search term
        const filter: Prisma.VendorWhereInput = search
            ? {
                  OR: [
                      {
                          name: {
                              contains: search,
                              mode: "insensitive" as Prisma.QueryMode,
                          },
                      },
                      {
                          contact: {
                              contains: search,
                              mode: "insensitive" as Prisma.QueryMode,
                          },
                      },
                      {
                          email: {
                              contains: search,
                              mode: "insensitive" as Prisma.QueryMode,
                          },
                      },
                      {
                          city: {
                              contains: search,
                              mode: "insensitive" as Prisma.QueryMode,
                          },
                      },
                  ],
              }
            : {};

        // Fetch vendors with thread purchases - use 'include' with type assertion to handle schema mismatch
        const vendors = await db.vendor.findMany({
            where: filter,
            skip,
            take: limit,
            orderBy: {
                [orderBy]: order === "asc" ? "asc" : "desc",
            },
            include: {
                // Use the field name from the schema, not the TypeScript generated type
                threadPurchase: {
                    where: hasActiveOrders
                        ? {
                              // Filter for active orders (not received or recent orders)
                              OR: [
                                  { received: false },
                                  {
                                      receivedAt: {
                                          gte: new Date(
                                              Date.now() -
                                                  30 * 24 * 60 * 60 * 1000,
                                          ),
                                      },
                                  }, // Orders received in the last 30 days
                              ],
                          }
                        : undefined,
                    select: {
                        id: true,
                        orderDate: true,
                        received: true,
                        receivedAt: true,
                        totalCost: true,
                    },
                },
            } as any, // Type assertion to avoid TypeScript error
        });

        // Get total count for pagination
        const totalVendors = await db.vendor.count({
            where: filter,
        });

        // Format dates and add derived data
        const formattedVendors = vendors.map((vendor: any) => {
            // Calculate active orders (orders not received yet)
            const activeOrders = vendor.threadPurchase.filter(
                (order: any) => !order.received,
            ).length;

            // Calculate total purchases amount
            const totalPurchases = vendor.threadPurchase.reduce(
                (sum: number, order: any) => sum + Number(order.totalCost),
                0,
            );

            return {
                id: vendor.id,
                name: vendor.name,
                contact: vendor.contact,
                email: vendor.email,
                address: vendor.address,
                city: vendor.city,
                notes: vendor.notes,
                createdAt: vendor.createdAt.toISOString(),
                updatedAt: vendor.updatedAt.toISOString(),
                activeOrders,
                totalPurchases,
            };
        });

        // Apply active orders filter if requested
        const filteredVendors = hasActiveOrders
            ? formattedVendors.filter((vendor) => vendor.activeOrders > 0)
            : formattedVendors;

        return NextResponse.json({
            vendors: filteredVendors,
            pagination: {
                total: totalVendors,
                page,
                limit,
                pages: Math.ceil(totalVendors / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching vendors:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch vendors",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/vendors
 * Create a new vendor
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || body.name.trim() === "") {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 },
            );
        }

        if (!body.contact || body.contact.trim() === "") {
            return NextResponse.json(
                { error: "Contact is required" },
                { status: 400 },
            );
        }

        // Create vendor in database with required updatedAt field
        const newVendor = await db.vendor.create({
            data: {
                name: body.name.trim(),
                contact: body.contact.trim(),
                email: body.email?.trim() || null,
                address: body.address?.trim() || null,
                city: body.city?.trim() || null,
                notes: body.notes?.trim() || null,
                updatedAt: new Date(), // Add missing updatedAt field
            },
        });

        return NextResponse.json(
            {
                success: true,
                vendor: {
                    ...newVendor,
                    createdAt: newVendor.createdAt.toISOString(),
                    updatedAt: newVendor.updatedAt.toISOString(),
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating vendor:", error);
        return NextResponse.json(
            {
                error: "Failed to create vendor",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
