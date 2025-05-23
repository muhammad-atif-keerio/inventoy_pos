"use client";

import Link from "next/link";
import React from "react";

import { Decimal } from "@prisma/client/runtime/library";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Edit, FileText, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Need to define ColorStatus type since we removed the import
type ColorStatus = "COLORED" | "RAW";

// Updated ThreadPurchase type with improved fields
export type ThreadPurchase = {
    id: number;
    vendorId: number;
    vendor: {
        id: number;
        name: string;
    };
    orderDate: string;
    threadType: string;
    color: string | null;
    colorStatus: "COLORED" | "RAW";
    quantity: number;
    unitPrice: number | Decimal;
    totalCost: number | Decimal;
    unitOfMeasure: string;
    deliveryDate: string | null;
    remarks: string | null;
    reference: string | null;
    received: boolean;
    receivedAt: string | null;
    inventoryStatus: string | null;
    dyeingProcess: {
        id: number;
        colorName: string | null;
        colorCode: string | null;
        resultStatus: string;
    } | null;
    inventory: {
        inventoryId: number;
        itemCode: string;
        currentQuantity: number;
        location: string | null;
    } | null;
    paymentStatus: string;
    paymentCount: number;
    totalPaid: number | Decimal;
};

// Updated PaymentStatus column with text-only display
const paymentStatusColumn: ColumnDef<ThreadPurchase> = {
    id: "paymentStatus",
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment" />
    ),
    cell: ({ row }) => {
        const paymentStatus = row.getValue("paymentStatus") as string;
        const totalCost =
            typeof row.original.totalCost === "number"
                ? row.original.totalCost
                : Number(row.original.totalCost.toString());
        const totalPaid =
            typeof row.original.totalPaid === "number"
                ? row.original.totalPaid
                : Number(row.original.totalPaid.toString());
        const paymentPercentage =
            totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;

        if (paymentStatus === "PAID" || paymentPercentage >= 100) {
            return <span>Paid</span>;
        } else if (paymentPercentage > 0) {
            return <span>Partial ({paymentPercentage}%)</span>;
        } else {
            return <span>Unpaid</span>;
        }
    },
    enableSorting: true,
};

// Update the inventory column with text-only display
const inventoryColumn: ColumnDef<ThreadPurchase> = {
    id: "inventory",
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Inventory" />
    ),
    cell: ({ row }) => {
        const inventory = row.original.inventory;
        const received = row.original.received;

        if (!received) {
            return <span>Not Received</span>;
        }

        if (!inventory) {
            return <span>Not In Inventory</span>;
        }

        return (
            <span>
                {inventory.itemCode} ({inventory.currentQuantity})
            </span>
        );
    },
};

// Update column definitions with simplified presentation
export const columns: ColumnDef<ThreadPurchase>[] = [
    // Selection column
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => {
                    table.toggleAllPageRowsSelected(!!value);
                }}
                aria-label="Select all"
                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => {
                    row.toggleSelected(!!value);
                }}
                aria-label="Select row"
                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },

    // Order Date Column - prioritized
    {
        accessorKey: "orderDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Order Date" />
        ),
        cell: ({ row }) => {
            const date = new Date(row.getValue("orderDate"));
            return <span>{format(date, "PPP")}</span>;
        },
    },

    // Reference Column - simplified
    {
        accessorKey: "reference",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Reference" />
        ),
        cell: ({ row }) => {
            const reference = row.getValue("reference") as string | null;
            if (!reference)
                return <span className="text-muted-foreground">—</span>;

            return (
                <div className="w-[160px] truncate">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-default truncate">
                                {reference}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <p className="font-normal break-all">{reference}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            );
        },
        minSize: 160,
        maxSize: 220,
    },

    // Thread Type Column - simplified
    {
        accessorKey: "threadType",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Thread Type" />
        ),
        cell: ({ row }) => {
            return <span>{row.getValue("threadType")}</span>;
        },
    },

    // Color Column - simplified
    {
        accessorKey: "color",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Color" />
        ),
        cell: ({ row }) => {
            try {
                const colorStatus = row.original.colorStatus as ColorStatus;
                const color = row.getValue("color") as string | null;
                const dyeingProcess = row.original.dyeingProcess;

                let displayColor = color;

                if (colorStatus === "RAW" && dyeingProcess) {
                    displayColor =
                        dyeingProcess.colorName ||
                        dyeingProcess.colorCode ||
                        "Processing";
                }

                if (colorStatus === "RAW" && !dyeingProcess) {
                    return <span>Raw (Undyed)</span>;
                }

                return <span>{displayColor || "None"}</span>;
            } catch (error) {
                console.error("Error rendering color cell:", error);
                return <span>Error</span>;
            }
        },
    },

    // ColorStatus Column - simplified
    {
        accessorKey: "colorStatus",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Color Status" />
        ),
        cell: ({ row }) => {
            const status = row.getValue("colorStatus") as ColorStatus;
            return <span>{status === "COLORED" ? "Colored" : "Raw"}</span>;
        },
        enableHiding: false,
    },

    // Status Column - simplified
    {
        id: "status",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
            const received = row.original.received;
            const receivedAt = row.original.receivedAt
                ? new Date(row.original.receivedAt)
                : null;
            const colorStatus = row.original.colorStatus as ColorStatus;
            const dyeingProcess = row.original.dyeingProcess;

            if (!received) {
                return <span>Pending</span>;
            }

            if (received && colorStatus === "COLORED") {
                return <span>Received</span>;
            }

            if (received && colorStatus === "RAW" && !dyeingProcess) {
                return <span>Received (Undyed)</span>;
            }

            return (
                <span>
                    Received {receivedAt ? format(receivedAt, "PP") : ""}
                </span>
            );
        },
    },

    // Quantity Column
    {
        accessorKey: "quantity",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Quantity" />
        ),
        cell: ({ row }) => {
            const quantity = row.getValue("quantity") as number;
            const unitOfMeasure = row.original.unitOfMeasure;
            return (
                <span>
                    {quantity.toLocaleString()} {unitOfMeasure}
                </span>
            );
        },
    },

    // Unit Price Column
    {
        accessorKey: "unitPrice",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Unit Price" />
        ),
        cell: ({ row }) => {
            const unitPrice =
                typeof row.getValue("unitPrice") === "number"
                    ? (row.getValue("unitPrice") as number)
                    : Number((row.getValue("unitPrice") as Decimal).toString());

            return (
                <div className="text-right tabular-nums">
                    {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "PKR",
                    }).format(unitPrice)}
                </div>
            );
        },
        enableSorting: true,
    },

    // Total Cost Column
    {
        accessorKey: "totalCost",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Total Cost" />
        ),
        cell: ({ row }) => {
            const totalCost =
                typeof row.getValue("totalCost") === "number"
                    ? (row.getValue("totalCost") as number)
                    : Number((row.getValue("totalCost") as Decimal).toString());

            return (
                <div className="text-right tabular-nums">
                    {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "PKR",
                    }).format(totalCost)}
                </div>
            );
        },
        enableSorting: true,
    },

    // Payment Status column - simplified
    paymentStatusColumn,

    // Inventory column - simplified
    inventoryColumn,

    // Delivery Date Column - simplified
    {
        accessorKey: "deliveryDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Expected Delivery" />
        ),
        cell: ({ row }) => {
            const date = row.getValue("deliveryDate") as string | null;

            if (!date) return <span>—</span>;

            const deliveryDate = new Date(date);
            const now = new Date();
            const isPastDue = deliveryDate < now && !row.original.received;

            if (isPastDue && !row.original.received) {
                return <span>{format(deliveryDate, "PPP")} (Overdue)</span>;
            }

            return <span>{format(deliveryDate, "PPP")}</span>;
        },
    },

    // Actions Column
    {
        id: "actions",
        cell: ({ row }) => {
            const threadPurchase = row.original;

            if (!threadPurchase || !threadPurchase.id) {
                return null;
            }

            const ActionButtons = React.memo(() => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="hover:bg-muted h-8 w-8 rounded-full p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="border-border w-[180px]"
                    >
                        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                            Actions
                        </DropdownMenuLabel>

                        <DropdownMenuItem
                            asChild
                            className="focus:bg-muted cursor-pointer gap-2 rounded-md px-2 py-1.5 text-sm"
                        >
                            <Link href={`/thread-orders/${threadPurchase.id}`}>
                                <FileText className="text-muted-foreground h-4 w-4" />
                                View details
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            asChild
                            className="focus:bg-muted cursor-pointer gap-2 rounded-md px-2 py-1.5 text-sm"
                        >
                            <Link
                                href={`/thread-orders/edit/${threadPurchase.id}`}
                            >
                                <Edit className="text-muted-foreground h-4 w-4" />
                                Edit order
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-border my-1.5" />

                        <DropdownMenuItem
                            className="text-muted-foreground focus:bg-muted cursor-pointer gap-2 rounded-md px-2 py-1.5 text-sm"
                            onClick={(e) => {
                                e.preventDefault();
                                // Implement delete logic
                                if (
                                    confirm(
                                        `Are you sure you want to delete thread order #${threadPurchase.id}?`,
                                    )
                                ) {
                                    // Delete API call would go here
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete order
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ));

            ActionButtons.displayName = "ActionButtons";
            return <ActionButtons />;
        },
    },
];
