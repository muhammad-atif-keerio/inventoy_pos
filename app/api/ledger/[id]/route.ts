/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

import { ledgerDb, safelyFetchLedgerEntry } from "@/app/lib/ledger-db";
import { Decimal } from "@/types/prismaTypes";

import { calculateRemainingAmount } from "../utils";

// Set up response headers for consistent API responses
const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Define interface for transaction
interface LedgerTransaction {
    id: number;
    amount: Decimal;
    transactionDate: Date;
    chequeNumber?: string | null;
    bankName?: string | null;
    referenceNumber?: string | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    transactionType: string;
}

// GET /api/ledger/:id - Get a specific ledger entry with transactions
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    let ledgerDbConnected = false;
    try {
        const { id } = await params;

        // If it's a composite ID (type:id), extract the parts
        let entryId = id;
        let entryType = null;

        if (id.includes(":")) {
            const parts = id.split(":");
            entryType = parts[0];
            entryId = parts[1];
        }

        // Track connection status
        let connectionError = null;
        try {
            await ledgerDb.$connect();
            ledgerDbConnected = true;
        } catch (connError: any) {
            connectionError = connError;
            console.error("Error connecting to ledger database:", connError);
            // Continue execution and try with regular db or fallback data
        }

        // Fetch the entry based on its type
        let entry;
        let transactions: LedgerTransaction[] = [];

        // First, try to find a direct ledger entry by ID
        try {
            const ledgerEntry = await db.ledgerEntry.findUnique({
                where: { id: parseInt(entryId) },
                include: {
                    vendor: {
                        select: { id: true, name: true },
                    },
                    customer: {
                        select: { id: true, name: true },
                    },
                    transactions: {
                        orderBy: { transactionDate: "desc" },
                    },
                },
            });

            if (ledgerEntry) {
                // Format the ledger entry properly
                const partyName =
                    ledgerEntry.vendor?.name ||
                    ledgerEntry.customer?.name ||
                    "Unknown";

                entry = {
                    id: ledgerEntry.id.toString(),
                    entryType: ledgerEntry.entryType,
                    description: ledgerEntry.description,
                    party: partyName,
                    partyId: ledgerEntry.vendor?.id || ledgerEntry.customer?.id,
                    reference: ledgerEntry.reference,
                    transactionType: (ledgerEntry as any).transactionType || null,
                    entryDate: ledgerEntry.entryDate.toISOString(),
                    dueDate: ledgerEntry.dueDate?.toISOString() || null,
                    amount: ledgerEntry.amount.toString(),
                    remainingAmount: ledgerEntry.remainingAmount.toString(),
                    status: ledgerEntry.status,
                    notes: ledgerEntry.notes,
                    // Add displayEntryType for consistent UI display
                    displayEntryType:
                        ledgerEntry.entryType === "BILL" &&
                        (ledgerEntry as any).transactionType
                            ? (
                                  ledgerEntry as any
                              ).transactionType?.toUpperCase() === "SALE"
                                ? "RECEIVABLE"
                                : "PAYABLE"
                            : ledgerEntry.entryType,
                };

                if (ledgerEntry.transactions?.length) {
                    transactions =
                        ledgerEntry.transactions as unknown as LedgerTransaction[];
                }
            }
        } catch (dbError) {
            console.error("Error fetching from main database:", dbError);
            // Continue to next option
        }

        // If no direct ledger entry found and ledger DB is connected, try to find a bill with this ID
        if (!entry && (ledgerDbConnected || process.env.NODE_ENV !== "production")) {
            try {
                if (entryType === "bill" || !entryType) {
                    // Use the new safer method to fetch a bill
                    const bill = await safelyFetchLedgerEntry('bill', parseInt(entryId), {
                        include: {
                            party: true,
                            transactions: {
                                orderBy: { transactionDate: "desc" },
                            },
                        },
                        useCache: false,
                        errorCallback: (error) => {
                            console.warn(`Error fetching bill with ID ${entryId} using safelyFetchLedgerEntry:`, error);
                        }
                    });

                    if (bill) {
                        // Get party name with fallbacks
                        let partyName = "Unknown";
                        if ((bill as any).party?.name) {
                            partyName = (bill as any).party.name;
                        } else if ((bill as any).description) {
                            // Try to extract party info from notes with more comprehensive patterns
                            const vendorMatch = (bill as any).description.match(
                                /Vendor[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                            );
                            const customerMatch = (bill as any).description.match(
                                /Customer[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                            );
                            const partyMatch = (bill as any).description.match(
                                /Party[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                            );

                            if (vendorMatch && vendorMatch[1]) {
                                partyName = vendorMatch[1].trim();
                            } else if (customerMatch && customerMatch[1]) {
                                partyName = customerMatch[1].trim();
                            } else if (partyMatch && partyMatch[1]) {
                                partyName = partyMatch[1].trim();
                            }
                        }

                        // Format as a ledger entry
                        entry = {
                            id: `bill:${(bill as any).id}`,
                            entryType: "BILL",
                            description: `Bill #${(bill as any).billNumber}`,
                            party: partyName,
                            partyId: (bill as any).partyId,
                            reference: (bill as any).billNumber,
                            transactionType: (bill as any).billType,
                            entryDate: (bill as any).billDate.toISOString(),
                            dueDate: (bill as any).dueDate?.toISOString() || null,
                            amount: (bill as any).amount.toString(),
                            remainingAmount: calculateRemainingAmount(
                                (bill as any).amount,
                                (bill as any).paidAmount,
                            ).toString(),
                            status: (bill as any).status,
                            notes: (bill as any).description,
                            transactions:
                                (bill as any).transactions?.map(
                                    (t: {
                                        id: number;
                                        amount: any;
                                        transactionDate: Date;
                                        description: string;
                                        transactionType: string;
                                    }) => ({
                                        id: t.id,
                                        amount: t.amount.toString(),
                                        transactionDate:
                                            t.transactionDate.toISOString(),
                                        description: t.description,
                                        transactionType: t.transactionType,
                                    }),
                                ) || [],
                            // Add displayEntryType for consistent UI display
                            displayEntryType:
                                (bill as any).billType === "SALE" ? "RECEIVABLE" : "PAYABLE",
                            // Preserve the mock entry flag if it exists
                            isMockEntry: (bill as any).isMockEntry || false
                        };

                        transactions = ((bill as any).transactions ||
                            []) as unknown as LedgerTransaction[];
                    }
                }
            } catch (billError: any) {
                console.error("Error fetching from ledger database:", billError);
                // Continue to fallback options
            }
        }

        // If we still don't have an entry and we're in development mode
        // provide a mock entry to avoid UI breaking
        if (!entry && process.env.NODE_ENV !== "production") {
            console.log(`Creating mock entry for non-existent ID: ${id}`);
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            
            entry = {
                id: entryId,
                entryType: entryType?.toUpperCase() || "BILL",
                description: `Mock ledger entry for ${entryId}`,
                party: "Mock Party",
                partyId: null,
                reference: `REF-${entryId}`,
                transactionType: "PURCHASE",
                entryDate: yesterday.toISOString(),
                dueDate: now.toISOString(),
                amount: "1000.00",
                remainingAmount: "1000.00",
                status: "PENDING",
                notes: "This is a mock entry created for development purposes.",
                displayEntryType: "PAYABLE",
                isMockEntry: true // Flag to identify mock entries
            };
            
            transactions = [];
        }

        // If no entry was found, even with fallbacks
        if (!entry) {
            // Generate a more descriptive error message
            let errorMessage = "Ledger entry not found";
            
            if (connectionError) {
                errorMessage += ". Database connection error occurred.";
            }
            
            return NextResponse.json(
                { 
                    error: errorMessage,
                    entryId,
                    entryType
                },
                { status: 404 },
            );
        }

        // Log the entry being returned for debugging
        console.log("API returning entry:", {
            id: entry.id,
            entryType: entry.entryType,
            transactionType: entry.transactionType,
            isMockEntry: entry.isMockEntry || false
        });

        // Return the entry
        return NextResponse.json({ entry, transactions });
    } catch (error: any) {
        console.error("Error fetching ledger entry:", error);
        return NextResponse.json(
            { error: "Failed to fetch ledger entry", details: error.message },
            { status: 500 },
        );
    } finally {
        if (ledgerDbConnected) {
            try {
                await ledgerDb.$disconnect();
            } catch (error) {
                console.error("Error disconnecting from ledger database:", error);
            }
        }
    }
}

// PATCH /api/ledger/:id - Update a ledger entry
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const data = await request.json();

        // If it's a composite ID (type:id), extract the parts
        let entryId = id;
        let entryType = null;

        if (id.includes(":")) {
            const parts = id.split(":");
            entryType = parts[0];
            entryId = parts[1];
        }

        // Connect to the database
        await ledgerDb.$connect();

        let updatedEntry;

        // If it's a bill
        if (entryType === "bill" || !entryType) {
            // Try to update a bill with this ID
            updatedEntry = await ledgerDb.bill.update({
                where: { id: parseInt(entryId) },
                data: {
                    status: data.status,
                    updatedAt: new Date(),
                },
                include: {
                    party: true,
                },
            });

            if (updatedEntry) {
                // Get party name with fallbacks
                let partyName = "Unknown";
                if (updatedEntry.party?.name) {
                    partyName = updatedEntry.party.name;
                } else if (updatedEntry.description) {
                    // Try to extract party info from notes with more comprehensive patterns
                    const vendorMatch = updatedEntry.description.match(
                        /Vendor[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                    );
                    const customerMatch = updatedEntry.description.match(
                        /Customer[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                    );
                    const partyMatch = updatedEntry.description.match(
                        /Party[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                    );

                    if (vendorMatch && vendorMatch[1]) {
                        partyName = vendorMatch[1].trim();
                    } else if (customerMatch && customerMatch[1]) {
                        partyName = customerMatch[1].trim();
                    } else if (partyMatch && partyMatch[1]) {
                        partyName = partyMatch[1].trim();
                    }
                }

                // Format as a ledger entry
                updatedEntry = {
                    id: `bill:${updatedEntry.id}`,
                    entryType: "BILL",
                    description: `Bill #${updatedEntry.billNumber}`,
                    party: partyName,
                    partyId: updatedEntry.partyId,
                    reference: updatedEntry.billNumber,
                    transactionType: updatedEntry.billType,
                    entryDate: updatedEntry.billDate.toISOString(),
                    dueDate: updatedEntry.dueDate?.toISOString() || null,
                    amount: updatedEntry.amount.toString(),
                    remainingAmount: calculateRemainingAmount(
                        updatedEntry.amount,
                        updatedEntry.paidAmount,
                    ).toString(),
                    status: updatedEntry.status,
                    notes: updatedEntry.description,
                    // Add displayEntryType for consistent UI display
                    displayEntryType:
                        updatedEntry.billType === "SALE"
                            ? "RECEIVABLE"
                            : "PAYABLE",
                };
            }
        }

        // If no entry was updated
        if (!updatedEntry) {
            return NextResponse.json(
                { error: "Ledger entry not found or could not be updated" },
                { status: 404 },
            );
        }

        // Return the updated entry
        return NextResponse.json({ entry: updatedEntry });
    } catch (error: any) {
        console.error("Error updating ledger entry:", error);
        return NextResponse.json(
            { error: "Failed to update ledger entry", details: error.message },
            { status: 500 },
        );
    } finally {
        await ledgerDb.$disconnect();
    }
}

// DELETE /api/ledger/:id - Delete a ledger entry
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        // If it's a composite ID (type:id), extract the parts
        let entryId = id;
        let entryType = null;

        if (id.includes(":")) {
            const parts = id.split(":");
            entryType = parts[0];
            entryId = parts[1];
        }

        // Check if it's a valid ID
        const numId = parseInt(entryId);
        if (isNaN(numId)) {
            return NextResponse.json(
                { error: "Invalid ID format" },
                { status: 400 },
            );
        }

        if (entryType === "bill") {
            await ledgerDb.$connect();

            try {
                // Check if the bill exists
                const bill = await ledgerDb.bill.findUnique({
                    where: { id: numId },
                    include: {
                        transactions: {
                            select: { id: true },
                        },
                    },
                });

                if (!bill) {
                    return NextResponse.json(
                        { error: "Bill not found" },
                        { status: 404 },
                    );
                }

                if (bill.transactions && bill.transactions.length > 0) {
                    return NextResponse.json(
                        {
                            error: "Cannot delete a bill with transactions. Cancel it instead.",
                        },
                        { status: 400 },
                    );
                }

                // Delete the bill
                await ledgerDb.bill.delete({
                    where: { id: numId },
                });

                return NextResponse.json({ success: true }, { headers });
            } finally {
                await ledgerDb.$disconnect();
            }
        } else {
            // Regular ledger entry
            // Check if the entry exists and has no transactions
            const entry = await db.ledgerEntry.findUnique({
                where: { id: numId },
                include: {
                    transactions: {
                        select: { id: true },
                    },
                },
            });

            if (!entry) {
                return NextResponse.json(
                    { error: "Ledger entry not found" },
                    { status: 404 },
                );
            }

            if (entry.transactions.length > 0) {
                return NextResponse.json(
                    {
                        error: "Cannot delete an entry with transactions. Cancel it instead.",
                    },
                    { status: 400 },
                );
            }

            // Delete the entry
            await db.ledgerEntry.delete({
                where: { id: numId },
            });

            return NextResponse.json({ success: true }, { headers });
        }
    } catch (error) {
        console.error("Error deleting ledger entry:", error);
        return NextResponse.json(
            {
                error: "Failed to delete ledger entry",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
