"use client";

import Link from "next/link";
import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
    BarChart,
    Building,
    Calendar,
    Eye,
    FileEdit,
    Mail,
    MapPin,
    MoreHorizontal,
    Phone,
    ShoppingCart,
    Trash2,
} from "lucide-react";

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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteVendorDialog } from "@/components/vendors/delete-vendor-dialog";
import { EditVendorDialog } from "@/components/vendors/edit-vendor-dialog";

// Define the shape of our vendor item based on the Prisma schema
export interface VendorItem {
    id: number;
    name: string;
    contact: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    activeOrders?: number;
    totalPurchases?: number;
}

// Define column configuration for the vendor data table
export const columns: ColumnDef<VendorItem>[] = [
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
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => {
                    row.toggleSelected(!!value);
                }}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },

    // Name Column
    {
        accessorKey: "name",
        header: ({ column }) => (
            <DataTableColumnHeader
                column={column}
                title="Vendor Name"
                icon={<Building className="mr-2 h-4 w-4" />}
            />
        ),
        cell: ({ row }) => {
            const id = row.original.id;
            return (
                <div className="flex items-center gap-2 font-medium">
                    <Building className="text-muted-foreground h-4 w-4" />
                    <Link
                        href={`/vendors/${id}`}
                        className="max-w-[200px] truncate whitespace-nowrap hover:underline"
                        title={row.getValue("name")}
                    >
                        {row.getValue("name")}
                    </Link>
                </div>
            );
        },
        enableHiding: false,
    },

    // Contact Column
    {
        accessorKey: "contact",
        header: ({ column }) => (
            <DataTableColumnHeader
                column={column}
                title="Contact"
                icon={<Phone className="mr-2 h-4 w-4" />}
            />
        ),
        cell: ({ row }) => {
            return (
                <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <span className="whitespace-nowrap">
                        {row.getValue("contact")}
                    </span>
                </div>
            );
        },
    },

    // Email Column
    {
        accessorKey: "email",
        header: ({ column }) => (
            <DataTableColumnHeader
                column={column}
                title="Email"
                icon={<Mail className="mr-2 h-4 w-4" />}
            />
        ),
        cell: ({ row }) => {
            const email = row.getValue("email") as string | null;
            return (
                <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground h-4 w-4" />
                    <div className="max-w-[200px] truncate" title={email || ""}>
                        {email || "—"}
                    </div>
                </div>
            );
        },
    },

    // City Column
    {
        accessorKey: "city",
        header: ({ column }) => (
            <DataTableColumnHeader
                column={column}
                title="City"
                icon={<MapPin className="mr-2 h-4 w-4" />}
            />
        ),
        cell: ({ row }) => {
            const city = row.getValue("city") as string | null;
            return (
                <div className="flex items-center gap-2">
                    <MapPin className="text-muted-foreground h-4 w-4" />
                    <div>{city || "—"}</div>
                </div>
            );
        },
    },

    // Active Orders Column
    {
        accessorKey: "activeOrders",
        header: ({ column }) => (
            <DataTableColumnHeader
                column={column}
                title="Active Orders"
                icon={<ShoppingCart className="mr-2 h-4 w-4" />}
            />
        ),
        cell: ({ row }) => {
            const activeOrders = row.getValue("activeOrders") as number;
            return (
                <div className="flex items-center gap-2">
                    <ShoppingCart className="text-muted-foreground h-4 w-4" />
                    <Badge
                        variant={activeOrders > 0 ? "default" : "outline"}
                        className="font-normal"
                    >
                        {activeOrders || 0}
                    </Badge>
                </div>
            );
        },
    },

    // Total Purchases Column
    {
        accessorKey: "totalPurchases",
        header: ({ column }) => (
            <DataTableColumnHeader
                column={column}
                title="Total Purchases"
                icon={<BarChart className="mr-2 h-4 w-4" />}
            />
        ),
        cell: ({ row }) => {
            const totalPurchases = row.getValue("totalPurchases") as number;
            return (
                <div className="flex items-center gap-2">
                    <BarChart className="text-muted-foreground h-4 w-4" />
                    <div className="font-medium">
                        {typeof totalPurchases === "number"
                            ? `PKR ${totalPurchases.toLocaleString()}`
                            : "PKR 0"}
                    </div>
                </div>
            );
        },
    },

    // Created At Column
    {
        accessorKey: "createdAt",
        header: ({ column }) => (
            <DataTableColumnHeader
                column={column}
                title="Added On"
                icon={<Calendar className="mr-2 h-4 w-4" />}
            />
        ),
        cell: ({ row }) => {
            // Format the date for better display
            const dateString = row.getValue("createdAt") as string;
            const date = new Date(dateString);

            return (
                <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <div>{format(date, "PPP")}</div>
                </div>
            );
        },
    },

    // Actions Column
    {
        id: "actions",
        cell: ({ row }) => {
            const vendor = row.original;

            return (
                <TooltipProvider>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="flex justify-end">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="h-8 w-8 p-0"
                                        >
                                            <span className="sr-only">
                                                Open menu
                                            </span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Actions</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>

                            <DropdownMenuItem asChild>
                                <Link href={`/vendors/${vendor.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </Link>
                            </DropdownMenuItem>

                            <EditVendorDialog
                                vendor={vendor}
                                trigger={
                                    <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        <FileEdit className="mr-2 h-4 w-4" />
                                        Edit Vendor
                                    </DropdownMenuItem>
                                }
                            />

                            <DropdownMenuSeparator />

                            <DeleteVendorDialog
                                vendor={vendor}
                                trigger={
                                    <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Vendor
                                    </DropdownMenuItem>
                                }
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TooltipProvider>
            );
        },
    },
];
