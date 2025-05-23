import { NextRequest, NextResponse } from "next/server";

import {
    ChequeTransaction,
    Customer,
    InventoryTransactionType,
    Payment,
    PaymentMode,
    PaymentStatus,
    Prisma,
    ProductType,
    SalesOrder,
} from "@prisma/client";

import { db } from "@/lib/db";

// Define specific types for related entities
interface ThreadPurchaseRelation {
    id: number;
    threadType: string;
    color: string | null;
    colorStatus: string;
    vendor?: {
        id: number;
        name: string;
    } | null;
}

interface FabricProductionRelation {
    id: number;
    fabricType: string;
    dimensions?: string;
    batchNumber?: string;
}

interface SalesOrderItemRelation {
    id: number;
    salesOrderId: number;
    productType: ProductType;
    productId: number;
    quantitySold: number;
    unitPrice: Prisma.Decimal;
    discount?: Prisma.Decimal | null;
    tax?: Prisma.Decimal | null;
    subtotal: Prisma.Decimal;
    inventoryItemId?: number | null;
    threadPurchase?: ThreadPurchaseRelation | null;
    fabricProduction?: FabricProductionRelation | null;
}

// Use exact type instead of empty extending interface
type ChequeTransactionRelation = ChequeTransaction;

interface PaymentRelation extends Payment {
    chequeTransaction?: ChequeTransactionRelation | null;
}

// Define the complete sales order type with relations
type SalesOrderWithRelations = SalesOrder & {
    customer: Customer;
    items: SalesOrderItemRelation[];
    payments: PaymentRelation[];
};

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
            : undefined;
        const offset = searchParams.get("offset")
            ? parseInt(searchParams.get("offset")!)
            : undefined;

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

        // Fetch sales orders with related data - use type assertion to match our custom type
        const salesOrders = (await db.salesOrder.findMany({
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
            } as Prisma.SalesOrderInclude & {
                inventoryTransaction?: {
                    select: {
                        id: boolean;
                        quantity: boolean;
                        transactionType: boolean;
                        transactionDate: boolean;
                        inventory: {
                            select: {
                                id: boolean;
                                itemCode: boolean;
                                currentQuantity: boolean;
                            };
                        };
                    };
                    where: {
                        transactionType: InventoryTransactionType;
                    };
                    orderBy: {
                        createdAt: "desc";
                    };
                };
            },
            orderBy: {
                orderDate: "desc",
            },
            take: limit,
            skip: offset,
        })) as unknown as SalesOrderWithRelations[];

        // Count total records for pagination
        const totalCount = await db.salesOrder.count({
            where: whereClause as Prisma.SalesOrderWhereInput,
        });

        // Map the database records to the expected API response format
        const formattedData = salesOrders.map((order) => {
            // Calculate payment status dynamically based on total payments
            const totalPaid = order.payments.reduce(
                (sum: number, payment) => sum + payment.amount.toNumber(),
                0,
            );
            const totalAmount = order.totalSale.toNumber();
            let calculatedPaymentStatus = order.paymentStatus;

            // Verify if payment status is accurate based on actual payments
            if (
                totalPaid >= totalAmount &&
                order.paymentStatus !== PaymentStatus.CANCELLED
            ) {
                calculatedPaymentStatus = PaymentStatus.PAID;
            } else if (
                totalPaid > 0 &&
                totalPaid < totalAmount &&
                order.paymentStatus !== PaymentStatus.CANCELLED
            ) {
                calculatedPaymentStatus = PaymentStatus.PARTIAL;
            } else if (
                totalPaid === 0 &&
                order.paymentStatus !== PaymentStatus.CANCELLED
            ) {
                calculatedPaymentStatus = PaymentStatus.PENDING;
            }

            // Get cheque status from payments if payment mode is CHEQUE
            const chequePayment = order.payments.find(
                (payment) =>
                    payment.mode === PaymentMode.CHEQUE &&
                    payment.chequeTransaction,
            );
            const chequeTransaction = chequePayment?.chequeTransaction;

            // Format items for response
            const items = order.items.map((item: SalesOrderItemRelation) => {
                // Format the product name
                let productName = `#${item.productId}`;

                if (
                    item.productType === ProductType.THREAD &&
                    item.threadPurchase
                ) {
                    const tp = item.threadPurchase;
                    productName = `${tp.threadType} - ${tp.colorStatus === "COLORED" ? tp.color : "Raw"}`;
                    if (tp.vendor?.name) productName += ` (${tp.vendor.name})`;
                } else if (
                    item.productType === ProductType.FABRIC &&
                    item.fabricProduction
                ) {
                    const fp = item.fabricProduction;
                    productName = `${fp.fabricType}${fp.dimensions ? ` - ${fp.dimensions}` : ""}`;
                    if (fp.batchNumber)
                        productName += ` (Batch: ${fp.batchNumber})`;
                }

                return {
                    id: item.id,
                    productType: item.productType,
                    productId: item.productId,
                    productName: productName,
                    quantitySold: item.quantitySold,
                    unitPrice: item.unitPrice.toNumber(),
                    discount: item.discount?.toNumber() || null,
                    tax: item.tax?.toNumber() || null,
                    subtotal: item.subtotal.toNumber(),
                    threadPurchase: item.threadPurchase
                        ? {
                              id: item.threadPurchase.id,
                              threadType: item.threadPurchase.threadType,
                              color: item.threadPurchase.color,
                              colorStatus: item.threadPurchase.colorStatus,
                              vendorName: item.threadPurchase.vendor?.name,
                          }
                        : null,
                    fabricProduction: item.fabricProduction
                        ? {
                              id: item.fabricProduction.id,
                              fabricType: item.fabricProduction.fabricType,
                              dimensions: item.fabricProduction.dimensions,
                              batchNumber: item.fabricProduction.batchNumber,
                          }
                        : null,
                };
            });

            // For backward compatibility, use the first item's data for old clients
            const primaryItem = items.length > 0 ? items[0] : null;

            return {
                id: order.id,
                orderNumber: order.orderNumber,
                orderDate: order.orderDate.toISOString(),
                customerId: order.customerId,
                customerName: order.customer?.name || "Unknown Customer",
                productType: primaryItem?.productType || ProductType.THREAD,
                productId: primaryItem?.productId || 0,
                productName: primaryItem?.productName || "Unknown Product",
                quantitySold: primaryItem?.quantitySold || 0,
                salePrice: primaryItem?.unitPrice || 0,
                unitPrice: primaryItem?.unitPrice || 0,
                discount: primaryItem?.discount || null,
                tax: primaryItem?.tax || null,
                totalSale: order.totalSale.toNumber(),
                deliveryDate: order.deliveryDate
                    ? order.deliveryDate.toISOString()
                    : null,
                deliveryAddress: order.deliveryAddress || null,
                remarks: order.remarks || null,
                paymentMode: order.paymentMode || null,
                paymentStatus: calculatedPaymentStatus,
                chequeStatus: chequeTransaction?.chequeStatus || null,
                chequeNumber: chequeTransaction?.chequeNumber || null,
                bank: chequeTransaction?.bank || null,
                // Include the multi-item data
                items: items,
                // Include legacy properties
                threadPurchase: primaryItem?.threadPurchase || null,
                fabricProduction: primaryItem?.fabricProduction || null,
                payments: order.payments.map((payment: PaymentRelation) => ({
                    id: payment.id,
                    amount: payment.amount.toNumber(),
                    mode: payment.mode,
                    transactionDate: payment.transactionDate.toISOString(),
                    referenceNumber: payment.referenceNumber,
                    description: payment.description,
                    chequeTransaction: payment.chequeTransaction
                        ? {
                              id: payment.chequeTransaction.id,
                              chequeNumber:
                                  payment.chequeTransaction.chequeNumber,
                              bank: payment.chequeTransaction.bank,
                              branch: payment.chequeTransaction.branch,
                              chequeAmount:
                                  payment.chequeTransaction.chequeAmount.toNumber(),
                              chequeStatus:
                                  payment.chequeTransaction.chequeStatus,
                              clearanceDate: payment.chequeTransaction
                                  .clearanceDate
                                  ? payment.chequeTransaction.clearanceDate.toISOString()
                                  : undefined,
                          }
                        : null,
                })),
            };
        });

        return NextResponse.json({
            items: formattedData,
            total: totalCount,
        });
    } catch (error) {
        console.error("Error fetching sales orders:", error);
        return NextResponse.json(
            { error: "Failed to fetch sales orders", details: error },
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
