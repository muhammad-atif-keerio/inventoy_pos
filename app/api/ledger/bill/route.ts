import { NextRequest, NextResponse } from "next/server";

// Import db from the correct location
import { db } from "../../../../lib/db";

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

            return NextResponse.json({
                bills: formattedBills,
                pagination: {
                    total: totalCount,
                    page,
                    pageSize,
                    totalPages: Math.ceil(totalCount / pageSize),
                },
            });
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

            return NextResponse.json({
                bills: mockBills,
                pagination: {
                    total: mockBills.length,
                    page: 1,
                    pageSize: 10,
                    totalPages: 1,
                },
            });
        }
    } catch (error) {
        console.error("Error fetching bills:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch bills",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/ledger/bill
 * Create a new bill
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.khataId) {
            return NextResponse.json(
                { error: "Khata ID is required" },
                { status: 400 },
            );
        }

        if (!body.billType) {
            return NextResponse.json(
                { error: "Bill type is required" },
                { status: 400 },
            );
        }

        if (
            !body.amount ||
            isNaN(parseFloat(body.amount)) ||
            parseFloat(body.amount) <= 0
        ) {
            return NextResponse.json(
                { error: "Valid amount is required" },
                { status: 400 },
            );
        }

        if (!body.billDate) {
            return NextResponse.json(
                { error: "Bill date is required" },
                { status: 400 },
            );
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
                        reference: `BILL-${billNumber} khata:${body.khataId}`,
                        notes: `khata:${body.khataId}\nparty:${body.partyId || "none"}\nauto-sync:true`,
                        updatedAt: new Date(),
                        vendorId:
                            body.billType === "PURCHASE" ? body.partyId : null,
                        customerId:
                            body.billType === "SALE" ? body.partyId : null,
                    },
                });

                return NextResponse.json(
                    {
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
                    { status: 201 },
                );
            } catch (error) {
                console.error("Error creating bill entry:", error);
                return NextResponse.json(
                    {
                        error: "Failed to create bill entry",
                        details:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                    { status: 500 },
                );
            }
        } else {
            // Return mock data if not using real client
            return NextResponse.json(
                {
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
                { status: 201 },
            );
        }
    } catch (error) {
        console.error("Error creating bill:", error);
        return NextResponse.json(
            {
                error: "Failed to create bill",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
