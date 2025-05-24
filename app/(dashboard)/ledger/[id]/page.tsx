"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import React from "react";

import { format } from "date-fns";
import {
    CalendarDays,
    ChevronLeft,
    CircleDollarSign,
    FilePenLine,
    Loader2,
    Tags,
    Wallet,
    X,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { LedgerEntryRow } from "@/app/lib/types";

import { formatCurrency } from "../columns";

// Use a Record type to specify the index signature
const statusColorMap: Record<string, string> = {
    PENDING: "bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30",
    PARTIAL: "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30",
    COMPLETED: "bg-green-500/20 text-green-600 hover:bg-green-500/30",
    CANCELLED: "bg-red-500/20 text-red-600 hover:bg-red-500/30",
    PAID: "bg-green-500/20 text-green-600 hover:bg-green-500/30",
    CLEARED: "bg-green-500/20 text-green-600 hover:bg-green-500/30",
    BOUNCED: "bg-red-500/20 text-red-600 hover:bg-red-500/30",
    REPLACED: "bg-purple-500/20 text-purple-600 hover:bg-purple-500/30",
};

// Type badge color mapping with index signature
const typeColorMap: Record<string, string> = {
    PAYABLE: "bg-orange-500/20 text-orange-600 hover:bg-orange-500/30",
    RECEIVABLE: "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30",
    BILL: "bg-slate-500/20 text-slate-600 hover:bg-slate-500/30",
    TRANSACTION: "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30",
    CHEQUE: "bg-purple-500/20 text-purple-600 hover:bg-purple-500/30",
    INVENTORY: "bg-teal-500/20 text-teal-600 hover:bg-teal-500/30",
    BANK: "bg-indigo-500/20 text-indigo-600 hover:bg-indigo-500/30",
};

interface Transaction {
    id: number;
    ledgerEntryId: number;
    transactionDate: string;
    amount: string;
    paymentMode: "CASH" | "CHEQUE" | "ONLINE";
    chequeNumber?: string;
    bankName?: string;
    referenceNumber?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// Add helper function to format transaction details
const formatTransactionType = (paymentMode: string) => {
    switch (paymentMode) {
        case "CASH":
            return "Cash Payment";
        case "CHEQUE":
            return "Cheque Payment";
        case "ONLINE":
            return "Online Transfer";
        default:
            return paymentMode;
    }
};

// Helper function to extract manual vendor/customer name from notes
const extractPartyNameFromNotes = (
    notes: string | null | undefined,
): string | null => {
    if (!notes) return null;

    // Try multiple formats for extracting party names
    // Format 1: "Vendor: Name - Additional info"
    // Format 2: "Vendor: Name"
    // Format 3: "Vendor: Name\nkhata:1" (with newlines)

    // First try to extract vendor name
    if (notes.includes("Vendor:")) {
        // Standard format with prefix: name (even if followed by newlines)
        const standardRegex = /Vendor:\s*([^\n-]+)/;
        const standardMatch = notes.match(standardRegex);
        if (standardMatch && standardMatch[1]) return standardMatch[1].trim();

        // Alternative format where the name might be followed by a hyphen
        const alternativeRegex = /Vendor:\s*([^\n]+?)(?:\s*-|$)/;
        const alternativeMatch = notes.match(alternativeRegex);
        if (alternativeMatch && alternativeMatch[1])
            return alternativeMatch[1].trim();

        // If no matches found but text contains the prefix, extract everything after the prefix
        const parts = notes.split("Vendor:");
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

    // If not vendor, try to extract customer name with the same patterns
    if (notes.includes("Customer:")) {
        // Standard format with prefix: name (even if followed by newlines)
        const standardRegex = /Customer:\s*([^\n-]+)/;
        const standardMatch = notes.match(standardRegex);
        if (standardMatch && standardMatch[1]) return standardMatch[1].trim();

        // Alternative format where the name might be followed by a hyphen
        const alternativeRegex = /Customer:\s*([^\n]+?)(?:\s*-|$)/;
        const alternativeMatch = notes.match(alternativeRegex);
        if (alternativeMatch && alternativeMatch[1])
            return alternativeMatch[1].trim();

        // If no matches found but text contains the prefix, extract everything after the prefix
        const parts = notes.split("Customer:");
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
};

// Extended type for LedgerEntryRow with our runtime-added properties
interface ExtendedLedgerEntryRow extends LedgerEntryRow {
    displayEntryType?: string;
}

export default function LedgerEntryPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [entry, setEntry] = useState<ExtendedLedgerEntryRow | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    // Fetch the ledger entry
    const fetchLedgerEntry = async () => {
        if (!id) return;

        setIsLoading(true);
        try {
            // Use cache-busting URL parameter and headers to prevent stale data
            const timestamp = new Date().getTime();
            const response = await fetch(
                `/api/ledger/${id}?refresh=${timestamp}`,
                {
                    method: "GET",
                    headers: {
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                        Expires: "0",
                        "X-Refresh-Timestamp": timestamp.toString(),
                    },
                    cache: "no-store",
                    next: { revalidate: 0 },
                },
            );

            if (!response.ok) {
                if (response.status === 404) {
                    const errorData = await response.json();
                    const errorMessage = errorData.error || "Ledger entry not found";
                    
                    toast.error(errorMessage, {
                        description: "The requested ledger entry could not be found or has been deleted.",
                        duration: 5000,
                    });
                    
                    // Wait a moment before redirecting to allow the user to read the toast
                    setTimeout(() => {
                        router.push("/ledger");
                    }, 1500);
                    return;
                }
                throw new Error("Failed to fetch ledger entry");
            }

            const data = await response.json();
            const entryData = data.entry;

            // Check if this is a mock entry from our API fallback
            const isMockEntry = entryData.isMockEntry === true;
            if (isMockEntry && process.env.NODE_ENV !== "production") {
                toast.warning("Using mock data", {
                    description: "The actual ledger entry was not found, showing fallback data for development.",
                    duration: 5000,
                });
            }

            // For debugging data inconsistencies
            console.log("Loaded entry data:", {
                id: entryData.id,
                amount: entryData.amount,
                remainingAmount: entryData.remainingAmount,
                status: entryData.status,
                entryType: entryData.entryType,
                transactionType: entryData.transactionType,
                isMockEntry: isMockEntry || false
            });

            // Validate and fix possible data inconsistencies
            if (entryData.amount && entryData.remainingAmount) {
                // Parse values ensuring they're proper numbers
                const amount = parseFloat(
                    typeof entryData.amount === "string"
                        ? entryData.amount
                        : entryData.amount.toString(),
                );
                const remainingAmount = parseFloat(
                    typeof entryData.remainingAmount === "string"
                        ? entryData.remainingAmount
                        : entryData.remainingAmount.toString(),
                );

                // Fix remaining amount if it's greater than the total amount (shouldn't happen)
                if (remainingAmount > amount + 0.005) {
                    console.warn(
                        `Data inconsistency: Remaining amount (${remainingAmount}) greater than total (${amount}). Fixing...`,
                    );
                    entryData.remainingAmount = entryData.amount;
                }

                // Fix status if paid in full but not marked complete
                if (
                    remainingAmount < 0.005 &&
                    entryData.status !== "COMPLETED" &&
                    entryData.status !== "PAID" &&
                    entryData.status !== "CANCELLED"
                ) {
                    console.warn(
                        `Data inconsistency: Entry paid in full but status is ${entryData.status}. Should be COMPLETED/PAID.`,
                    );
                    entryData.status =
                        entryData.entryType === "BILL" ? "PAID" : "COMPLETED";
                }

                // Fix status if it shows PAID but has remaining balance
                if (
                    (entryData.status === "PAID" ||
                        entryData.status === "COMPLETED") &&
                    remainingAmount > 0.005
                ) {
                    console.warn(
                        `Data inconsistency: Entry marked as ${entryData.status} but has remaining balance of ${remainingAmount}. Fixing status...`,
                    );
                    entryData.status =
                        remainingAmount < amount ? "PARTIAL" : "PENDING";
                }
            }

            // Normalize entry type to match what's shown in the list view
            if (entryData.entryType === "BILL") {
                console.log(
                    "Bill transaction type:",
                    entryData.transactionType,
                );

                // Ensure we're checking for both SALE/PURCHASE and case variations
                const transactionType =
                    entryData.transactionType?.toUpperCase();

                if (transactionType === "SALE") {
                    entryData.displayEntryType = "RECEIVABLE";
                } else if (transactionType === "PURCHASE") {
                    entryData.displayEntryType = "PAYABLE";
                } else {
                    // Default for unknown bill types
                    entryData.displayEntryType = entryData.entryType;
                }

                console.log(
                    `Set display type for bill to: ${entryData.displayEntryType}`,
                );
            } else {
                // Respect the original entry type for non-BILL entries
                entryData.displayEntryType = entryData.entryType;
                console.log(
                    `Using original entry type: ${entryData.entryType}`,
                );
            }

            // Log the entry type assignment for debugging
            console.log("Entry type assignment:", {
                originalType: entryData.entryType,
                transactionType: entryData.transactionType,
                assignedDisplayType: entryData.displayEntryType,
            });

            // If party name is missing but notes contains vendor/customer info, extract it
            if (
                (!entryData.party ||
                    entryData.party === "Unknown" ||
                    entryData.party === "") &&
                entryData.notes
            ) {
                const extractedParty = extractPartyNameFromNotes(
                    entryData.notes,
                );
                if (extractedParty) {
                    entryData.party = extractedParty;
                }
            }

            // If still no party name, set a default based on entry type
            if (
                !entryData.party ||
                entryData.party === "Unknown" ||
                entryData.party === ""
            ) {
                if (
                    entryData.entryType === "PAYABLE" ||
                    (entryData.entryType === "BILL" &&
                        entryData.transactionType === "PURCHASE")
                ) {
                    entryData.party = "Manual Vendor";
                } else if (
                    entryData.entryType === "RECEIVABLE" ||
                    (entryData.entryType === "BILL" &&
                        entryData.transactionType === "SALE")
                ) {
                    entryData.party = "Manual Customer";
                }
            }

            // Format transactions if they exist
            if (data.transactions) {
                setTransactions(data.transactions);
            } else if (entryData.transactions) {
                setTransactions(entryData.transactions);
            } else {
                setTransactions([]);
            }

            setEntry(entryData);
        } catch (error) {
            console.error("Error fetching ledger entry:", error);

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to load ledger entry details";
            
            toast.error("Error loading entry", {
                description: errorMessage,
                id: "ledger-entry-fetch-error", // Prevent duplicate toasts
                duration: 5000,
            });

            // Show a sample entry if in development mode
            if (process.env.NODE_ENV !== "production") {
                console.log(
                    "[Ledger] Using sample entry data in development mode",
                );
                setEntry({
                    id: id,
                    entryType: "PAYABLE",
                    displayEntryType: "PAYABLE",
                    description: "Sample Entry (Connection Issue)",
                    party: "Sample Vendor",
                    reference: "SAMPLE-REF",
                    transactionType: "PURCHASE",
                    entryDate: new Date().toISOString(),
                    dueDate: new Date(
                        Date.now() + 30 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                    amount: "15000",
                    remainingAmount: "10000",
                    status: "PARTIAL",
                });

                setTransactions([
                    {
                        id: 1,
                        ledgerEntryId: parseInt(id as string),
                        transactionDate: new Date(
                            Date.now() - 5 * 24 * 60 * 60 * 1000,
                        ).toISOString(),
                        amount: "5000",
                        paymentMode: "CASH",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                ]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Cancel the entry
    const handleCancelEntry = async () => {
        if (!entry || !id) return;

        setIsCancelling(true);
        try {
            const response = await fetch(`/api/ledger/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: "CANCELLED",
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to cancel entry");
            }

            const data = await response.json();
            setEntry(data.entry);
            toast.success("Ledger entry cancelled successfully");
        } catch (error) {
            console.error("Error cancelling entry:", error);
            toast.error("Failed to cancel entry");
        } finally {
            setIsCancelling(false);
        }
    };

    // Load data on initial render
    useEffect(() => {
        if (id) {
            fetchLedgerEntry();
        }

        // Add listener for returning from payment page
        const handleFocus = () => {
            console.log("[Ledger Detail] Window refocused, refreshing data...");
            fetchLedgerEntry();
        };

        // Set up event listener to refresh data when the page regains focus
        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("focus", handleFocus);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="container flex items-center justify-center py-10">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                    <p className="text-muted-foreground">
                        Loading entry details...
                    </p>
                </div>
            </div>
        );
    }

    // Handle entry not found
    if (!entry) {
        return (
            <div className="container py-10">
                <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Ledger entry not found or has been deleted.
                    </AlertDescription>
                </Alert>
                <div className="mt-4 flex justify-center">
                    <Button asChild>
                        <Link href="/ledger">Return to Ledger</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Improve the payment button to be more prominent and display proper text based on entry type
    const renderPaymentButton = () => {
        // Don't show payment button for entries that are completed or cancelled
        if (entry.status === "COMPLETED" || entry.status === "CANCELLED") {
            return null;
        }

        // Don't show payment button for entries without remaining amount
        if (parseFloat(entry.remainingAmount) <= 0) {
            return null;
        }

        const isPayable = getDisplayEntryType(entry) === "PAYABLE";
        const isReceivable = getDisplayEntryType(entry) === "RECEIVABLE";

        const buttonText = isPayable
            ? "Record Payment"
            : isReceivable
              ? "Record Receipt"
              : "Record Transaction";

        return (
            <Button asChild className="w-full">
                <Link href={`/ledger/${entry.id}/payment`}>
                    <Wallet className="mr-2 h-4 w-4" />
                    {buttonText}
                </Link>
            </Button>
        );
    };

    // Helper function to get the display entry type based on entry data
    function getDisplayEntryType(entry: ExtendedLedgerEntryRow): string {
        // If entry already has a displayEntryType property, use it
        if (entry.displayEntryType) {
            return entry.displayEntryType;
        }

        // For RECEIVABLE or PAYABLE entries, respect the original entry type
        if (entry.entryType === "RECEIVABLE" || entry.entryType === "PAYABLE") {
            return entry.entryType;
        }

        // For BILL entries, determine based on transaction type
        if (entry.entryType === "BILL") {
            // Ensure consistent case handling for transaction type
            const transactionType = entry.transactionType?.toUpperCase();

            if (transactionType === "SALE") {
                return "RECEIVABLE";
            } else if (transactionType === "PURCHASE") {
                return "PAYABLE";
            }
        }

        // Default to original entry type if no special handling needed
        return entry.entryType;
    }

    return (
        <div className="container max-w-5xl space-y-6 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                    >
                        <Link href="/ledger">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {getDisplayEntryType(entry) === "PAYABLE"
                                ? "Payable"
                                : getDisplayEntryType(entry) === "RECEIVABLE"
                                  ? "Receivable"
                                  : entry.entryType}{" "}
                            Details
                        </h1>
                        <p className="text-muted-foreground">
                            {entry.description}
                            {entry.reference && ` • Ref: ${entry.reference}`}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    {renderPaymentButton()}

                    {entry.status !== "CANCELLED" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCancelDialog(true)}
                            className="text-destructive hover:text-destructive"
                            disabled={isCancelling}
                        >
                            {isCancelling ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <X className="mr-2 h-4 w-4" />
                            )}
                            Cancel Entry
                        </Button>
                    )}
                </div>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CircleDollarSign className="text-muted-foreground h-4 w-4" />
                            Financial Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">
                                    Type
                                </p>
                                <Badge
                                    variant="outline"
                                    className={
                                        typeColorMap[
                                            getDisplayEntryType(entry)
                                        ] || typeColorMap.BILL
                                    }
                                >
                                    {getDisplayEntryType(entry)}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">
                                    Status
                                </p>
                                <Badge
                                    variant="outline"
                                    className={statusColorMap[entry.status]}
                                >
                                    {entry.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">
                                    Total Amount
                                </p>
                                <p className="text-lg font-semibold">
                                    {formatCurrency(entry.amount)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">
                                    Remaining
                                </p>
                                <p className="text-lg font-semibold">
                                    {formatCurrency(entry.remainingAmount)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Tags className="text-muted-foreground h-4 w-4" />
                            Additional Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <p className="text-muted-foreground text-sm font-medium">
                                    {getDisplayEntryType(entry) === "PAYABLE"
                                        ? "Vendor"
                                        : "Customer"}
                                </p>
                                <p className="font-medium">
                                    {entry.vendor
                                        ? entry.vendor.name
                                        : entry.customer
                                          ? entry.customer.name
                                          : entry.manualPartyName ||
                                            extractPartyNameFromNotes(
                                                entry.notes,
                                            ) ||
                                            entry.party ||
                                            "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">
                                    Entry Date
                                </p>
                                <p className="font-medium">
                                    {format(new Date(entry.entryDate), "PPP")}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">
                                    Due Date
                                </p>
                                <p className="font-medium">
                                    {entry.dueDate
                                        ? format(new Date(entry.dueDate), "PPP")
                                        : "Not specified"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {entry.notes && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FilePenLine className="text-muted-foreground h-4 w-4" />
                            Notes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-line">{entry.notes}</p>
                    </CardContent>
                </Card>
            )}

            {/* Transactions Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">
                        {getDisplayEntryType(entry) === "PAYABLE"
                            ? "Payments"
                            : "Receipts"}
                    </h2>
                    {entry.status !== "COMPLETED" &&
                        entry.status !== "CANCELLED" && (
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/ledger/${entry.id}/payment`}>
                                    <Wallet className="mr-2 h-4 w-4" />
                                    Add{" "}
                                    {getDisplayEntryType(entry) === "PAYABLE"
                                        ? "Payment"
                                        : "Receipt"}
                                </Link>
                            </Button>
                        )}
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FilePenLine className="text-muted-foreground h-4 w-4" />
                            Transactions History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">
                                        Amount
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Notes
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-muted-foreground py-6 text-center"
                                        >
                                            No transactions recorded yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((transaction) => {
                                        // Extract additional information from transaction notes
                                        let partyInfo = "";
                                        if (
                                            transaction.notes &&
                                            transaction.notes.includes("Party:")
                                        ) {
                                            const match =
                                                transaction.notes.match(
                                                    /Party:\s*([^\n]+)/,
                                                );
                                            if (match && match[1]) {
                                                partyInfo = match[1].trim();
                                            }
                                        }

                                        return (
                                            <TableRow key={transaction.id}>
                                                <TableCell className="font-medium">
                                                    {formatTransactionType(
                                                        transaction.paymentMode,
                                                    )}
                                                    {transaction.paymentMode ===
                                                        "CHEQUE" &&
                                                        transaction.chequeNumber && (
                                                            <div className="text-muted-foreground mt-1 text-xs">
                                                                Cheque:{" "}
                                                                {
                                                                    transaction.chequeNumber
                                                                }
                                                                {transaction.bankName &&
                                                                    ` (${transaction.bankName})`}
                                                            </div>
                                                        )}
                                                </TableCell>
                                                <TableCell>
                                                    {format(
                                                        new Date(
                                                            transaction.transactionDate,
                                                        ),
                                                        "PP",
                                                    )}
                                                    {transaction.referenceNumber && (
                                                        <div className="text-muted-foreground mt-1 text-xs">
                                                            Ref:{" "}
                                                            {
                                                                transaction.referenceNumber
                                                            }
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(
                                                        parseFloat(
                                                            transaction.amount,
                                                        ),
                                                    )}
                                                    {partyInfo && (
                                                        <div className="text-muted-foreground mt-1 text-right text-xs">
                                                            {partyInfo}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {transaction.notes ? (
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                >
                                                                    <FilePenLine className="h-3 w-3" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                                align="end"
                                                                className="w-[240px]"
                                                            >
                                                                <div className="space-y-2">
                                                                    <h4 className="text-sm font-semibold">
                                                                        Notes
                                                                    </h4>
                                                                    <p className="text-xs">
                                                                        {
                                                                            transaction.notes
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">
                                                            No notes
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="text-muted-foreground flex items-center gap-1 text-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>
                    {entry.createdAt
                        ? `Entry created on ${format(new Date(entry.createdAt), "PPP")}`
                        : "Entry created"}
                    {entry.createdAt &&
                        entry.updatedAt &&
                        entry.createdAt !== entry.updatedAt &&
                        ` • Last updated on ${format(new Date(entry.updatedAt), "PPP")}`}
                </span>
            </div>

            {/* Cancel Entry Dialog */}
            <AlertDialog
                open={showCancelDialog}
                onOpenChange={setShowCancelDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will mark the entry as cancelled. This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>No, keep it</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelEntry}
                            disabled={isCancelling}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isCancelling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                "Yes, Cancel Entry"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
