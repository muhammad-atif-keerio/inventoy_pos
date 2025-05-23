"use client";

import { ProductType } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type for our inventory item
export type InventoryItem = {
    id: number;
    itemCode: string;
    description: string;
    productType: ProductType;
    currentQuantity: number;
    minStockLevel: number | null;
    unitOfMeasure: string;
    location: string | null;
    costPerUnit: number | null;
    salePrice: number | null;
    lastRestocked: string | null;
    createdAt: string;
    updatedAt: string;
    threadTypeId: number | null;
    threadType: { id: number; name: string; units: string } | null;
    fabricTypeId: number | null;
    fabricType: { id: number; name: string; units: string } | null;
    notes: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions?: any[];
};

// Helper function to format currency
export const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 2,
    }).format(amount);
};

export const shadcnColumns: ColumnDef<InventoryItem>[] = [
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
    },
    {
        accessorKey: "description",
        header: "Description",
    },
    {
        accessorKey: "productType",
        header: "Type",
        cell: ({ row }) => {
            const type = row.getValue("productType") as string;
            return (
                <Badge variant={type === "THREAD" ? "default" : "secondary"}>
                    {type === "THREAD" ? "Thread" : "Fabric"}
                </Badge>
            );
        },
    },
    {
        accessorKey: "currentQuantity",
        header: "Quantity",
        cell: ({ row }) => {
            const quantity = parseFloat(row.getValue("currentQuantity"));
            const minStock = row.original.minStockLevel
                ? parseFloat(row.original.minStockLevel as unknown as string)
                : 0;

            // Check if stock is low
            const isLow = quantity > 0 && quantity <= minStock;
            const isOut = quantity <= 0;

            return (
                <div
                    className={`font-medium ${isOut ? "text-red-500" : isLow ? "text-amber-500" : ""}`}
                >
                    {quantity} {row.original.unitOfMeasure}
                </div>
            );
        },
    },
    {
        accessorKey: "location",
        header: "Location",
    },
    {
        accessorKey: "costPerUnit",
        header: () => <div className="text-right">Cost</div>,
        cell: ({ row }) => {
            const amount = row.getValue("costPerUnit") as number | null;
            const formatted = formatCurrency(amount);

            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "salePrice",
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => {
            const amount = row.getValue("salePrice") as number | null;
            const formatted = formatCurrency(amount);

            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        id: "actions",
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
                        <DropdownMenuItem
                            onClick={() =>
                                navigator.clipboard.writeText(
                                    item.id.toString(),
                                )
                            }
                        >
                            Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Item</DropdownMenuItem>
                        <DropdownMenuItem>Adjust Stock</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
