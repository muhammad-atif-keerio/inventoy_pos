/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * GET /api/customers
 * Get a list of all customers with optional pagination, search, and sorting
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        // Pagination parameters
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "100");
        const skip = (page - 1) * limit;

        // Search parameter
        const search = searchParams.get("search") || "";
        const orderBy = searchParams.get("orderBy") || "name";
        const order = searchParams.get("order") || "asc";

        // Build filter based on search term
        const filter: Prisma.CustomerWhereInput = search
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

        // Fetch customers with sales orders
        const customers = await db.customer.findMany({
            where: filter,
            skip,
            take: limit,
            orderBy: {
                [orderBy]: order === "asc" ? "asc" : "desc",
            },
            include: {
                salesOrder: {
                    select: {
                        id: true,
                        orderDate: true,
                        totalSale: true,
                        paymentStatus: true,
                    },
                    orderBy: {
                        orderDate: "desc",
                    },
                    take: 5, // Include only the most recent 5 orders
                },
            },
        });

        // Get total count for pagination
        const totalCustomers = await db.customer.count({
            where: filter,
        });

        // Format dates and add derived data
        const formattedCustomers = customers.map((customer) => {
            // Calculate total sales
            const totalSales = customer.salesOrder.reduce(
                (sum: number, order: any) => sum + Number(order.totalSale),
                0,
            );

            // Calculate pending orders
            const pendingOrders = customer.salesOrder.filter(
                (order: any) =>
                    order.paymentStatus === "PENDING" ||
                    order.paymentStatus === "PARTIAL",
            ).length;

            return {
                id: customer.id,
                name: customer.name,
                contact: customer.contact,
                email: customer.email,
                address: customer.address,
                city: customer.city,
                notes: customer.notes,
                createdAt: customer.createdAt.toISOString(),
                updatedAt: customer.updatedAt.toISOString(),
                totalOrders: customer.salesOrder.length,
                pendingOrders,
                totalSales,
                recentOrders: customer.salesOrder.map((order: any) => ({
                    id: order.id,
                    orderDate: order.orderDate.toISOString(),
                    totalSale: order.totalSale.toNumber(),
                    paymentStatus: order.paymentStatus,
                })),
            };
        });

        return NextResponse.json({
            customers: formattedCustomers,
            pagination: {
                total: totalCustomers,
                page,
                limit,
                pages: Math.ceil(totalCustomers / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching customers:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch customers",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/customers
 * Create a new customer
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

        // Create customer in database
        const newCustomer = await db.customer.create({
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
                customer: {
                    ...newCustomer,
                    createdAt: newCustomer.createdAt.toISOString(),
                    updatedAt: newCustomer.updatedAt.toISOString(),
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating customer:", error);
        return NextResponse.json(
            {
                error: "Failed to create customer",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
