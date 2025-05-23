"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { LedgerEntryRow } from "@/app/lib/types";

import { formatCurrency } from "../../columns";

// Extended type for LedgerEntryRow with our runtime-added properties
interface ExtendedLedgerEntryRow extends LedgerEntryRow {
    displayEntryType?: string;
}

// Helper function to get the display entry type based on entry data
function getDisplayEntryType(entry: ExtendedLedgerEntryRow): string {
    if (entry.displayEntryType) {
        return entry.displayEntryType;
    }

    if (entry.entryType === "BILL") {
        if (entry.transactionType === "SALE") {
            return "RECEIVABLE";
        } else if (entry.transactionType === "PURCHASE") {
            return "PAYABLE";
        }
    }

    return entry.entryType;
}

// Payment/Receipt form schema
const formSchema = z
    .object({
        amount: z.string().refine(
            (val) => {
                const num = parseFloat(val);
                return !isNaN(num) && num > 0;
            },
            { message: "Amount must be a positive number" },
        ),
        transactionDate: z.date({
            required_error: "Transaction date is required",
        }),
        paymentMode: z.enum(["CASH", "CHEQUE", "ONLINE"], {
            required_error: "Payment method is required",
        }),
        chequeNumber: z.string().optional(),
        bankName: z.string().optional(),
        referenceNumber: z.string().optional(),
        notes: z.string().optional(),
    })
    .refine(
        (data) => {
            // Require cheque number if payment mode is CHEQUE
            if (
                data.paymentMode === "CHEQUE" &&
                (!data.chequeNumber || data.chequeNumber.trim() === "")
            ) {
                return false;
            }
            return true;
        },
        {
            message: "Cheque number is required for cheque payments",
            path: ["chequeNumber"],
        },
    );

type FormValues = z.infer<typeof formSchema>;

interface TransactionData {
    ledgerEntryId: string | number;
    amount: string;
    transactionDate: string;
    paymentMode: "CASH" | "CHEQUE" | "ONLINE";
    notes?: string;
    referenceNumber?: string;
    chequeNumber?: string;
    bankName?: string;
}

export default function PaymentFormPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [entry, setEntry] = useState<ExtendedLedgerEntryRow | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [maxAmount, setMaxAmount] = useState<number>(0);

    // Initialize form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: "",
            transactionDate: new Date(),
            paymentMode: "CASH",
            chequeNumber: "",
            bankName: "",
            referenceNumber: "",
            notes: "",
        },
    });

    // Watch payment mode to conditionally show cheque fields
    const paymentMode = form.watch("paymentMode");

    // Fetch the ledger entry
    const fetchLedgerEntry = async () => {
        if (!id) return;

        setIsLoading(true);
        try {
            // Add timestamp to URL for cache-busting
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/ledger/${id}?_=${timestamp}`, {
                method: "GET",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                },
                cache: "no-store",
                next: { revalidate: 0 },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    toast.error("Ledger entry not found");
                    router.push("/ledger");
                    return;
                }
                throw new Error("Failed to fetch ledger entry");
            }

            const data = await response.json();
            const entryData = data.entry;

            console.log("Loaded entry data for payment:", {
                id: entryData.id,
                amount: entryData.amount,
                remainingAmount: entryData.remainingAmount,
                status: entryData.status,
                entryType: entryData.entryType,
                transactionType: entryData.transactionType,
            });

            // Normalize entry type to match what's shown in the list view
            if (entryData.entryType === "BILL") {
                if (entryData.transactionType === "SALE") {
                    entryData.displayEntryType = "RECEIVABLE";
                } else if (entryData.transactionType === "PURCHASE") {
                    entryData.displayEntryType = "PAYABLE";
                } else {
                    entryData.displayEntryType = entryData.entryType;
                }
            } else {
                entryData.displayEntryType = entryData.entryType;
            }

            // Validate amount and remaining amount data
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

            setEntry(entryData);

            // Set max amount to remaining amount
            const remainingAmount = parseFloat(entryData.remainingAmount);
            setMaxAmount(remainingAmount);

            // Pre-fill amount with remaining balance
            form.setValue("amount", remainingAmount.toString());
        } catch (error) {
            console.error("Error fetching ledger entry:", error);
            toast.error("Failed to load ledger entry details");
        } finally {
            setIsLoading(false);
        }
    };

    // Form submission handler
    const onSubmit = async (data: FormValues) => {
        if (!entry) return;

        setIsSubmitting(true);

        try {
            // Parse amount with precision handling
            const inputAmount = data.amount;
            const amount = parseFloat(parseFloat(inputAmount).toFixed(2));

            // Validate amount doesn't exceed remaining amount
            // Use a small tolerance to account for potential floating point issues
            if (amount > maxAmount + 0.005) {
                form.setError("amount", {
                    type: "manual",
                    message: `Amount cannot exceed the remaining balance of ${formatCurrency(maxAmount)}`,
                });
                setIsSubmitting(false);
                return;
            }

            // Get entry ID, handling composite IDs like "bill:123"
            const ledgerEntryId = entry.id;

            // Prepare the data for submission
            const transactionData: TransactionData = {
                ledgerEntryId: ledgerEntryId,
                amount: amount.toFixed(2), // Ensure consistent decimal precision
                transactionDate: data.transactionDate.toISOString(),
                paymentMode: data.paymentMode,
                notes: data.notes,
                referenceNumber: data.referenceNumber,
            };

            // Add cheque details if payment mode is CHEQUE
            if (data.paymentMode === "CHEQUE") {
                transactionData.chequeNumber = data.chequeNumber;
                transactionData.bankName = data.bankName;
            }

            // Submit the payment/receipt with cache busting to prevent stale data
            const timestamp = Date.now().toString();
            const response = await fetch(
                `/api/ledger/transactions?_=${timestamp}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        // Add cache-busting headers
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                        Expires: "0",
                        "X-Cache-Bust": timestamp,
                    },
                    body: JSON.stringify(transactionData),
                    next: { revalidate: 0 }, // Force revalidation in Next.js
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Payment error:", errorData);
                throw new Error(errorData.error || "Failed to record payment");
            }
            // Show success message
            const isPayable = getDisplayEntryType(entry) === "PAYABLE";

            toast.success(
                `${isPayable ? "Payment" : "Receipt"} recorded successfully`,
            );

            // Invalidate any cached data for this ledger entry and the ledger list
            try {
                await fetch(
                    `/api/revalidate?path=/ledger/${entry.id}&path=/ledger`,
                    {
                        method: "GET",
                        cache: "no-store",
                        headers: {
                            "Cache-Control":
                                "no-cache, no-store, must-revalidate",
                            Pragma: "no-cache",
                            Expires: "0",
                        },
                    },
                );
            } catch (e) {
                console.warn("Cache invalidation failed:", e);
            }

            // Redirect back to the ledger entry page
            router.push(`/ledger/${entry.id}`);

            // Force a hard reload to ensure the ledger entry page shows the updated data
            setTimeout(() => {
                window.location.href = `/ledger/${entry.id}?_=${Date.now()}`;
            }, 300);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Error recording payment:", error);
            toast.error(error.message || "Failed to record payment");
            setIsSubmitting(false);
        }
    };

    // Handle cancellation
    const handleCancel = () => {
        router.back();
    };

    // Load data on initial render
    useEffect(() => {
        if (id) {
            fetchLedgerEntry();
        }
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

    // Show error if entry not found
    if (!entry) {
        return (
            <div className="container flex items-center justify-center py-10">
                <div className="text-center">
                    <h2 className="mb-2 text-lg font-semibold">
                        Entry Not Found
                    </h2>
                    <p className="text-muted-foreground mb-4">
                        The ledger entry you&apos;re looking for doesn&apos;t
                        exist or has been deleted.
                    </p>
                    <Button asChild>
                        <Link href="/ledger">Return to Ledger</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Prevent accessing the form if entry is completed or cancelled
    if (entry.status === "COMPLETED" || entry.status === "CANCELLED") {
        return (
            <div className="container max-w-5xl space-y-6 py-6">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                    >
                        <Link href={`/ledger/${entry.id}`}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {entry.entryType === "PAYABLE"
                            ? "Record Payment"
                            : "Record Receipt"}
                    </h1>
                </div>
                <Separator />
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle>Action Not Allowed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>
                            This ledger entry is{" "}
                            {entry.status === "COMPLETED"
                                ? "already completed"
                                : "cancelled"}{" "}
                            and cannot accept new payments.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href={`/ledger/${entry.id}`}>
                                Return to Entry Details
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="container max-w-5xl space-y-6 py-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        size="icon"
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {getDisplayEntryType(entry) === "PAYABLE"
                            ? "Record Payment"
                            : "Record Receipt"}
                    </h1>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                        >
                            {/* Amount Field */}
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Amount{" "}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter amount"
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                max={maxAmount}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Maximum amount:{" "}
                                            {formatCurrency(maxAmount)}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Transaction Date */}
                            <FormField
                                control={form.control}
                                name="transactionDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>
                                            Transaction Date{" "}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "pl-3 text-left font-normal",
                                                            !field.value &&
                                                                "text-muted-foreground",
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(
                                                                field.value,
                                                                "PPP",
                                                            )
                                                        ) : (
                                                            <span>
                                                                Pick a date
                                                            </span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription>
                                            Date when the payment/receipt
                                            occurred
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Payment Mode */}
                            <FormField
                                control={form.control}
                                name="paymentMode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Payment Method{" "}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select payment method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="CASH">
                                                    Cash
                                                </SelectItem>
                                                <SelectItem value="CHEQUE">
                                                    Cheque
                                                </SelectItem>
                                                <SelectItem value="ONLINE">
                                                    Online Transfer
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Cheque Information (Conditionally) */}
                            {paymentMode === "CHEQUE" && (
                                <div className="bg-muted/50 grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="chequeNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Cheque Number{" "}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter cheque number"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="bankName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bank Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter bank name"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {/* Reference Number */}
                            <FormField
                                control={form.control}
                                name="referenceNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reference Number</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter reference number"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Optional reference for this
                                            transaction
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Notes */}
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter any additional notes"
                                                className="min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Additional information about this
                                            payment
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {getDisplayEntryType(entry) ===
                                            "PAYABLE"
                                                ? "Making Payment..."
                                                : "Recording Receipt..."}
                                        </>
                                    ) : getDisplayEntryType(entry) ===
                                      "PAYABLE" ? (
                                        "Make Payment"
                                    ) : (
                                        "Record Receipt"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Entry Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-muted-foreground text-sm font-medium">
                                    Description
                                </h3>
                                <p className="font-medium">
                                    {entry.description}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <h3 className="text-muted-foreground text-sm font-medium">
                                        Total Amount
                                    </h3>
                                    <p className="font-medium">
                                        {formatCurrency(entry.amount)}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-muted-foreground text-sm font-medium">
                                        Remaining
                                    </h3>
                                    <p className="font-medium">
                                        {formatCurrency(entry.remainingAmount)}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-muted-foreground text-sm font-medium">
                                    {getDisplayEntryType(entry) === "PAYABLE"
                                        ? "Vendor"
                                        : "Customer"}
                                </h3>
                                <p className="font-medium">
                                    {entry.vendor
                                        ? entry.vendor.name
                                        : entry.customer
                                          ? entry.customer.name
                                          : entry.party || "N/A"}
                                </p>
                            </div>
                            {entry.reference && (
                                <div>
                                    <h3 className="text-muted-foreground text-sm font-medium">
                                        Reference
                                    </h3>
                                    <p className="font-medium">
                                        {entry.reference}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
