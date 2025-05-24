// app/inventory/columns.tsx
"use client";

import Link from "next/link";
import * as React from "react";

import { ProductType } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import {
    ArrowUpDown,
    Eye,
    FileEdit,
    History,
    MoreHorizontal,
    PackagePlus,
    Trash2,
} from "lucide-react";

import { DeleteInventoryDialog } from "@/components/inventory/delete-inventory-dialog";
import { EditInventoryDialog } from "@/components/inventory/edit-inventory-dialog";
import { RestockInventoryDialog } from "@/components/inventory/restock-inventory-dialog";
// Import the dialog components for inventory operations
import { ViewInventoryDialog } from "@/components/inventory/view-inventory-dialog";
import { ViewInventoryTransactionsDialog } from "@/components/inventory/view-transactions-dialog";
import { Badge } from "@/components/ui/badge";
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

// Import interfaces from interface.ts
import { InventoryItem } from "./interface";

// app/inventory/columns.tsx

// app/inventory/columns.tsx

// app/inventory/columns.tsx

// app/inventory/columns.tsx

// app/inventory/columns.tsx

// app/inventory/columns.tsx

// app/inventory/columns.tsx

// app/inventory/columns.tsx

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
    }).format(amount);
};

// Helper to determine if an item is low stock
export const isLowStock = (item: InventoryItem) => {
    if (item.minStockLevel === null) return false;
    return item.currentQuantity <= item.minStockLevel;
};

// Get the stock status of an item
export const getStockStatus = (item: InventoryItem): "low" | "out" | "in" => {
    if (item.currentQuantity <= 0) return "out";
    if (isLowStock(item)) return "low";
    return "in";
};

// Format a product type for display
export const formatProductType = (type: ProductType) => {
    // Convert product type to display format
    switch (type) {
        case "THREAD":
            return "Thread";
        case "FABRIC":
            return "Fabric";
        default:
            return type;
    }
};

// Get the source information for an inventory item
export const getSourceInfo = (
    item: InventoryItem,
): { label: string; link: string | null; details: string | null } => {
    // Check the most recent transaction to determine the source
    const lastTransaction =
        item.transactions && item.transactions.length > 0
            ? item.transactions.sort(
                  (a, b) =>
                      new Date(b.transactionDate).getTime() -
                      new Date(a.transactionDate).getTime(),
              )[0]
            : null;

    if (lastTransaction?.threadPurchaseId) {
        return {
            label: "Thread Purchase",
            link: `/thread-orders/${lastTransaction.threadPurchaseId}`,
            details: item.threadType?.name || null,
        };
    }

    if (lastTransaction?.dyeingProcessId) {
        return {
            label: "Dyeing Process",
            link: `/dyeing-process?id=${lastTransaction.dyeingProcessId}`,
            details: "Dyed Thread",
        };
    }

    if (lastTransaction?.fabricProductionId) {
        return {
            label: "Fabric Production",
            link: `/fabric-production?id=${lastTransaction.fabricProductionId}`,
            details: item.fabricType?.name || null,
        };
    }

    if (lastTransaction?.salesOrderId) {
        return {
            label: "Sales Order",
            link: `/sales?id=${lastTransaction.salesOrderId}`,
            details: null,
        };
    }

    return { label: "Manual Entry", link: null, details: null };
};

// Define column configuration for the inventory data table
export const columns: ColumnDef<InventoryItem>[] = [
    // Selection column
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },

    // Item Code Column
    {
        accessorKey: "itemCode",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                >
                    Item Code
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const item = row.original;
            const sourceInfo = getSourceInfo(item);

            return (
                <div className="flex flex-col">
                    <span className="font-medium">{item.itemCode}</span>
                    {sourceInfo.label && (
                        <span className="text-muted-foreground text-xs">
                            {sourceInfo.label}
                            {sourceInfo.link && (
                                <Link
                                    href={sourceInfo.link}
                                    className="ml-1 text-blue-500 hover:underline"
                                >
                                    (View)
                                </Link>
                            )}
                        </span>
                    )}
                </div>
            );
        },
    },

    // Product Type Column
    {
        accessorKey: "productType",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Product Type" />
        ),
        cell: ({ row }) => {
            const productType = row.getValue("productType") as ProductType;
            return (
                <Badge variant="outline">
                    {formatProductType(productType)}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },

    // Description Column
    {
        accessorKey: "description",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Description" />
        ),
        cell: ({ row }) => {
            return (
                <div
                    className="max-w-[200px] truncate"
                    title={row.getValue("description")}
                >
                    {row.getValue("description")}
                </div>
            );
        },
    },

    // Thread/Fabric Type Column
    {
        id: "typeDetails",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Type Details" />
        ),
        cell: ({ row }) => {
            const item = row.original;

            // Show thread type if it exists
            if (item.threadType) {
                return <span>{item.threadType.name}</span>;
            }

            // Show fabric type if it exists
            if (item.fabricType) {
                return <span>{item.fabricType.name}</span>;
            }

            // Otherwise show the product type
            return (
                <span className="text-muted-foreground italic">Unknown</span>
            );
        },
    },

    // Quantity and Stock Status Column
    {
        accessorKey: "currentQuantity",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Quantity" />
        ),
        cell: ({ row }) => {
            const item = row.original;
            const stockStatus = getStockStatus(item);

            return (
                <div className="flex flex-col space-y-1">
                    <span className="font-medium">
                        {item.currentQuantity} {item.unitOfMeasure}
                    </span>
                    {stockStatus === "out" && (
                        <Badge variant="destructive" className="w-fit">
                            Out of Stock
                        </Badge>
                    )}
                    {stockStatus === "low" && (
                        <Badge variant="secondary" className="w-fit">
                            Low Stock
                        </Badge>
                    )}
                    {stockStatus === "in" && (
                        <Badge variant="default" className="w-fit">
                            In Stock
                        </Badge>
                    )}
                </div>
            );
        },
    },

    // Cost and Value Column
    {
        id: "costValue",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Cost & Value" />
        ),
        cell: ({ row }) => {
            const item = row.original;
            const totalValue = item.currentQuantity * item.costPerUnit;

            return (
                <div className="flex flex-col">
                    <span>Cost: {formatCurrency(item.costPerUnit)}</span>
                    <span className="text-muted-foreground">
                        Value: {formatCurrency(totalValue)}
                    </span>
                </div>
            );
        },
    },

    // Actions Column
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const item = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>

                        <DropdownMenuItem asChild>
                            <ViewInventoryDialog
                                inventoryItem={item}
                                trigger={
                                    <button className="flex w-full cursor-pointer items-center px-2 py-1.5">
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Details
                                    </button>
                                }
                            />
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <ViewInventoryTransactionsDialog
                                inventoryItem={item}
                                trigger={
                                    <button className="flex w-full cursor-pointer items-center px-2 py-1.5">
                                        <History className="mr-2 h-4 w-4" />
                                        View Transactions
                                    </button>
                                }
                            />
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                            <EditInventoryDialog
                                inventoryItem={item}
                                trigger={
                                    <button className="flex w-full cursor-pointer items-center px-2 py-1.5">
                                        <FileEdit className="mr-2 h-4 w-4" />
                                        Edit
                                    </button>
                                }
                            />
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <RestockInventoryDialog
                                inventoryItem={item}
                                trigger={
                                    <button className="flex w-full cursor-pointer items-center px-2 py-1.5">
                                        <PackagePlus className="mr-2 h-4 w-4" />
                                        Restock
                                    </button>
                                }
                            />
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                            <DeleteInventoryDialog
                                inventoryItem={item}
                                trigger={
                                    <button className="text-destructive flex w-full cursor-pointer items-center px-2 py-1.5">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </button>
                                }
                            />
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

export type { InventoryItem };
