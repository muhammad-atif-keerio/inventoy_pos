import { NextRequest, NextResponse } from "next/server";

// Import db from the correct location
import { db } from "../../../../lib/db";
import { LedgerApiResponse, LedgerValidator } from "../../ledger-types";

// Check if we're using real client
const isUsingRealLedgerClient = !!process.env.LEDGER_DATABASE_URL;

// Define the required types locally
type BillStatus = "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";
type BillType = "PURCHASE" | "SALE" | "EXPENSE" | "INCOME" | "OTHER";

/**
 * GET /api/ledger/bill
 * Get bills with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Extract query parameters
        const khataId = searchParams.get("khataId");
        const partyId = searchParams.get("partyId");
        const billType = searchParams.get("billType") as BillType | null;
        const status = searchParams.get("status") as BillStatus | null;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Pagination parameters
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "10");
        const skip = (page - 1) * pageSize;

        // Check if using real client
        if (isUsingRealLedgerClient) {
            // Build the where clause for filtering
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where: any = {};

            if (khataId) {
                where.khataId = parseInt(khataId);
            }

            if (partyId) {
                where.partyId = parseInt(partyId);
            }

            if (billType) {
                where.billType = billType;
            }

            if (status) {
                where.status = status;
            }

            // Date filters
            if (startDate || endDate) {
                where.billDate = {};

                if (startDate) {
                    where.billDate.gte = new Date(startDate);
                }

                if (endDate) {
                    where.billDate.lte = new Date(endDate);
                }
            }

            // Filter by khataId using notes or reference
            let finalWhere = where;
            if (khataId) {
                const khataIdStr = khataId.toString();
                finalWhere = {
                    ...where,
                    OR: [
                        { reference: { contains: `khata:${khataIdStr}` } },
                        { notes: { contains: `khata:${khataIdStr}` } },
                    ],
                };
                delete finalWhere.khataId;
            }

            // Get bills with pagination using the main database
            const [bills, totalCount] = await Promise.all([
                db.ledgerEntry.findMany({
                    where: {
                        ...finalWhere,
                        entryType: "BILL",
                    },
                    orderBy: {
                        entryDate: "desc",
                    },
                    skip,
                    take: pageSize,
                }),
                db.ledgerEntry.count({
                    where: {
                        ...finalWhere,
                        entryType: "BILL",
                    },
                }),
            ]);

            // Format the response
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formattedBills = bills.map((bill: any) => ({
                id: bill.id,
                billNumber:
                    bill.reference?.replace("BILL-", "") || `BILL-${bill.id}`,
                khataId: khataId ? parseInt(khataId) : 1, // Use the requested khataId
                partyId: bill.vendorId || bill.customerId,
                partyName: bill.notes?.match(/party:([^\\n]+)/)?.[1] || null,
                billDate: bill.entryDate.toISOString(),
                dueDate: bill.dueDate?.toISOString(),
                amount: bill.amount.toString(),
                paidAmount: bill.amount.minus(bill.remainingAmount).toString(),
                description: bill.description,
                billType: bill.reference?.includes("SALE")
                    ? "SALE"
                    : "PURCHASE",
                status: bill.status,
                transactions: [], // Transactions would need to be fetched separately
                createdAt: bill.createdAt.toISOString(),
                updatedAt: bill.updatedAt.toISOString(),
            }));

            const response: LedgerApiResponse = {
                success: true,
                data: {
                    bills: formattedBills,
                },
                meta: {
                    page,
                    pageSize,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                },
                statusCode: 200,
            };

            return NextResponse.json(response);
        } else {
            // Return mock data if not using real client
            const mockBills = [
                {
                    id: 1,
                    billNumber: "BILL-001",
                    khataId: 1,
                    partyId: 1,
                    partyName: "Textile Suppliers Ltd",
                    billDate: new Date().toISOString(),
                    dueDate: new Date(
                        Date.now() + 30 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                    amount: "25000",
                    paidAmount: "0",
                    description: "Thread Purchase",
                    billType: "PURCHASE",
                    status: "PENDING",
                    transactions: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 2,
                    billNumber: "BILL-002",
                    khataId: 1,
                    partyId: 2,
                    partyName: "Fashion Retailer",
                    billDate: new Date(
                        Date.now() - 5 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                    dueDate: new Date(
                        Date.now() + 10 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                    amount: "35000",
                    paidAmount: "10000",
                    description: "Cloth Sale",
                    billType: "SALE",
                    status: "PARTIAL",
                    transactions: [
                        {
                            id: 1,
                            amount: "10000",
                            date: new Date(
                                Date.now() - 2 * 24 * 60 * 60 * 1000,
                            ).toISOString(),
                        },
                    ],
                    createdAt: new Date(
                        Date.now() - 5 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                    updatedAt: new Date(
                        Date.now() - 2 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                },
            ];

            const response: LedgerApiResponse = {
                success: true,
                data: {
                    bills: mockBills,
                },
                meta: {
                    page: 1,
                    pageSize: 10,
                    total: mockBills.length,
                    totalPages: 1,
                },
                statusCode: 200,
            };

            return NextResponse.json(response);
        }
    } catch (error) {
        console.error("Error fetching bills:", error);

        const response: LedgerApiResponse = {
            success: false,
            error: "Failed to fetch bills",
            message: error instanceof Error ? error.message : String(error),
            statusCode: 500,
        };

        return NextResponse.json(response, { status: 500 });
    }
}

/**
 * POST /api/ledger/bill
 * Create a new bill
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Use LedgerValidator to validate the bill data
        const validation = LedgerValidator.validateBill({
            billNumber: body.billNumber || "",
            khataId: body.khataId ? parseInt(body.khataId) : undefined,
            billDate: body.billDate ? new Date(body.billDate) : undefined,
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            amount: body.amount ? parseFloat(body.amount) : undefined,
            billType: body.billType,
            status: body.status || "PENDING",
            paidAmount: body.paidAmount ? parseFloat(body.paidAmount) : 0,
        });

        if (!validation.isValid) {
            const response: LedgerApiResponse = {
                success: false,
                error: "Invalid bill data",
                message: validation.errors.join(", "),
                statusCode: 400,
            };
            return NextResponse.json(response, { status: 400 });
        }

        if (isUsingRealLedgerClient) {
            try {
                // Generate a bill number
                const billCount = await db.ledgerEntry.count({
                    where: {
                        OR: [
                            {
                                reference: {
                                    contains: `khata:${body.khataId}`,
                                },
                            },
                            { notes: { contains: `khata:${body.khataId}` } },
                        ],
                        entryType: "BILL",
                    },
                });

                const billNumber = `${body.billType}-${parseInt(body.khataId)}-${(billCount + 1).toString().padStart(4, "0")}`;

                // Create the bill directly in the main database as a LedgerEntry
                const newBill = await db.ledgerEntry.create({
                    data: {
                        // Add khata reference
                        reference: `${billNumber}${body.khataId ? ` khata:${body.khataId}` : ""}`,
                        notes: `${body.description || ""}${body.description ? "\n" : ""}khata:${body.khataId}${body.partyId ? `\nparty:${body.partyId}` : ""}`,
                        entryType: "BILL",
                        entryDate: new Date(body.billDate),
                        dueDate: body.dueDate
                            ? new Date(body.dueDate)
                            : undefined,
                        description:
                            body.description?.trim() || `${body.billType} Bill`,
                        amount: parseFloat(body.amount),
                        remainingAmount: parseFloat(body.amount), // Initially, the full amount is remaining
                        status: "PENDING",
                        updatedAt: new Date(),
                        vendorId:
                            body.billType === "PURCHASE" ? body.partyId : null,
                        customerId:
                            body.billType === "SALE" ? body.partyId : null,
                    },
                });

                const response: LedgerApiResponse = {
                    success: true,
                    data: {
                        bill: {
                            id: newBill.id,
                            billNumber,
                            khataId: parseInt(body.khataId),
                            partyId: body.partyId
                                ? parseInt(body.partyId)
                                : null,
                            partyName: body.partyName || null,
                            billDate: newBill.entryDate.toISOString(),
                            dueDate: newBill.dueDate?.toISOString(),
                            amount: newBill.amount.toString(),
                            paidAmount: "0",
                            description: newBill.description,
                            billType: body.billType,
                            status: newBill.status,
                            transactions: [],
                            createdAt: newBill.createdAt.toISOString(),
                            updatedAt: newBill.updatedAt.toISOString(),
                        },
                    },
                    message: "Bill created successfully",
                    statusCode: 201,
                };

                return NextResponse.json(response, { status: 201 });
            } catch (error) {
                console.error("Error creating bill entry:", error);

                const response: LedgerApiResponse = {
                    success: false,
                    error: "Failed to create bill entry",
                    message:
                        error instanceof Error ? error.message : String(error),
                    statusCode: 500,
                };

                return NextResponse.json(response, { status: 500 });
            }
        } else {
            // Return mock data if not using real client
            const response: LedgerApiResponse = {
                success: true,
                data: {
                    bill: {
                        id: Math.floor(Math.random() * 1000) + 3,
                        billNumber: `BILL-${Math.floor(Math.random() * 9000) + 1000}`,
                        khataId: parseInt(body.khataId),
                        partyId: body.partyId ? parseInt(body.partyId) : null,
                        partyName: body.partyName || null,
                        billDate: new Date(body.billDate).toISOString(),
                        dueDate: body.dueDate
                            ? new Date(body.dueDate).toISOString()
                            : null,
                        amount: body.amount,
                        paidAmount: "0",
                        description: body.description || null,
                        billType: body.billType,
                        status: "PENDING",
                        transactions: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                },
                message: "Mock bill created successfully",
                statusCode: 201,
            };

            return NextResponse.json(response, { status: 201 });
        }
    } catch (error) {
        console.error("Error creating bill:", error);

        const response: LedgerApiResponse = {
            success: false,
            error: "Failed to create bill",
            message: error instanceof Error ? error.message : String(error),
            statusCode: 500,
        };

        return NextResponse.json(response, { status: 500 });
    }
}
