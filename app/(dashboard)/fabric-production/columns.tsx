"use client";

import React, { useState } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
    AlertTriangle,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    MoreHorizontal,
    Package,
    ShoppingCart,
    Trash,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";

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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { FabricProduction } from "./page";
import { ProductionEditDialog } from "./production-edit-dialog";
import { ProductionViewDialog } from "./production-view-dialog";

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
    }).format(amount);
};

// Simple column header component
const DataTableColumnHeader = ({
    column,
    title,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    column: any;
    title: string;
}) => {
    if (!column.getCanSort()) {
        return <div>{title}</div>;
    }

    return (
        <div className="flex items-center space-x-2">
            <Button
                variant="ghost"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                }
                className="data-[state=open]:bg-accent -ml-3 h-8"
            >
                <span>{title}</span>
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
};

// Actions Cell Component
interface ActionsCellProps {
    production: FabricProduction;
    onDataChange?: () => void;
}

const ActionsCell: React.FC<ActionsCellProps> = ({
    production,
    onDataChange,
}) => {
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        try {
            const response = await fetch(
                `/api/fabric/production/${production.id}`,
                {
                    method: "DELETE",
                },
            );

            if (response.ok) {
                toast.success("Production deleted successfully");
                if (onDataChange) onDataChange();
            } else {
                toast.error("Error deleting production");
            }
        } catch (error) {
            console.error("Error deleting production:", error);
            toast.error("Error deleting production");
        }
    };

    return (
        <div className="flex items-center">
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
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            const viewDialog = document.getElementById(
                                `view-production-${production.id}`,
                            );
                            if (viewDialog) (viewDialog as HTMLElement).click();
                        }}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            const editDialog = document.getElementById(
                                `edit-production-${production.id}`,
                            );
                            if (editDialog) (editDialog as HTMLElement).click();
                        }}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setOpen(true)}
                        className="text-red-600"
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden trigger buttons for dialogs */}
            <div className="hidden">
                <ProductionViewDialog
                    production={production}
                    triggerButton={
                        <Button
                            id={`view-production-${production.id}`}
                            variant="outline"
                            size="sm"
                        >
                            View
                        </Button>
                    }
                    onProductionUpdated={onDataChange}
                />
                <ProductionEditDialog
                    production={production}
                    triggerButton={
                        <Button
                            id={`edit-production-${production.id}`}
                            variant="outline"
                            size="sm"
                        >
                            Edit
                        </Button>
                    }
                    onProductionUpdated={onDataChange}
                />
            </div>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the fabric production record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// Column definitions for the fabric production table
export const columns = (
    onDataChange?: () => void,
): ColumnDef<FabricProduction>[] => [
    // Batch Number Column
    {
        accessorKey: "batchNumber",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Batch #" />
        ),
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("batchNumber")}</div>
        ),
    },

    // Production Date Column
    {
        accessorKey: "productionDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
            // Format the date for better display
            const date = new Date(row.getValue("productionDate"));
            return <div>{format(date, "PPP")}</div>;
        },
    },

    // Fabric Type Column
    {
        accessorKey: "fabricType",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Fabric Type" />
        ),
        cell: ({ row }) => <div>{row.getValue("fabricType")}</div>,
    },

    // Thread Source Column
    {
        accessorKey: "sourceThreadId",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Thread Source" />
        ),
        cell: ({ row }) => {
            const threadInfo = row.original.threadInfo;
            const sourceThreadId = row.original.sourceThreadId;

            if (!threadInfo) {
                return (
                    <div className="flex flex-col">
                        <span>Thread #{sourceThreadId}</span>
                        <span className="text-muted-foreground text-xs italic">
                            Additional data not loaded
                        </span>
                    </div>
                );
            }

            // Determine color status badge
            const colorStatus = threadInfo.colorStatus;
            let badgeVariant:
                | "default"
                | "destructive"
                | "outline"
                | "secondary"
                | undefined;
            let badgeStyles = "";

            if (colorStatus === "COLORED") {
                badgeVariant = "default";
                badgeStyles = "bg-blue-500 hover:bg-blue-600";
            } else if (colorStatus === "RAW") {
                badgeVariant = "outline";
                badgeStyles = "border-yellow-500 text-yellow-500";
            } else {
                badgeVariant = "secondary";
                badgeStyles = "";
            }

            return (
                <div className="flex flex-col gap-1">
                    <div className="font-medium">{threadInfo.threadType}</div>
                    {threadInfo.color && (
                        <div className="flex items-center gap-1">
                            <div
                                className="mr-1 h-3 w-3 rounded-full"
                                style={{ backgroundColor: threadInfo.color }}
                            />
                            <span className="text-xs">{threadInfo.color}</span>
                        </div>
                    )}
                    <div className="mt-1 flex items-center justify-between gap-1">
                        <Badge
                            variant={badgeVariant}
                            className={`text-xs ${badgeStyles}`}
                        >
                            {colorStatus}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                            ID: #{sourceThreadId}
                        </span>
                    </div>
                </div>
            );
        },
    },

    // Dimensions Column
    {
        accessorKey: "dimensions",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Dimensions" />
        ),
        cell: ({ row }) => <div>{row.getValue("dimensions")}</div>,
    },

    // Quantity & Material Usage Column
    {
        accessorKey: "quantityProduced",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Quantity" />
        ),
        cell: ({ row }) => {
            const quantity = row.getValue("quantityProduced") as number;
            const unit = row.original.unitOfMeasure;
            const threadUsed = row.original.threadUsed;

            return (
                <div className="flex flex-col">
                    <span className="font-medium">
                        {quantity.toLocaleString()} {unit}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        Used: {threadUsed.toLocaleString()} m of thread
                    </span>
                </div>
            );
        },
    },

    // Status Column
    {
        accessorKey: "status",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
            const status = row.getValue("status") as string;

            const statusConfig = {
                PENDING: {
                    label: "Pending",
                    variant: "outline" as const,
                    icon: Clock,
                    color: "border-yellow-500 text-yellow-500 bg-yellow-50",
                },
                IN_PROGRESS: {
                    label: "In Progress",
                    variant: "outline" as const,
                    icon: AlertTriangle,
                    color: "border-blue-500 text-blue-500 bg-blue-50",
                },
                COMPLETED: {
                    label: "Completed",
                    variant: "outline" as const,
                    icon: CheckCircle2,
                    color: "border-green-500 text-green-500 bg-green-50",
                },
                CANCELLED: {
                    label: "Cancelled",
                    variant: "outline" as const,
                    icon: XCircle,
                    color: "border-red-500 text-red-500 bg-red-50",
                },
            };

            const config =
                statusConfig[status as keyof typeof statusConfig] ||
                statusConfig.PENDING;
            const IconComponent = config.icon;

            return (
                <Badge
                    variant={config.variant}
                    className={`flex items-center gap-1 ${config.color}`}
                >
                    <IconComponent className="h-3 w-3" />
                    <span>{config.label}</span>
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value === row.getValue(id);
        },
    },

    // Inventory Status Column
    {
        accessorKey: "inventoryStatus",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Inventory" />
        ),
        cell: ({ row }) => {
            const inventoryStatus = row.getValue("inventoryStatus") as string;
            const isUpdated = inventoryStatus === "UPDATED";

            return (
                <Badge
                    variant={isUpdated ? "default" : "outline"}
                    className={`flex items-center gap-1 ${
                        isUpdated
                            ? "bg-green-500 hover:bg-green-600"
                            : "border-yellow-500 bg-yellow-50 text-yellow-500"
                    }`}
                >
                    <Package className="h-3 w-3" />
                    <span>{isUpdated ? "Updated" : "Pending"}</span>
                </Badge>
            );
        },
    },

    // Sales Status Column
    {
        accessorKey: "salesStatus",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Sales" />
        ),
        cell: ({ row }) => {
            const salesStatus = row.getValue("salesStatus") as string;
            const isSold = salesStatus === "SOLD";

            return (
                <Badge
                    variant={isSold ? "default" : "outline"}
                    className={`flex items-center gap-1 ${
                        isSold
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "border-green-500 bg-green-50 text-green-500"
                    }`}
                >
                    <ShoppingCart className="h-3 w-3" />
                    <span>{isSold ? "Sold" : "Available"}</span>
                </Badge>
            );
        },
    },

    // Cost Column
    {
        accessorKey: "totalCost",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Cost" />
        ),
        cell: ({ row }) => {
            const cost = parseFloat(row.getValue("totalCost") as string);
            return (
                <div className="text-right font-medium">
                    {formatCurrency(cost)}
                </div>
            );
        },
    },

    // Actions Column
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <ActionsCell
                    production={row.original}
                    onDataChange={onDataChange}
                />
            );
        },
    },
];
