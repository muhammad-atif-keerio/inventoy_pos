"use client";

import Link from "next/link";
import React from "react";

import { ColumnDef, Row } from "@tanstack/react-table";
import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";
import {
    AlertTriangle,
    ArrowDownUp,
    ArrowUpDown,
    Building,
    Check,
    CreditCard,
    Edit,
    Eye,
    FileText,
    MoreHorizontal,
    Package,
    PiggyBank,
    Receipt,
    RefreshCw,
    Trash,
    Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LedgerEntryRow } from "@/app/lib/types";

// Helper function to format currency in PKR
export function formatCurrency(
    amount: number | string | null | undefined,
): string {
    if (amount === null || amount === undefined) {
        return "PKR 0";
    }

    // First, ensure we're working with a number
    let numAmount: number;
    if (typeof amount === "string") {
        // Remove any existing currency symbols or commas to avoid parsing errors
        const cleanedAmount = amount.replace(/[^\d.-]/g, "");
        numAmount = parseFloat(cleanedAmount);
    } else {
        numAmount = amount;
    }

    // Handle NaN cases
    if (isNaN(numAmount)) {
        console.warn("Invalid amount for currency formatting:", amount);
        return "PKR 0";
    }

    // Round to 2 decimal places to avoid floating point precision issues
    numAmount = Math.round(numAmount * 100) / 100;

    // Format with proper PKR currency symbol and consistent decimal places
    try {
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2, // Allow up to 2 decimal places for precision when needed
        }).format(numAmount);
    } catch (error) {
        // Fallback formatting in case Intl formatter fails
        console.log(error);
        const formatted = numAmount.toFixed(2);
        return `PKR ${formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    }
}

// Helper function to format dates with proper handling of null/undefined
const formatDate = (date: string | undefined | null): string => {
    if (!date) return "—";

    try {
        return format(new Date(date), "dd MMM yyyy");
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid date";
    }
};

// Format relative time (e.g., "2 days ago", "in 3 days")
const formatRelativeDate = (date: string | undefined | null): string => {
    if (!date) return "";

    try {
        const dateObj = new Date(date);
        return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
        return "";
    }
};

// Check if a date is overdue
const isOverdue = (date: string | undefined | null): boolean => {
    if (!date) return false;
    try {
        return isBefore(new Date(date), new Date());
    } catch {
        return false;
    }
};

// Filter function for dates
export const dateRangeFilter = (
    row: Row<LedgerEntryRow>,
    columnId: string,
    dates: { from?: Date; to?: Date },
): boolean => {
    const value = row.getValue(columnId) as string | undefined;
    if (!value) return true;

    try {
        const cellDate = new Date(value);

        if (dates.from && isBefore(cellDate, dates.from)) {
            return false;
        }

        if (dates.to && isAfter(cellDate, dates.to)) {
            return false;
        }

        return true;
    } catch {
        return true;
    }
};

// Get icon for entry type
const getEntryTypeIcon = (entryType: string, transactionType?: string) => {
    const iconMap: Record<string, React.ReactNode> = {
        BILL: <FileText className="mr-1 h-3 w-3" />,
        TRANSACTION: <ArrowDownUp className="mr-1 h-3 w-3" />,
        CHEQUE: <CreditCard className="mr-1 h-3 w-3" />,
        INVENTORY: <Package className="mr-1 h-3 w-3" />,
        BANK: <Building className="mr-1 h-3 w-3" />,
    };

    // Special transaction type icons
    if (transactionType) {
        switch (transactionType) {
            case "PURCHASE":
                return <Truck className="mr-1 h-3 w-3" />;
            case "SALE":
                return <Receipt className="mr-1 h-3 w-3" />;
            case "BANK_DEPOSIT":
            case "BANK_WITHDRAWAL":
                return <PiggyBank className="mr-1 h-3 w-3" />;
        }
    }

    return iconMap[entryType] || <FileText className="mr-1 h-3 w-3" />;
};

// Get color for entry type badge
const getEntryTypeColor = (
    entryType: string,
    transactionType?: string,
): string => {
    // Special transaction type colors
    if (transactionType) {
        switch (transactionType) {
            case "PURCHASE":
                return "text-orange-500 border-orange-200 bg-orange-50";
            case "SALE":
                return "text-green-500 border-green-200 bg-green-50";
            case "BANK_DEPOSIT":
                return "text-blue-500 border-blue-200 bg-blue-50";
            case "BANK_WITHDRAWAL":
                return "text-purple-500 border-purple-200 bg-purple-50";
        }
    }

    // Default colors by entry type
    switch (entryType) {
        case "BILL":
            return "text-slate-500 border-slate-200 bg-slate-50";
        case "TRANSACTION":
            return "text-blue-500 border-blue-200 bg-blue-50";
        case "CHEQUE":
            return "text-purple-500 border-purple-200 bg-purple-50";
        case "INVENTORY":
            return "text-teal-500 border-teal-200 bg-teal-50";
        case "BANK":
            return "text-indigo-500 border-indigo-200 bg-indigo-50";
        default:
            return "text-slate-500 border-slate-200 bg-slate-50";
    }
};

// Get color for entry type badge
const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
        case "PENDING":
            return "text-amber-500 border-amber-200 bg-amber-50";
        case "PARTIAL":
            return "text-blue-500 border-blue-200 bg-blue-50";
        case "COMPLETED":
        case "PAID":
        case "CLEARED":
            return "text-green-500 border-green-200 bg-green-50";
        case "CANCELLED":
        case "BOUNCED":
            return "text-red-500 border-red-200 bg-red-50";
        case "REPLACED":
            return "text-purple-500 border-purple-200 bg-purple-50";
        default:
            return "text-slate-500 border-slate-200 bg-slate-50";
    }
};

function getEntryIdAndType(id: string | number) {
    const idStr = String(id);
    if (!idStr.includes(":")) return { entryId: idStr, entryType: "" };

    const [entryType, entryId] = idStr.split(":");
    return { entryId, entryType };
}

export const columns: ColumnDef<LedgerEntryRow>[] = [
    // Entry Type column
    {
        accessorKey: "entryType",
        header: "Type",
        cell: ({ row }) => {
            const type = row.getValue("entryType") as string;
            const transactionType = row.original.transactionType;

            return (
                <Badge
                    variant="outline"
                    className={`min-w-[100px] justify-center px-2 py-1 font-medium ${getEntryTypeColor(type, transactionType)}`}
                >
                    {getEntryTypeIcon(type, transactionType)}
                    {transactionType
                        ? transactionType.charAt(0) +
                          transactionType
                              .slice(1)
                              .toLowerCase()
                              .replace("_", " ")
                        : type.charAt(0) + type.slice(1).toLowerCase()}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value === row.getValue(id);
        },
    },

    // Description column
    {
        accessorKey: "description",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="-ml-4 font-medium"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                >
                    Description
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            // Get original party and id
            const party = row.original.party || "Unknown";
            return (
                <div className="font-medium">
                    <div>{row.getValue("description")}</div>
                    <div className="text-muted-foreground text-xs">{party}</div>
                </div>
            );
        },
    },

    // Party column
    {
        accessorKey: "party",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                    className="hover:bg-transparent"
                >
                    Party
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => (
            <div className="truncate">{row.getValue("party")}</div>
        ),
    },

    // Entry Date column
    {
        accessorKey: "entryDate",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="-ml-3 font-medium"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                >
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const entryDate = row.getValue("entryDate") as string;
            const formattedDate = formatDate(entryDate);
            const relativeDate = formatRelativeDate(entryDate);

            return (
                <div>
                    <div className="font-medium whitespace-nowrap">
                        {formattedDate}
                    </div>
                    <div className="text-muted-foreground text-xs whitespace-nowrap">
                        {relativeDate}
                    </div>
                </div>
            );
        },
    },

    // Due Date column
    {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => {
            const dueDate = row.getValue("dueDate") as string | undefined;

            if (!dueDate) {
                return <span className="text-muted-foreground">—</span>;
            }

            const formatted = formatDate(dueDate);
            const relative = formatRelativeDate(dueDate);
            const overdue = isOverdue(dueDate);

            return (
                <div>
                    <div
                        className={`font-medium whitespace-nowrap ${overdue ? "text-red-500" : ""}`}
                    >
                        {formatted}
                        {overdue && (
                            <AlertTriangle className="ml-1 inline-block h-3 w-3 text-red-500" />
                        )}
                    </div>
                    <div
                        className={`text-xs whitespace-nowrap ${overdue ? "text-red-400" : "text-muted-foreground"}`}
                    >
                        {relative}
                    </div>
                </div>
            );
        },
    },

    // Amount column
    {
        accessorKey: "amount",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="-ml-3 text-right font-medium"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                >
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const transactionType = row.original.transactionType;
            const amount = parseFloat(row.getValue("amount"));

            // Determine if amount is positive or negative based on transaction type
            let isNegative = false;
            if (
                transactionType === "PURCHASE" ||
                transactionType === "EXPENSE" ||
                transactionType === "BANK_WITHDRAWAL"
            ) {
                isNegative = true;
            }

            const formattedAmount = formatCurrency(amount);

            return (
                <div className="text-right font-medium tabular-nums">
                    <span
                        className={
                            isNegative ? "text-rose-500" : "text-emerald-600"
                        }
                    >
                        {isNegative ? "-" : ""}
                        {formattedAmount}
                    </span>
                </div>
            );
        },
    },

    // Remaining Amount column
    {
        accessorKey: "remainingAmount",
        header: "Remaining",
        cell: ({ row }) => {
            const remainingAmount = parseFloat(row.getValue("remainingAmount"));

            if (remainingAmount === 0) {
                return (
                    <div className="flex items-center justify-end text-right font-medium text-green-500">
                        <Check className="mr-1 h-4 w-4" /> Cleared
                    </div>
                );
            }

            return (
                <div className="text-right font-medium tabular-nums">
                    {formatCurrency(remainingAmount)}
                </div>
            );
        },
    },

    // Status column
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            const statusText = status.charAt(0) + status.slice(1).toLowerCase();

            return (
                <Badge
                    variant="outline"
                    className={`min-w-[80px] justify-center px-2 py-1 ${getStatusColor(status)}`}
                >
                    {statusText}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value === row.getValue(id);
        },
    },

    // Actions column
    {
        id: "actions",
        cell: ({ row }) => {
            const entryType = row.original.entryType;
            const id = row.original.id;
            const { entryId } = getEntryIdAndType(id);

            // Determine the edit URL based on entity type
            const editUrl = `/ledger/${entryId}?type=${entryType.toLowerCase()}`;

            // Function to refresh the ledger data
            const handleRefresh = async () => {
                try {
                    // Show loading toast
                    toast.loading("Refreshing data...", {
                        id: "refresh-toast",
                    });

                    // Call revalidate API
                    await fetch("/api/revalidate?path=/ledger", {
                        cache: "no-store",
                    });

                    // Force a reload of the current page
                    window.location.reload();

                    // Update toast
                    toast.success("Data refreshed successfully", {
                        id: "refresh-toast",
                    });
                } catch (error) {
                    console.error("Error refreshing data:", error);
                    toast.error("Failed to refresh data", {
                        id: "refresh-toast",
                    });
                }
            };

            return (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link
                                    href={`/ledger/${entryId}?view=true&type=${entryType.toLowerCase()}`}
                                    className="cursor-pointer"
                                >
                                    <Eye className="mr-2 h-4 w-4" /> View
                                    details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={editUrl} className="cursor-pointer">
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleRefresh}
                                className="cursor-pointer"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                                data
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                onClick={() =>
                                    alert(
                                        "Delete functionality will be implemented later",
                                    )
                                }
                            >
                                <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    },
];
