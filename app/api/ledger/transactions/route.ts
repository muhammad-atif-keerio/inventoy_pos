/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

import { ledgerDb } from "@/app/lib/ledger-db";

import {
    PAYMENT_TOLERANCE,
    calculateRemainingAmount as calcRemaining,
} from "../utils";

// Define our own PaymentMode enum since it might not be exported from @prisma/client
enum PaymentMode {
    CASH = "CASH",
    CHEQUE = "CHEQUE",
    ONLINE = "ONLINE",
}

// Define BillStatus enum for consistency
enum BillStatus {
    PENDING = "PENDING",
    PARTIAL = "PARTIAL",
    PAID = "PAID",
    CANCELLED = "CANCELLED",
}

// Define interface for transaction data
interface TransactionData {
    ledgerEntryId: number | string;
    amount: number;
    paymentMode: PaymentMode;
    notes: string | null;
    referenceNumber: string | null;
    transactionDate?: Date;
    chequeNumber?: string;
    bankName?: string;
    updatedAt: Date;
}

/**
 * POST /api/ledger/transactions
 *
 * Records a payment or receipt for a ledger entry.
 *
 * @body {object} request body
 * @body {number} ledgerEntryId - ID of the ledger entry
 * @body {string} amount - Amount to be paid/received
 * @body {string} paymentMode - Payment method (CASH, CHEQUE, ONLINE)
 * @body {string} [transactionDate] - Date of transaction (defaults to current date)
 * @body {string} [chequeNumber] - Required for CHEQUE payment mode
 * @body {string} [bankName] - Bank name for CHEQUE payment mode
 * @body {string} [referenceNumber] - Optional reference number
 * @body {string} [notes] - Optional notes about the transaction
 *
 * @returns {object} JSON response
 * @returns {boolean} success - Indicates if the transaction was successful
 * @returns {object} transaction - The created transaction details
 * @returns {object} updatedEntry - The updated ledger entry with new remaining amount
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields and format error responses for better UX
        if (!body.ledgerEntryId) {
            return NextResponse.json(
                {
                    error: "Ledger entry ID is required",
                    field: "ledgerEntryId",
                },
                { status: 400 },
            );
        }

        if (
            !body.amount ||
            isNaN(parseFloat(body.amount)) ||
            parseFloat(body.amount) <= 0
        ) {
            return NextResponse.json(
                {
                    error: "Valid amount is required",
                    field: "amount",
                    message: "Please enter a positive number",
                },
                { status: 400 },
            );
        }

        if (!body.paymentMode) {
            return NextResponse.json(
                {
                    error: "Payment mode is required",
                    field: "paymentMode",
                },
                { status: 400 },
            );
        }

        // Validate that paymentMode is a valid enum value
        const validPaymentModes = Object.values(PaymentMode);
        if (!validPaymentModes.includes(body.paymentMode)) {
            return NextResponse.json(
                {
                    error: "Invalid payment mode",
                    validPaymentModes,
                },
                { status: 400 },
            );
        }

        // Parse and validate the amount for better precision
        const transactionAmount = parseFloat(
            parseFloat(body.amount).toFixed(2),
        );
        if (isNaN(transactionAmount) || transactionAmount <= 0) {
            return NextResponse.json(
                {
                    error: "Invalid transaction amount",
                    details: "Amount must be a positive number",
                    received: body.amount,
                },
                { status: 400 },
            );
        }

        // Check if it's a composite ID (bill:id)
        let entryId = body.ledgerEntryId;
        let entryType = null;

        if (typeof entryId === "string" && entryId.includes(":")) {
            const parts = entryId.split(":");
            entryType = parts[0].toLowerCase();
            entryId = parseInt(parts[1]);
        } else if (typeof entryId === "string") {
            entryId = parseInt(entryId);
        }

        if (isNaN(entryId)) {
            return NextResponse.json(
                { error: "Invalid ledger entry ID format" },
                { status: 400 },
            );
        }

        // Handle bill payments
        if (entryType === "bill") {
            await ledgerDb.$connect();
            try {
                // Fetch the bill entry
                const bill = await ledgerDb.bill.findUnique({
                    where: { id: entryId },
                    include: {
                        party: {
                            select: { id: true, name: true },
                        },
                    },
                });

                if (!bill) {
                    return NextResponse.json(
                        { error: "Bill not found" },
                        { status: 404 },
                    );
                }

                // Check if the transaction amount exceeds the remaining amount
                const billAmount = parseFloat(String(bill.amount));
                const billPaidAmount = parseFloat(String(bill.paidAmount));

                // Use enhanced calculation function for more accuracy
                const remainingAmount = calcRemaining(
                    billAmount,
                    billPaidAmount,
                );

                // Debug info for troubleshooting
                console.log("Transaction validation:", {
                    billAmount,
                    billPaidAmount,
                    remainingAmount: remainingAmount,
                    transactionAmount,
                    exceedsRemaining: transactionAmount > remainingAmount,
                    paymentMode: body.paymentMode,
                    billStatus: bill.status,
                });

                // Compare with a small tolerance to account for floating point errors
                if (transactionAmount > remainingAmount + 0.005) {
                    return NextResponse.json(
                        {
                            error: "Transaction amount cannot exceed the remaining amount",
                            remainingAmount: remainingAmount.toFixed(2),
                            billAmount: billAmount.toFixed(2),
                            billPaidAmount: billPaidAmount.toFixed(2),
                            transactionAmount: transactionAmount.toFixed(2),
                            difference: (
                                transactionAmount - remainingAmount
                            ).toFixed(2),
                        },
                        { status: 400 },
                    );
                }

                // Create the transaction data
                const transactionData = {
                    billId: bill.id,
                    khataId: bill.khataId,
                    partyId: bill.partyId,
                    amount: transactionAmount,
                    description:
                        bill.billType === "PURCHASE"
                            ? "Payment for purchase"
                            : "Receipt for sale",
                    transactionType:
                        bill.billType === "PURCHASE"
                            ? "CASH_PAYMENT"
                            : "CASH_RECEIPT",
                    transactionDate: body.transactionDate
                        ? new Date(body.transactionDate)
                        : new Date(),
                    paymentMode: body.paymentMode,
                    notes: null,
                    referenceNumber: body.referenceNumber || null,
                    chequeNumber:
                        body.paymentMode === "CHEQUE"
                            ? body.chequeNumber
                            : null,
                    bankName:
                        body.paymentMode === "CHEQUE" ? body.bankName : null,
                };

                // Add notes with party information if available
                let partyName = "";
                if (bill.party?.name) {
                    partyName = bill.party.name;
                } else if (bill.description) {
                    // Try to extract party info from notes with more comprehensive patterns
                    const vendorMatch = bill.description.match(
                        /Vendor[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                    );
                    const customerMatch = bill.description.match(
                        /Customer[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                    );
                    const partyMatch = bill.description.match(
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

                let notes = body.notes || "";

                // Add party information
                if (partyName) {
                    notes = notes
                        ? `${notes}\nParty: ${partyName}`
                        : `Party: ${partyName}`;
                }

                // Add bill reference
                notes = notes
                    ? `${notes}\nBill: #${bill.billNumber}`
                    : `Bill: #${bill.billNumber}`;

                // Add transaction type (payment or receipt)
                const transactionType =
                    bill.billType === "PURCHASE" ? "Payment" : "Receipt";
                notes = notes
                    ? `${notes}\nType: ${transactionType}`
                    : `Type: ${transactionType}`;

                transactionData.notes = notes;

                // Create the transaction
                const newTransaction = await ledgerDb.transaction.create({
                    data: transactionData,
                });

                // Update the bill's paid amount and status
                // Use precise rounding for payment addition to avoid floating point errors
                const newPaidAmountRaw = billPaidAmount + transactionAmount;
                // Round to 2 decimal places to avoid floating point issues
                const newPaidAmount = Math.round(newPaidAmountRaw * 100) / 100;
                const billStatus = bill.status as unknown as string;
                let newStatus = billStatus;

                // Use improved remaining amount calculation to determine status
                const newRemainingAmount = calcRemaining(
                    billAmount,
                    newPaidAmount,
                );

                // Debug logging for paid amounts
                console.log("Payment calculation:", {
                    billAmount,
                    originalPaidAmount: billPaidAmount,
                    transactionAmount,
                    newPaidAmount,
                    newRemainingAmount,
                    paymentMode: body.paymentMode,
                });

                // More accurate status determination with proper threshold
                // Use the imported PAYMENT_TOLERANCE constant for consistency
                if (
                    newRemainingAmount === 0 ||
                    newRemainingAmount <= PAYMENT_TOLERANCE
                ) {
                    newStatus = BillStatus.PAID;
                } else if (newPaidAmount > PAYMENT_TOLERANCE) {
                    newStatus = BillStatus.PARTIAL;
                } else {
                    newStatus = BillStatus.PENDING;
                }

                const updatedBill = await ledgerDb.bill.update({
                    where: { id: bill.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus as any,
                    },
                    include: {
                        party: true,
                    },
                });

                // Create a formatted entry with correctly calculated values
                const formattedEntry = {
                    id: `bill:${updatedBill.id}`,
                    entryType: "BILL",
                    description: `Bill #${updatedBill.billNumber}`,
                    party: updatedBill.party?.name || "Unknown",
                    partyId: updatedBill.partyId,
                    reference: updatedBill.billNumber,
                    transactionType: updatedBill.billType,
                    entryDate: updatedBill.billDate.toISOString(),
                    dueDate: updatedBill.dueDate?.toISOString() || null,
                    amount: billAmount.toFixed(2),
                    // Calculate with newly updated bill's paidAmount for consistency
                    paidAmount: newPaidAmount.toFixed(2),
                    remainingAmount: newRemainingAmount.toFixed(2),
                    status: updatedBill.status,
                };

                return NextResponse.json({
                    success: true,
                    transaction: {
                        ...newTransaction,
                        amount: transactionAmount.toFixed(2),
                        transactionDate:
                            newTransaction.transactionDate.toISOString(),
                        createdAt: newTransaction.createdAt.toISOString(),
                        updatedAt: newTransaction.updatedAt.toISOString(),
                        paymentMode: body.paymentMode,
                    },
                    updatedEntry: formattedEntry,
                });
            } catch (error: any) {
                console.error("Error processing bill payment:", error);
                return NextResponse.json(
                    {
                        error: "Failed to process bill payment",
                        details: error.message,
                    },
                    { status: 500 },
                );
            } finally {
                await ledgerDb.$disconnect();
            }
        }

        // Handle regular ledger entries
        // Fetch the ledger entry to check the remaining amount
        const ledgerEntry = await db.ledgerEntry.findUnique({
            where: { id: entryId },
            include: {
                vendor: {
                    select: { id: true, name: true },
                },
                customer: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!ledgerEntry) {
            return NextResponse.json(
                { error: "Ledger entry not found" },
                { status: 404 },
            );
        }

        // Check if the transaction amount exceeds the remaining amount
        const entryAmount =
            typeof ledgerEntry.amount === "object" &&
            ledgerEntry.amount !== null &&
            "toNumber" in ledgerEntry.amount
                ? ledgerEntry.amount.toNumber()
                : parseFloat(String(ledgerEntry.amount));
        const entryRemainingAmount =
            typeof ledgerEntry.remainingAmount === "object" &&
            ledgerEntry.remainingAmount !== null &&
            "toNumber" in ledgerEntry.remainingAmount
                ? ledgerEntry.remainingAmount.toNumber()
                : parseFloat(String(ledgerEntry.remainingAmount));

        // Debug info for troubleshooting
        console.log("Ledger entry validation:", {
            entryAmount,
            entryRemainingAmount,
            transactionAmount,
            exceedsRemaining: transactionAmount > entryRemainingAmount,
            paymentMode: body.paymentMode,
        });

        // Use the accurate comparison with a small tolerance for floating point issues
        // 0.005 is half a cent, which handles most floating point rounding errors
        if (transactionAmount > entryRemainingAmount + 0.005) {
            return NextResponse.json(
                {
                    error: "Transaction amount cannot exceed the remaining amount",
                    remainingAmount: entryRemainingAmount.toFixed(2),
                    transactionAmount: transactionAmount.toFixed(2),
                    difference: (
                        transactionAmount - entryRemainingAmount
                    ).toFixed(2),
                },
                { status: 400 },
            );
        }

        // Determine party name for transaction notes
        let partyName = "";
        try {
            if (ledgerEntry.vendor?.name) {
                partyName = ledgerEntry.vendor.name;
            } else if (ledgerEntry.customer?.name) {
                partyName = ledgerEntry.customer.name;
            } else if (ledgerEntry.notes) {
                // Try to extract party info from notes with more comprehensive patterns
                const vendorMatch = ledgerEntry.notes.match(
                    /Vendor[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                );
                const customerMatch = ledgerEntry.notes.match(
                    /Customer[:|\s]+([\w\s\.,&-]+?)(?:\n|$)/i,
                );
                const partyMatch = ledgerEntry.notes.match(
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
        } catch (error) {
            console.error("Error extracting party name:", error);
            // Continue with empty party name
        }

        // Create the transaction
        const transactionData: TransactionData = {
            ledgerEntryId: entryId,
            amount: transactionAmount,
            paymentMode: body.paymentMode as PaymentMode,
            notes: body.notes?.trim() || null,
            referenceNumber: body.referenceNumber?.trim() || null,
            chequeNumber: undefined,
            bankName: undefined,
            updatedAt: new Date(),
        };

        // Add transaction date if provided
        if (body.transactionDate) {
            transactionData.transactionDate = new Date(body.transactionDate);
        }

        // Add cheque details if payment mode is CHEQUE
        if (body.paymentMode === PaymentMode.CHEQUE) {
            if (!body.chequeNumber || body.chequeNumber.trim() === "") {
                return NextResponse.json(
                    {
                        error: "Cheque number is required for cheque payments",
                        field: "chequeNumber",
                    },
                    { status: 400 },
                );
            }

            if (!body.bankName || body.bankName.trim() === "") {
                return NextResponse.json(
                    {
                        error: "Bank name is required for cheque payments",
                        field: "bankName",
                    },
                    { status: 400 },
                );
            }

            transactionData.chequeNumber = body.chequeNumber.trim();
            transactionData.bankName = body.bankName.trim();
        }

        // Add party information to transaction notes if available
        if (partyName) {
            if (transactionData.notes) {
                transactionData.notes = `${transactionData.notes}\nParty: ${partyName}`;
            } else {
                transactionData.notes = `Party: ${partyName}`;
            }
        }

        // Add transaction type to notes (payment or receipt)
        const transactionType =
            ledgerEntry.entryType === "PAYABLE" ? "Payment" : "Receipt";
        if (transactionData.notes) {
            transactionData.notes = `${transactionData.notes}\nType: ${transactionType}`;
        } else {
            transactionData.notes = `Type: ${transactionType}`;
        }

        // Use transaction to ensure data consistency
        const newTransaction = await db.ledgerTransaction.create({
            data: transactionData as any,
        });

        // Update the ledger entry's remaining amount and status
        const newRemainingAmount = Math.max(
            0,
            parseFloat((entryRemainingAmount - transactionAmount).toFixed(2)),
        );
        let newStatus = ledgerEntry.status;

        // Debug payment calculation
        console.log("Ledger payment calculation:", {
            entryAmount,
            entryRemainingAmount,
            transactionAmount,
            newRemainingAmount,
        });

        // Better status determination logic with precise thresholds
        // Use PAYMENT_TOLERANCE constant from utils.ts for consistency
        if (newRemainingAmount <= PAYMENT_TOLERANCE) {
            newStatus = "COMPLETED";
        } else if (newRemainingAmount < entryAmount) {
            newStatus = "PARTIAL";
        } else {
            newStatus = "PENDING";
        }

        const updatedEntry = await db.ledgerEntry.update({
            where: { id: ledgerEntry.id },
            data: {
                remainingAmount: newRemainingAmount,
                status: newStatus,
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
            },
        });

        return NextResponse.json({
            success: true,
            transaction: {
                ...newTransaction,
                amount: transactionAmount.toFixed(2),
                transactionDate: newTransaction.transactionDate.toISOString(),
                createdAt: newTransaction.createdAt.toISOString(),
                updatedAt: newTransaction.updatedAt.toISOString(),
                paymentMode: body.paymentMode,
            },
            updatedEntry: {
                ...updatedEntry,
                amount: entryAmount.toFixed(2),
                remainingAmount: newRemainingAmount.toFixed(2),
                entryDate: updatedEntry.entryDate.toISOString(),
                dueDate: updatedEntry.dueDate?.toISOString() || null,
                createdAt: updatedEntry.createdAt.toISOString(),
                updatedAt: updatedEntry.updatedAt.toISOString(),
            },
        });
    } catch (error: any) {
        console.error("Error recording transaction:", error);
        return NextResponse.json(
            { error: "Failed to record transaction", details: error.message },
            { status: 500 },
        );
    }
}
