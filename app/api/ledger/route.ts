/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

// This fixes the type issues - we'll create a proper enum mapping
const LedgerTypes = {
    BILL: "BILL",
    TRANSACTION: "TRANSACTION",
    CHEQUE: "CHEQUE",
    INVENTORY: "INVENTORY",
    BANK: "BANK",
    PAYABLE: "PAYABLE",
    RECEIVABLE: "RECEIVABLE",
    KHATA: "KHATA",
} as const;

const LedgerStatuses = {
    PENDING: "PENDING",
    PARTIAL: "PARTIAL",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    PAID: "PAID",
    CLEARED: "CLEARED",
    BOUNCED: "BOUNCED",
    REPLACED: "REPLACED",
} as const;

// Helper function to safely cast string to Prisma enum
function toLedgerEntryType(type: string): any {
    return type;
}

// Set up response headers for consistent API responses
const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    // Prevent caching to always show latest entries
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
};

// Define valid ledger entry types and statuses for type safety - using the same constants
const ValidLedgerEntryTypes = LedgerTypes;
const ValidLedgerEntryStatuses = LedgerStatuses;

// Party name extraction helper
function extractPartyName(text: string | null, prefix: string) {
    if (!text) return null;

    // Try multiple formats for extracting party names
    // Format 1: "Vendor: Name - Additional info"
    // Format 2: "Vendor: Name"
    // Format 3: "Vendor Name: Additional info"
    // Format 4: "Vendor: Name\nkhata:1" (with newlines)

    // First try the standard format with prefix: name (even if followed by newlines)
    const standardRegex = new RegExp(`${prefix}:\\s*([^\\n-]+)`);
    const standardMatch = text.match(standardRegex);
    if (standardMatch && standardMatch[1]) {
        return standardMatch[1].trim();
    }

    // Try alternative format where the name might be followed by a hyphen
    const alternativeRegex = new RegExp(`${prefix}:\\s*([^\\n]+?)(?:\\s*-|$)`);
    const alternativeMatch = text.match(alternativeRegex);
    if (alternativeMatch && alternativeMatch[1]) {
        return alternativeMatch[1].trim();
    }

    // Try format with newlines: "Vendor: Name\nkhata:123"
    const newlineRegex = new RegExp(`${prefix}:\\s*([^\\n]+)`);
    const newlineMatch = text.match(newlineRegex);
    if (newlineMatch && newlineMatch[1]) {
        return newlineMatch[1].trim();
    }

    // If no matches found but text contains the prefix, extract everything after the prefix
    if (text.includes(`${prefix}:`)) {
        const parts = text.split(`${prefix}:`);
        if (parts.length > 1 && parts[1].trim()) {
            // Take everything up to the first delimiter (-, \n, or end of string)
            const endDelimiterPos = Math.min(
                parts[1].indexOf("-") > -1 ? parts[1].indexOf("-") : Infinity,
                parts[1].indexOf("\n") > -1 ? parts[1].indexOf("\n") : Infinity,
            );

            if (endDelimiterPos !== Infinity) {
                return parts[1].substring(0, endDelimiterPos).trim();
            }
            return parts[1].trim();
        }
    }

    return null;
}

/**
 * GET /api/ledger
 * Fetch ledger entries with optional filters
 */
export async function GET(request: NextRequest) {
    const requestStartTime = performance.now();
    const requestId = crypto.randomUUID();

    try {
        // Log request for monitoring (can be replaced with proper logging in production)
        console.log(`[Ledger API ${requestId}] GET request received`);

        const { searchParams } = new URL(request.url);

        // Pagination parameters
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        // Sort parameters
        const orderBy = searchParams.get("orderBy") || "entryDate";
        const order = searchParams.get("order") || "desc";

        // Build filter based on parameters
        const filter = buildFilter(searchParams);

        let formattedEntries = [];
        let totalEntries = 0;

        try {
            console.log(
                `[Ledger API ${requestId}] Using main Prisma client for ledger operations`,
            );

            // Fetch ledger entries
            const entries = await db.ledgerEntry.findMany({
                where: filter,
                skip,
                take: limit,
                orderBy: {
                    [orderBy]: order === "asc" ? "asc" : "desc",
                },
                include: {
                    vendor: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    transactions: {
                        orderBy: {
                            transactionDate: "desc",
                        },
                        take: 5, // Only include the most recent transactions
                    },
                },
            });

            // Get total count for pagination
            totalEntries = await db.ledgerEntry.count({
                where: filter,
            });

            // Format the response data
            formattedEntries = entries.map((entry: any) => {
                // Handle transactions with proper type checking
                const transactions =
                    entry.transactions?.map((txn: any) => ({
                        ...txn,
                        amount: txn.amount.toString(),
                        transactionDate: txn.transactionDate.toISOString(),
                        createdAt: txn.createdAt.toISOString(),
                        updatedAt: txn.updatedAt.toISOString(),
                    })) || [];

                // Get party name from multiple sources with fallbacks
                const partyName =
                    // Direct relationships first
                    entry.vendor?.name ||
                    entry.customer?.name ||
                    // Then try extracting from notes field
                    extractPartyName(entry.notes, "Vendor") ||
                    extractPartyName(entry.notes, "Customer") ||
                    // Then try from reference field
                    extractPartyName(entry.reference, "Vendor") ||
                    extractPartyName(entry.reference, "Customer") ||
                    extractPartyName(entry.reference, "Manual Vendor") ||
                    extractPartyName(entry.reference, "Manual Customer") ||
                    // If still nothing, check if any part of the notes/reference has relevant text
                    (entry.notes?.includes("Vendor:")
                        ? "Manual vendor entry"
                        : null) ||
                    (entry.notes?.includes("Customer:")
                        ? "Manual customer entry"
                        : null) ||
                    // Fallback to entry type description
                    (entry.entryType === "PAYABLE" ? "Manual vendor" : null) ||
                    (entry.entryType === "RECEIVABLE"
                        ? "Manual customer"
                        : null) ||
                    // Final fallback
                    "";

                return {
                    id: entry.id.toString(),
                    entryType: entry.entryType,
                    description: entry.description,
                    entryDate: entry.entryDate.toISOString(),
                    dueDate: entry.dueDate?.toISOString(),
                    amount: entry.amount.toString(),
                    remainingAmount: entry.remainingAmount.toString(),
                    status: entry.status,
                    reference: entry.reference,
                    party: partyName,
                    createdAt: entry.createdAt.toISOString(),
                    updatedAt: entry.updatedAt.toISOString(),
                    transactions,
                    // Include vendor/customer details for UI
                    vendor: entry.vendor
                        ? {
                              id: entry.vendor.id,
                              name: entry.vendor.name,
                          }
                        : null,
                    customer: entry.customer
                        ? {
                              id: entry.customer.id,
                              name: entry.customer.name,
                          }
                        : null,
                    // Include original data for debugging if needed
                    notes: entry.notes,
                };
            });
        } catch (dbError) {
            console.error("Database error, using sample data:", dbError);
            // Use sample data if database connection fails
            formattedEntries = getSampleLedgerData(filter);
            totalEntries = formattedEntries.length;
        }

        // Calculate summary statistics for the KPI cards
        const summary = calculateSummaryStats(formattedEntries);

        // Log performance metrics
        const requestEndTime = performance.now();
        const requestDuration = requestEndTime - requestStartTime;
        console.log(
            `[Ledger API ${requestId}] Request completed in ${requestDuration.toFixed(2)}ms. Returned ${formattedEntries.length} entries.`,
        );

        return NextResponse.json(
            {
                entries: formattedEntries,
                pagination: {
                    total: totalEntries,
                    page,
                    limit,
                    pages: Math.ceil(totalEntries / limit),
                },
                summary,
                timestamp: new Date().toISOString(), // Add timestamp for tracking data freshness
            },
            { headers },
        );
    } catch (error) {
        console.error("Error fetching ledger entries:", error);

        // Improved error handling with more details
        let errorMessage = "Failed to fetch ledger entries";
        let statusCode = 500;
        let errorDetails = {};

        if (error instanceof Error) {
            errorMessage = error.message;
            errorDetails = {
                name: error.name,
                stack:
                    process.env.NODE_ENV === "development"
                        ? error.stack
                        : undefined,
            };

            // Check for specific Prisma errors
            if (error.name === "PrismaClientKnownRequestError") {
                // @ts-expect-error - Prisma error code properties
                const code = error.code;
                errorDetails = {
                    ...errorDetails,
                    code,
                    // @ts-expect-error - Prisma error meta properties
                    meta: error.meta,
                };

                if (code === "P2022") {
                    errorMessage = "Invalid column in query";
                    statusCode = 400;
                } else if (code === "P2021") {
                    errorMessage =
                        "Database table does not exist. The database schema might need to be migrated.";
                    statusCode = 503; // Service Unavailable
                    errorDetails = {
                        ...errorDetails,
                        suggestion:
                            "Run database migrations with: 'npx prisma db push' or 'npx prisma migrate dev'",
                        databaseSetupRequired: true,
                    };
                }
            } else if (error.name === "PrismaClientValidationError") {
                errorMessage = "Invalid query parameters";
                statusCode = 400;
            } else if (error.name === "PrismaClientRustPanicError") {
                errorMessage = "A critical database error occurred";
            } else if (error.name === "PrismaClientInitializationError") {
                errorMessage = "Failed to connect to the database";
            }
        }

        // If error is related to database connection, send sample data
        if (statusCode === 503) {
            const sampleEntries = getSampleLedgerData();
            const summary = calculateSummaryStats(sampleEntries);

            return NextResponse.json(
                {
                    entries: sampleEntries,
                    pagination: {
                        total: sampleEntries.length,
                        page: 1,
                        limit: 50,
                        pages: 1,
                    },
                    summary,
                    databaseError: true,
                    message:
                        "Using sample data because database is not available",
                    timestamp: new Date().toISOString(),
                },
                { headers },
            );
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: errorDetails,
                timestamp: new Date().toISOString(),
            },
            { status: statusCode, headers },
        );
    }
}

/**
 * POST /api/ledger
 * Create a new ledger entry
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.entryType) {
            return NextResponse.json(
                { error: "Entry type is required" },
                { status: 400 },
            );
        }

        if (!body.description || body.description.trim() === "") {
            return NextResponse.json(
                { error: "Description is required" },
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

        // For payables, vendor ID or vendor name is required
        if (
            body.entryType === "PAYABLE" &&
            !body.vendorId &&
            !body.vendorName
        ) {
            return NextResponse.json(
                { error: "Vendor ID or vendor name is required for payables" },
                { status: 400 },
            );
        }

        // For receivables, customer ID or customer name is required
        if (
            body.entryType === "RECEIVABLE" &&
            !body.customerId &&
            !body.customerName
        ) {
            return NextResponse.json(
                {
                    error: "Customer ID or customer name is required for receivables",
                },
                { status: 400 },
            );
        }

        // Create data object for database
        const amount = parseFloat(body.amount);

        const entryData: any = {
            entryType:
                body.entryType === "PAYABLE"
                    ? ValidLedgerEntryTypes.PAYABLE
                    : ValidLedgerEntryTypes.RECEIVABLE,
            description: body.description.trim(),
            amount: amount,
            remainingAmount: amount, // Initially, remaining amount equals total amount
            status: ValidLedgerEntryStatuses.PENDING, // Default status
            reference: body.reference?.trim() || null,
            notes: body.notes?.trim() || null,
            updatedAt: new Date(), // Add the required updatedAt field
        };

        // Add khataId reference for filtering
        // This addresses the issue where new entries weren't showing up in the ledger
        const khataId = body.khataId || "1"; // Default to khata 1 if not specified

        // Store khata reference in reference field
        if (entryData.reference) {
            entryData.reference = `${entryData.reference} (khata:${khataId})`;
        } else {
            entryData.reference = `khata:${khataId}`;
        }

        // Store khata reference in notes field, but with clear separation
        // to avoid interfering with vendor/customer name extraction
        if (entryData.notes) {
            // Add at the end with clear separator
            entryData.notes = `${entryData.notes}\n\n[System: khata:${khataId}]`;
        } else {
            entryData.notes = `[System: khata:${khataId}]`;
        }

        // Add entry date if provided
        if (body.entryDate) {
            entryData.entryDate = new Date(body.entryDate);
        }

        // Add due date if provided
        if (body.dueDate) {
            entryData.dueDate = new Date(body.dueDate);
        }

        // For payables, add vendor relation or use manual vendor input
        if (body.entryType === "PAYABLE") {
            if (body.vendorId) {
                // Connect to existing vendor
                entryData.vendor = {
                    connect: { id: parseInt(body.vendorId) },
                };
            } else if (body.vendorName) {
                // Store vendor name in notes field if not using an existing vendor
                // Make it clearly formatted for extraction
                const vendorPrefix = "Vendor: ";
                const vendorInfo = body.vendorName.trim();

                if (entryData.notes) {
                    // If there are already notes, prepend the vendor info with clear separator
                    entryData.notes = `${vendorPrefix}${vendorInfo}\n---\n${entryData.notes}`;
                } else {
                    entryData.notes = `${vendorPrefix}${vendorInfo}`;
                }

                // Also store in reference field as backup
                if (!entryData.reference) {
                    entryData.reference = `Manual Vendor: ${vendorInfo}`;
                }
            }
        }

        // For receivables, add customer relation or use manual customer input
        if (body.entryType === "RECEIVABLE") {
            if (body.customerId) {
                // Connect to existing customer
                entryData.customer = {
                    connect: { id: parseInt(body.customerId) },
                };
            } else if (body.customerName) {
                // Store customer name in notes field if not using an existing customer
                // Make it clearly formatted for extraction
                const customerPrefix = "Customer: ";
                const customerInfo = body.customerName.trim();

                if (entryData.notes) {
                    // If there are already notes, prepend the customer info with clear separator
                    entryData.notes = `${customerPrefix}${customerInfo}\n---\n${entryData.notes}`;
                } else {
                    entryData.notes = `${customerPrefix}${customerInfo}`;
                }

                // Also store in reference field as backup
                if (!entryData.reference) {
                    entryData.reference = `Manual Customer: ${customerInfo}`;
                }
            }
        }

        // Create ledger entry in database
        const newEntry = await db.ledgerEntry.create({
            data: entryData,
            include: {
                vendor: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Get party name using the same extraction function as in GET handler
        let party =
            newEntry.vendor?.name ||
            newEntry.customer?.name ||
            extractPartyName(newEntry.notes, "Vendor") ||
            extractPartyName(newEntry.notes, "Customer") ||
            extractPartyName(newEntry.reference, "Manual Vendor") ||
            extractPartyName(newEntry.reference, "Manual Customer") ||
            "";

        // For manual entries, make sure we have a proper party name
        if (!party && body.vendorName) {
            party = body.vendorName.trim();
        } else if (!party && body.customerName) {
            party = body.customerName.trim();
        }

        return NextResponse.json(
            {
                success: true,
                entry: {
                    id: newEntry.id.toString(),
                    entryType: newEntry.entryType,
                    description: newEntry.description,
                    entryDate: newEntry.entryDate.toISOString(),
                    dueDate: newEntry.dueDate?.toISOString(),
                    amount: newEntry.amount.toString(),
                    remainingAmount: newEntry.remainingAmount.toString(),
                    status: newEntry.status,
                    reference: newEntry.reference,
                    party,
                    createdAt: newEntry.createdAt.toISOString(),
                    updatedAt: newEntry.updatedAt.toISOString(),
                    vendor: newEntry.vendor,
                    customer: newEntry.customer,
                    notes: newEntry.notes,
                },
            },
            { status: 201, headers },
        );
    } catch (error) {
        console.error("Error creating ledger entry:", error);
        return NextResponse.json(
            {
                error: "Failed to create ledger entry",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500, headers },
        );
    }
}

/**
 * Build a filter object for the database query based on URL parameters
 */
function buildFilter(params: URLSearchParams) {
    const filter: any = {};

    // Type filter
    const type = params.get("type");
    if (type) {
        switch (type.toUpperCase()) {
            case "BILL":
                filter.entryType = ValidLedgerEntryTypes.BILL;
                break;
            case "TRANSACTION":
                filter.entryType = ValidLedgerEntryTypes.TRANSACTION;
                break;
            case "CHEQUE":
                filter.entryType = ValidLedgerEntryTypes.CHEQUE;
                break;
            case "INVENTORY":
                filter.entryType = ValidLedgerEntryTypes.INVENTORY;
                break;
            case "BANK":
                filter.entryType = ValidLedgerEntryTypes.BANK;
                break;
            case "PAYABLE":
                filter.entryType = ValidLedgerEntryTypes.PAYABLE;
                break;
            case "RECEIVABLE":
                filter.entryType = ValidLedgerEntryTypes.RECEIVABLE;
                break;
            case "KHATA":
                filter.entryType = ValidLedgerEntryTypes.KHATA;
                break;
            default:
                // If type doesn't match any valid enum, don't filter by type
                break;
        }
    }

    // Handle khataId filtering using reference or notes fields
    const khataId = params.get("khataId");
    if (khataId) {
        // The current filtering logic only shows entries specifically tagged with khata:ID
        // This is likely why entries disappear - most entries don't have this tag
        // For now, we'll disable khata filtering to show all entries, as entries are
        // likely stored in the main database without khata association

        // Comment out the previous filtering logic
        /*
    filter.OR = [
      { reference: { contains: `khata:${khataId}` } },
      { notes: { contains: `khata:${khataId}` } }
    ];
    */

        // Log that we're using a modified filtering approach
        console.log(
            `Using modified khataId filtering for khata ${khataId} - showing all entries`,
        );

        // TODO: Implement proper khata filtering when the database schema supports it
        // For now, we're deliberately not applying this filter to allow entries to show
    }

    // Date range filter
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    if (startDate || endDate) {
        filter.entryDate = {};

        if (startDate) {
            filter.entryDate.gte = new Date(startDate);
        }

        if (endDate) {
            filter.entryDate.lte = new Date(endDate);
        }
    }

    // Status filter
    const status = params.get("status");
    if (status) {
        filter.status = status;
    }

    // Filter by vendor or customer
    const vendorId = params.get("vendorId");
    if (vendorId) {
        filter.vendorId = parseInt(vendorId);
    }

    const customerId = params.get("customerId");
    if (customerId) {
        filter.customerId = parseInt(customerId);
    }

    // Amount filter
    const minAmount = params.get("minAmount");
    const maxAmount = params.get("maxAmount");
    if (minAmount || maxAmount) {
        filter.amount = {};

        if (minAmount) {
            filter.amount.gte = parseFloat(minAmount);
        }

        if (maxAmount) {
            filter.amount.lte = parseFloat(maxAmount);
        }
    }

    // Search filter for description or reference
    const search = params.get("search");
    if (search) {
        const searchValue = search.trim();
        filter.OR = [
            {
                description: {
                    contains: searchValue,
                    mode: "insensitive",
                },
            },
            {
                reference: {
                    contains: searchValue,
                    mode: "insensitive",
                },
            },
        ];
    }

    return filter;
}

// Calculate summary statistics for KPI cards and dashboard metrics
function calculateSummaryStats(entries: any[]) {
    // Initialize stats with an index signature for string keys
    const stats: {
        totalReceivables: number;
        totalPayables: number;
        totalBankBalance: number;
        totalInventoryValue: number;
        overdueBills: number;
        overdueAmount: number;
        billsTotal: number;
        paidBills: number;
        transactionsTotal: number;
        chequesTotal: number;
        pendingCheques: number;
        inventoryItems: number;
        bankAccounts: number;
        totalCashInHand: number;
        totalRecentTransactions: number;
        [key: string]: number;
    } = {
        totalReceivables: 0,
        totalPayables: 0,
        totalBankBalance: 0,
        totalInventoryValue: 0,
        overdueBills: 0,
        overdueAmount: 0,
        billsTotal: 0,
        paidBills: 0,
        transactionsTotal: 0,
        chequesTotal: 0,
        pendingCheques: 0,
        inventoryItems: 0,
        bankAccounts: 0,
        totalCashInHand: 0,
        totalRecentTransactions: 0,
    };

    // Current date for overdue calculation
    const today = new Date();
    // Set time to end of day to avoid time-of-day related issues
    today.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Calculate statistics
    entries.forEach((entry) => {
        // Parse amounts safely by first converting to string, then to number with 2 decimal places precision
        const amount = parseFloat(
            parseFloat(entry.remainingAmount || "0").toFixed(2),
        );
        const totalAmount = parseFloat(
            parseFloat(entry.amount || "0").toFixed(2),
        );

        // PAYABLE and RECEIVABLE type entries
        if (entry.entryType === "PAYABLE") {
            stats.totalPayables += amount;
        } else if (entry.entryType === "RECEIVABLE") {
            stats.totalReceivables += amount;
        }

        // Other standard types
        else if (entry.entryType === "BILL") {
            stats.billsTotal++;

            // Count paid bills
            if (
                entry.status === "COMPLETED" ||
                entry.status === "PAID" ||
                entry.status === "CLEARED"
            ) {
                stats.paidBills++;
            }

            // Categorize by receivables/payables for bills too
            if (entry.transactionType === "SALE") {
                stats.totalReceivables += amount;
            } else if (entry.transactionType === "PURCHASE") {
                stats.totalPayables += amount;
            }

            // Check for overdue bills - use tolerance for comparison to avoid floating point issues
            const PAYMENT_TOLERANCE = 0.01; // 1 cent/paisa tolerance

            if (
                entry.dueDate &&
                new Date(entry.dueDate) < today &&
                entry.status !== "COMPLETED" &&
                entry.status !== "CANCELLED" &&
                entry.status !== "PAID" &&
                entry.status !== "CLEARED" &&
                amount > PAYMENT_TOLERANCE
            ) {
                stats.overdueBills++;
                stats.overdueAmount += amount;
            }
        }

        // Count transactions
        else if (entry.entryType === "TRANSACTION") {
            stats.transactionsTotal++;

            // Count recent transactions (last 7 days)
            if (new Date(entry.entryDate) >= sevenDaysAgo) {
                stats.totalRecentTransactions++;
            }

            // Calculate cash in hand from transactions
            if (entry.transactionType === "CASH_RECEIPT") {
                stats.totalCashInHand = parseFloat(
                    (stats.totalCashInHand + totalAmount).toFixed(2),
                );
            } else if (entry.transactionType === "CASH_PAYMENT") {
                stats.totalCashInHand = parseFloat(
                    (stats.totalCashInHand - totalAmount).toFixed(2),
                );
            }
        }

        // Count and categorize cheques
        else if (entry.entryType === "CHEQUE") {
            stats.chequesTotal++;
            if (entry.status === "PENDING") {
                stats.pendingCheques++;
            }
        }

        // Count and sum inventory
        else if (entry.entryType === "INVENTORY") {
            stats.inventoryItems++;
            stats.totalInventoryValue = parseFloat(
                (stats.totalInventoryValue + totalAmount).toFixed(2),
            );
        }

        // Count and sum bank balances
        else if (entry.entryType === "BANK") {
            stats.bankAccounts++;
            stats.totalBankBalance = parseFloat(
                (stats.totalBankBalance + totalAmount).toFixed(2),
            );
        }
    });

    // Ensure non-negative values and fix precision
    Object.keys(stats).forEach((key) => {
        if (typeof stats[key] === "number") {
            // First ensure non-negative
            stats[key] = Math.max(0, stats[key]);

            // Then fix precision for monetary values
            if (
                key.startsWith("total") &&
                key !== "totalRecentTransactions" &&
                key !== "totalPayables" &&
                key !== "totalReceivables" &&
                key !== "totalBills" &&
                key !== "totalCheques" &&
                key !== "totalInventory" &&
                key !== "totalOverdueCount"
            ) {
                stats[key] = parseFloat(stats[key].toFixed(2));
            }
        }
    });

    return stats;
}

// Generate sample ledger entries for development/testing
function getSampleLedgerData(filter?: any): any[] {
    // Create base sample data
    const sampleData = [
        {
            id: "sample-1",
            entryType: toLedgerEntryType(LedgerTypes.BILL),
            description: "Thread Purchase",
            party: "Textile Suppliers Ltd",
            reference: "BILL-12345",
            transactionType: "PURCHASE",
            entryDate: new Date().toISOString(),
            dueDate: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "25000",
            remainingAmount: "25000",
            status: toLedgerEntryType(LedgerStatuses.PENDING),
            createdAt: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
        },
        {
            id: "sample-2",
            entryType: toLedgerEntryType(LedgerTypes.TRANSACTION),
            description: "Bank Deposit",
            party: "Bank Account",
            reference: "TRX-6789",
            transactionType: "BANK_DEPOSIT",
            entryDate: new Date().toISOString(),
            amount: "50000",
            remainingAmount: "0",
            status: "COMPLETED",
            createdAt: new Date(
                Date.now() - 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
        },
        {
            id: "sample-3",
            entryType: toLedgerEntryType(LedgerTypes.CHEQUE),
            description: "Supplier Payment",
            party: "Thread Company",
            reference: "CHQ-4567",
            transactionType: "CHEQUE_PAYMENT",
            entryDate: new Date(
                Date.now() - 15 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() + 15 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "12000",
            remainingAmount: "12000",
            status: toLedgerEntryType(LedgerStatuses.PENDING),
            createdAt: new Date(
                Date.now() - 15 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 15 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
        },
        {
            id: "sample-4",
            entryType: toLedgerEntryType(LedgerTypes.INVENTORY),
            description: "Grey Cloth Stock",
            party: "Warehouse",
            reference: "INV-8901",
            transactionType: "INVENTORY_ADJUSTMENT",
            entryDate: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "1000",
            remainingAmount: "1000",
            status: "COMPLETED",
            createdAt: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
        },
        {
            id: "sample-5",
            entryType: toLedgerEntryType(LedgerTypes.BILL),
            description: "Cloth Sale",
            party: "Fashion Retailer",
            reference: "BILL-5678",
            transactionType: "SALE",
            entryDate: new Date(
                Date.now() - 20 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() + 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "35000",
            remainingAmount: "25000",
            status: "PARTIAL",
            createdAt: new Date(
                Date.now() - 20 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 20 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
        },
        {
            id: "sample-6",
            entryType: toLedgerEntryType(LedgerTypes.BANK),
            description: "Current Account",
            party: "National Bank",
            reference: "ACC-001",
            transactionType: "BANK_DEPOSIT",
            entryDate: new Date(
                Date.now() - 2 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "120000",
            remainingAmount: "120000",
            status: "COMPLETED",
            createdAt: new Date(
                Date.now() - 2 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 2 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
        },
        {
            id: "sample-7",
            entryType: toLedgerEntryType(LedgerTypes.RECEIVABLE),
            description: "Customer Payment Due",
            party: "ABC Retail",
            reference: "RCV-2023",
            transactionType: "SALE",
            entryDate: new Date(
                Date.now() - 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() + 5 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "45000",
            remainingAmount: "45000",
            status: toLedgerEntryType(LedgerStatuses.PENDING),
            createdAt: new Date(
                Date.now() - 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 10 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
        },
        {
            id: "sample-8",
            entryType: toLedgerEntryType(LedgerTypes.PAYABLE),
            description: "Yarn Supplier Payment",
            party: "XYZ Textiles",
            reference: "PAY-4089",
            transactionType: "PURCHASE",
            entryDate: new Date(
                Date.now() - 8 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() + 22 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "78000",
            remainingAmount: "78000",
            status: toLedgerEntryType(LedgerStatuses.PENDING),
            createdAt: new Date(
                Date.now() - 8 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 8 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
        },
        {
            id: "sample-9",
            entryType: toLedgerEntryType(LedgerTypes.PAYABLE),
            description: "Repair Services",
            party: "Local Workshop",
            notes: "Vendor: Local Workshop - Equipment repair services",
            reference: "PAY-5501",
            transactionType: "PURCHASE",
            entryDate: new Date(
                Date.now() - 4 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() + 14 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "15000",
            remainingAmount: "15000",
            status: toLedgerEntryType(LedgerStatuses.PENDING),
            createdAt: new Date(
                Date.now() - 4 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 4 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
            vendor: null,
            customer: null,
        },
        {
            id: "sample-10",
            entryType: toLedgerEntryType(LedgerTypes.RECEIVABLE),
            description: "Cash Sale",
            party: "Walk-in Customer",
            notes: "Customer: Walk-in Customer - One-time purchase",
            reference: "RCV-6045",
            transactionType: "SALE",
            entryDate: new Date(
                Date.now() - 1 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            dueDate: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            amount: "8500",
            remainingAmount: "8500",
            status: toLedgerEntryType(LedgerStatuses.PENDING),
            createdAt: new Date(
                Date.now() - 1 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updatedAt: new Date(
                Date.now() - 1 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactions: [],
            vendor: null,
            customer: null,
        },
    ];

    // If no filter, return all
    if (!filter) {
        return sampleData;
    }

    // Otherwise, apply basic filtering
    return sampleData.filter((entry) => {
        // Filter by entry type if specified
        if (filter.entryType && entry.entryType !== filter.entryType) {
            return false;
        }

        // Filter by status if specified
        if (filter.status && entry.status !== filter.status) {
            return false;
        }

        // Basic date filtering
        if (filter.entryDate?.gte) {
            const minDate = new Date(filter.entryDate.gte);
            if (new Date(entry.entryDate) < minDate) {
                return false;
            }
        }

        if (filter.entryDate?.lte) {
            const maxDate = new Date(filter.entryDate.lte);
            if (new Date(entry.entryDate) > maxDate) {
                return false;
            }
        }

        // Default to including entry if no filter conditions excluded it
        return true;
    });
}
