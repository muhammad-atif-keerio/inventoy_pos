/* eslint-disable @typescript-eslint/no-explicit-any */
import { ledgerDb } from "@/app/lib/ledger-db";
import { BillStatus } from "@/app/lib/ledger-db";

// Common API response headers
export const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Define a consistent payment tolerance across the system
// Using 0.01 (1 cent/paisa) as the standard tolerance for payment completion checks
export const PAYMENT_TOLERANCE = 0.01;

/**
 * Calculate the correct remaining amount for a bill after a payment
 * to ensure accuracy across the system
 */
export function calculateRemainingAmount(
    total: number | string,
    paid: number | string,
): number {
    // Ensure values are treated as numbers with correct precision
    const numTotal = typeof total === "string" ? parseFloat(total) : total;
    const numPaid = typeof paid === "string" ? parseFloat(paid) : paid;

    // Handle NaN cases
    if (isNaN(numTotal) || isNaN(numPaid)) {
        console.error("Invalid values in calculateRemainingAmount:", {
            total,
            paid,
        });
        return isNaN(numTotal) ? 0 : numTotal;
    }

    // Convert to integers (paise/cents) to avoid floating point issues
    const totalPaise = Math.round(numTotal * 100);
    const paidPaise = Math.round(numPaid * 100);
    const remainingPaise = totalPaise - paidPaise;

    // Convert back to rupees with 2 decimal places
    const remaining = remainingPaise / 100;

    // Use the standard tolerance for zero comparison
    if (Math.abs(remaining) <= PAYMENT_TOLERANCE) {
        return 0;
    }

    // Ensure we never return negative values (payments shouldn't exceed bill amount)
    // And round to 2 decimal places to avoid tiny floating point imprecisions
    return Math.max(0, Math.round(remaining * 100) / 100);
}

// Extract ID and type from a composite ID like "bill:123"
export function parseCompositeId(id: string): {
    entryType: string | null;
    entryId: string;
} {
    let entryId = id;
    let entryType = null;

    if (id.includes(":")) {
        const parts = id.split(":");
        entryType = parts[0].toLowerCase();
        entryId = parts[1];
    }

    return { entryType, entryId };
}

// Format a bill object to a ledger entry
export function formatBillAsLedgerEntry(bill: any): any {
    if (!bill) return null;

    try {
        // Ensure proper number formatting for amount calculations
        const billAmount =
            typeof bill.amount === "string"
                ? parseFloat(bill.amount)
                : bill.amount && typeof bill.amount.toNumber === "function"
                  ? bill.amount.toNumber()
                  : Number(bill.amount);

        const billPaidAmount =
            typeof bill.paidAmount === "string"
                ? parseFloat(bill.paidAmount)
                : bill.paidAmount &&
                    typeof bill.paidAmount.toNumber === "function"
                  ? bill.paidAmount.toNumber()
                  : Number(bill.paidAmount);

        // Calculate remaining with our enhanced function
        const remainingAmount = calculateRemainingAmount(
            billAmount,
            billPaidAmount,
        );

        // Add debug logging for troubleshooting
        console.log("Bill amounts:", {
            id: bill.id,
            billAmount,
            billPaidAmount,
            remainingAmount,
            originalAmount: bill.amount,
            originalPaidAmount: bill.paidAmount,
        });

        return {
            id: `bill:${bill.id}`,
            entryType: "BILL",
            description: `Bill #${bill.billNumber}`,
            party: bill.party?.name || "Unknown",
            partyId: bill.partyId,
            reference: bill.billNumber,
            transactionType: bill.billType,
            entryDate: bill.billDate.toISOString(),
            dueDate: bill.dueDate?.toISOString() || null,
            amount:
                typeof billAmount === "number"
                    ? billAmount.toFixed(2)
                    : String(billAmount),
            paidAmount:
                typeof billPaidAmount === "number"
                    ? billPaidAmount.toFixed(2)
                    : String(billPaidAmount),
            remainingAmount: remainingAmount.toFixed(2),
            status: bill.status,
            notes: bill.description,
            transactions:
                bill.transactions?.map((t: any) => ({
                    id: t.id,
                    amount:
                        typeof t.amount === "number"
                            ? t.amount.toFixed(2)
                            : t.amount &&
                                typeof t.amount.toNumber === "function"
                              ? t.amount.toNumber().toFixed(2)
                              : String(t.amount),
                    transactionDate: t.transactionDate.toISOString(),
                    description: t.description,
                    transactionType: t.transactionType,
                    paymentMode: t.paymentMode,
                })) || [],
        };
    } catch (error) {
        console.error("Error in formatBillAsLedgerEntry:", error, {
            billId: bill?.id,
        });
        // Return a minimal valid object in case of error
        return {
            id: bill?.id ? `bill:${bill.id}` : "unknown",
            entryType: "BILL",
            description: bill?.billNumber
                ? `Bill #${bill.billNumber}`
                : "Error processing bill",
            party: bill?.party?.name || "Unknown",
            amount: "0.00",
            paidAmount: "0.00",
            remainingAmount: "0.00",
            status: bill?.status || "PENDING",
        };
    }
}

// Add a transaction to a bill and update its status
export async function addTransactionToBill(
    billId: number,
    transactionData: any,
    transactionAmount: number,
): Promise<any> {
    try {
        // Get the bill
        const bill = await ledgerDb.bill.findUnique({
            where: { id: billId },
            include: {
                party: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!bill) {
            return {
                success: false,
                error: "Bill not found",
                status: 404,
            };
        }

        // Ensure we're working with precise numbers by rounding to 2 decimal places
        const billAmount = Math.round(Number(bill.amount) * 100) / 100;
        const billPaidAmount = Math.round(Number(bill.paidAmount) * 100) / 100;
        const safeTransactionAmount = Math.round(transactionAmount * 100) / 100;

        // Check if the transaction amount exceeds the remaining amount
        const remainingAmount = calculateRemainingAmount(
            billAmount,
            billPaidAmount,
        );

        if (safeTransactionAmount > remainingAmount) {
            return {
                success: false,
                error: "Transaction amount cannot exceed the remaining amount",
                remainingAmount: remainingAmount.toString(),
                status: 400,
            };
        }

        // Create the transaction
        const newTransaction = await ledgerDb.transaction.create({
            data: transactionData,
        });

        // Update the bill's paid amount and status
        const newPaidAmount = parseFloat(
            (billPaidAmount + safeTransactionAmount).toFixed(2),
        );
        let newStatus = bill.status;

        // Use improved remaining amount calculation with proper rounding
        const newRemainingAmount = calculateRemainingAmount(
            billAmount,
            newPaidAmount,
        );

        // Better status determination using the standardized tolerance constant
        if (newRemainingAmount <= PAYMENT_TOLERANCE) {
            // If remaining amount is zero or very close to zero, consider the bill fully paid
            newStatus = BillStatus.PAID;
        } else if (newPaidAmount > PAYMENT_TOLERANCE) {
            // If some payment has been made, but not full, mark as partial
            newStatus = BillStatus.PARTIAL;
        } else {
            // If no payment made, keep as pending
            newStatus = BillStatus.PENDING;
        }

        const updatedBill = await ledgerDb.bill.update({
            where: { id: bill.id },
            data: {
                // Ensure we store exact 2 decimal precision
                paidAmount: parseFloat(newPaidAmount.toFixed(2)),
                status: newStatus,
            },
            include: {
                party: true,
            },
        });

        return {
            success: true,
            transaction: newTransaction,
            updatedEntry: formatBillAsLedgerEntry(updatedBill),
        };
    } catch (error: any) {
        console.error("Error processing bill payment:", error);
        return {
            success: false,
            error: "Failed to process bill payment",
            details: error.message,
            status: 500,
        };
    }
}

// Helper function to format dates and numbers to string in API responses
export function formatResponse(data: any): any {
    if (!data) return null;

    if (typeof data !== "object") {
        // Format numbers with fixed decimal places if needed
        if (typeof data === "number") {
            // Format monetary values with exactly 2 decimal places for consistency
            if (
                data % 1 !== 0 ||
                data > 100000 ||
                isMonetaryKey(data.toString())
            ) {
                // Round to avoid floating point precision issues
                return (Math.round(data * 100) / 100).toFixed(2);
            }
        }
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => formatResponse(item));
    }

    const formatted: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        if (value instanceof Date) {
            formatted[key] = value.toISOString();
        } else if (typeof value === "object" && value !== null) {
            if ("toNumber" in value && typeof value.toNumber === "function") {
                // Handle Prisma Decimal - always use 2 decimal places for consistency
                try {
                    const numValue = value.toNumber();
                    // Round to avoid floating point precision issues
                    formatted[key] = (Math.round(numValue * 100) / 100).toFixed(
                        2,
                    );
                } catch (error) {
                    console.error(
                        `Error converting decimal value for key ${key}:`,
                        error,
                    );
                    formatted[key] = "0.00"; // Safe fallback
                }
            } else {
                formatted[key] = formatResponse(value);
            }
        } else if (typeof value === "number" && isMonetaryKey(key)) {
            // Ensure monetary values have consistent decimal places and precision
            // Round to avoid floating point precision issues
            formatted[key] = (Math.round(value * 100) / 100).toFixed(2);
        } else {
            formatted[key] = value;
        }
    }

    return formatted;
}

// Helper function to identify monetary value keys
function isMonetaryKey(key: string): boolean {
    const monetaryKeys = [
        "amount",
        "price",
        "total",
        "balance",
        "cost",
        "paid",
        "remaining",
        "value",
        "paidAmount",
        "remainingAmount",
    ];

    return monetaryKeys.some((monetaryKey) =>
        key.toLowerCase().includes(monetaryKey.toLowerCase()),
    );
}
