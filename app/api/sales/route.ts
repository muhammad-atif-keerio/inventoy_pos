import { NextRequest, NextResponse } from "next/server";

import {
    PaymentMode,
    PaymentStatus,
    Prisma,
    ProductType,
} from "@prisma/client";

import { db } from "@/lib/db";

// Define type for whereClause
type SalesOrderWhereInput = Prisma.SalesOrderWhereInput & {
    items?: {
        some: {
            productType: ProductType;
        };
    };
};

export async function GET(req: NextRequest) {
    try {
        // Get query parameters
        const searchParams = req.nextUrl.searchParams;
        const productType = searchParams.get(
            "productType",
        ) as ProductType | null;
        const customerId = searchParams.get("customerId")
            ? parseInt(searchParams.get("customerId")!)
            : null;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const status = searchParams.get(
            "paymentStatus",
        ) as PaymentStatus | null;
        const limit = searchParams.get("limit")
            ? parseInt(searchParams.get("limit")!)
            : 10;
        const offset = searchParams.get("offset")
            ? parseInt(searchParams.get("offset")!)
            : 0;

        // Build the query filters
        const whereClause: SalesOrderWhereInput = {};

        if (customerId) {
            whereClause.customerId = customerId;
        }

        if (status) {
            whereClause.paymentStatus = status;
        }

        // Handle date range
        if (startDate || endDate) {
            whereClause.orderDate = {};

            if (startDate) {
                whereClause.orderDate = {
                    ...(whereClause.orderDate as Prisma.DateTimeFilter),
                    gte: new Date(startDate),
                };
            }

            if (endDate) {
                whereClause.orderDate = {
                    ...(whereClause.orderDate as Prisma.DateTimeFilter),
                    lte: new Date(endDate),
                };
            }
        }

        // If product type filter is applied, filter by items
        if (productType) {
            whereClause.items = {
                some: {
                    productType: productType,
                },
            };
        }

        // Fetch total count for pagination
        const totalCount = await db.salesOrder.count({
            where: whereClause as Prisma.SalesOrderWhereInput,
        });

        // Fetch sales orders with related data
        const salesOrders = await db.salesOrder.findMany({
            where: whereClause as Prisma.SalesOrderWhereInput,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        contact: true,
                        email: true,
                    },
                },
                items: {
                    include: {
                        threadPurchase: {
                            select: {
                                id: true,
                                threadType: true,
                                color: true,
                                colorStatus: true,
                                vendor: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                        fabricProduction: {
                            select: {
                                id: true,
                                fabricType: true,
                                dimensions: true,
                                batchNumber: true,
                            },
                        },
                    },
                },
                payments: {
                    include: {
                        chequeTransaction: true,
                    },
                    orderBy: {
                        transactionDate: "desc",
                    },
                },
            },
            orderBy: {
                orderDate: "desc",
            },
            take: limit,
            skip: offset,
        });

        // Format the response
        const formattedOrders = salesOrders.map((order) => ({
            ...order,
            totalSale: Number(order.totalSale),
            discount: order.discount ? Number(order.discount) : null,
            tax: order.tax ? Number(order.tax) : null,
            items: order.items.map((item) => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                discount: item.discount ? Number(item.discount) : null,
                tax: item.tax ? Number(item.tax) : null,
                subtotal: Number(item.subtotal),
            })),
            payments: order.payments.map((payment) => ({
                ...payment,
                amount: Number(payment.amount),
                chequeTransaction: payment.chequeTransaction
                    ? {
                          ...payment.chequeTransaction,
                          chequeAmount: Number(
                              payment.chequeTransaction.chequeAmount,
                          ),
                      }
                    : null,
            })),
        }));

        // Return the response with proper structure
        return NextResponse.json({
            success: true,
            data: {
                items: formattedOrders,
                total: totalCount,
                page: Math.floor(offset / limit) + 1,
                limit,
            },
        });
    } catch (error) {
        console.error("Error fetching sales orders:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch sales orders",
            },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        // Validate required fields
        const requiredFields = [
            "customerName",
            "productType",
            "productId",
            "quantitySold",
            "salePrice",
            "paymentStatus",
        ];
        for (const field of requiredFields) {
            if (!data[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 },
                );
            }
        }

        // Ensure orderDate is provided or set default
        if (!data.orderDate) {
            data.orderDate = new Date().toISOString();
        }

        // Format payment information
        const formattedData = {
            ...data,
            // Ensure payment information is properly structured for the submit endpoint
            paymentAmount: data.paymentAmount || 0,
            chequeDetails:
                data.paymentMode === PaymentMode.CHEQUE
                    ? {
                          chequeNumber: data.chequeNumber,
                          bank: data.bank,
                          branch: data.branch,
                          remarks: data.chequeRemarks,
                      }
                    : undefined,
        };

        // Forward to the submit endpoint that handles the creation logic
        const response = await fetch(
            new URL("/api/sales/submit", req.url).toString(),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formattedData),
            },
        );

        const result = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: result.error || "Failed to create sales order",
                    details: result.details,
                },
                { status: response.status },
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error creating sales order:", error);
        return NextResponse.json(
            {
                error: "Failed to create sales order",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
