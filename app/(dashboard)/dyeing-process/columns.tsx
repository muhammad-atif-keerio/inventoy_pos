"use client";

import { useState } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
    AlertTriangle,
    ExternalLink,
    FileEdit,
    Loader2,
    MoreHorizontal,
    PlusCircle,
    Trash2,
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Try with correct import path for DataTableColumnHeader
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DyeingDetailsDialog } from "./dyeing-details-dialog";

// Interface for dyeing process data items aligned with the updated schema
export interface DyeingProcessItem {
    id: number;
    threadPurchaseId: number;
    threadPurchase?: {
        id: number;
        threadType: string;
        colorStatus: string;
        color?: string | null;
        quantity: number;
        unitOfMeasure: string;
    };
    dyeDate: string;
    colorCode?: string | null;
    colorName?: string | null;
    dyeQuantity: number;
    outputQuantity: number;
    laborCost?: number | null;
    dyeMaterialCost?: number | null;
    totalCost?: number | null;
    resultStatus: string;
    completionDate?: string | null;
    remarks?: string | null;
    createdAt?: string;
    updatedAt?: string;
    inventoryEntries?: {
        id: number;
        quantity: number;
        transactionType: string;
        transactionDate: string;
    }[];
    fabricProductions?: {
        id: number;
        fabricType: string;
        quantityProduced: number;
        status: string;
    }[];
}

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined): string => {
    if (amount == null) return "N/A";
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
    }).format(amount);
};

// Define the DeleteActionCellProps type for our custom component
interface DeleteActionCellProps {
    process: DyeingProcessItem;
    onRefresh: () => void;
}

// Create a separate component for the delete action
function DeleteActionCell({ process, onRefresh }: DeleteActionCellProps) {
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleteLoading(true);
            const response = await fetch(`/api/dyeing/process/${process.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(
                    data.error || "Failed to delete dyeing process",
                );
            }

            toast.success("Dyeing process deleted successfully");
            onRefresh();
        } catch (error) {
            console.error("Error deleting dyeing process:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete dyeing process",
            );
        } finally {
            setIsDeleteLoading(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="text-destructive mr-2 h-4 w-4" />
                    <span className="text-destructive">Delete</span>
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="text-destructive h-5 w-5" />
                            <span>Are you sure?</span>
                        </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete dyeing process #
                        {process.id}. This action cannot be undone.
                        {process.inventoryEntries &&
                            process.inventoryEntries.length > 0 && (
                                <p className="text-destructive mt-2 font-medium">
                                    Warning: This process has inventory entries
                                    that will also be deleted.
                                </p>
                            )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleteLoading}
                        onClick={handleDelete}
                    >
                        {isDeleteLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export const columns: ColumnDef<DyeingProcessItem>[] = [
    // ID column
    {
        accessorKey: "id",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ row }) => <div className="w-[40px]">{row.getValue("id")}</div>,
        enableSorting: false,
        enableHiding: false,
    },

    // Thread Purchase ID column
    {
        accessorKey: "threadPurchaseId",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Thread Order" />
        ),
        cell: ({ row }) => {
            const threadPurchase = row.original.threadPurchase;
            const threadType = threadPurchase?.threadType || "Unknown";
            const threadId = row.getValue("threadPurchaseId") || "N/A";

            const colorInfo = threadPurchase?.color ? (
                <span> | Color: {threadPurchase.color}</span>
            ) : null;

            return (
                <div className="flex flex-col">
                    <div className="font-medium">
                        #{String(threadId)}: {String(threadType)}
                        {threadPurchase?.quantity && (
                            <span>
                                {" "}
                                ({threadPurchase.quantity}{" "}
                                {threadPurchase.unitOfMeasure || "units"})
                            </span>
                        )}
                    </div>
                    {threadPurchase?.colorStatus && (
                        <div className="text-muted-foreground text-xs">
                            Status: {threadPurchase.colorStatus}
                            {colorInfo}
                        </div>
                    )}
                </div>
            );
        },
        filterFn: (row, id, value) => {
            // Case-insensitive search on thread type, color, and ID
            const searchValue = value.toLowerCase();
            const threadInfo = row.original.threadPurchase;
            const threadId = String(row.getValue(id));

            return (
                threadId.includes(searchValue) ||
                (threadInfo?.threadType || "")
                    .toLowerCase()
                    .includes(searchValue) ||
                (threadInfo?.color || "").toLowerCase().includes(searchValue)
            );
        },
    },

    // Dye Date column
    {
        accessorKey: "dyeDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Dye Date" />
        ),
        cell: ({ row }) => {
            // Parse the date string and format it for display
            const dateValue = row.getValue("dyeDate") as string;
            const formatted = dateValue
                ? format(new Date(dateValue), "PPP")
                : "N/A";

            return <div>{formatted}</div>;
        },
        sortingFn: "datetime",
    },

    // Color column with color display
    {
        accessorKey: "colorName",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Color" />
        ),
        cell: ({ row }) => {
            const colorName = row.getValue("colorName") as
                | string
                | null
                | undefined;
            const colorCode = row.original.colorCode;

            return (
                <div className="flex items-center gap-2">
                    {colorCode && (
                        <div
                            className="h-5 w-5 rounded-full border border-gray-200"
                            style={{ backgroundColor: colorCode }}
                        />
                    )}
                    <span>{colorName || colorCode || "N/A"}</span>
                </div>
            );
        },
    },

    // Quantity columns
    {
        accessorKey: "dyeQuantity",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Input Qty" />
        ),
        cell: ({ row }) => {
            const quantity = row.getValue("dyeQuantity") as number;
            const unitOfMeasure =
                row.original.threadPurchase?.unitOfMeasure || "meters";

            return (
                <div>
                    {quantity.toLocaleString()}{" "}
                    <span className="text-muted-foreground text-xs">
                        {unitOfMeasure}
                    </span>
                </div>
            );
        },
    },

    {
        accessorKey: "outputQuantity",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Output Qty" />
        ),
        cell: ({ row }) => {
            const quantity = row.getValue("outputQuantity") as number;
            const unitOfMeasure =
                row.original.threadPurchase?.unitOfMeasure || "meters";

            return (
                <div>
                    {quantity.toLocaleString()}{" "}
                    <span className="text-muted-foreground text-xs">
                        {unitOfMeasure}
                    </span>
                </div>
            );
        },
    },

    // Cost column
    {
        accessorKey: "totalCost",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Total Cost" />
        ),
        cell: ({ row }) => {
            const totalCost = row.getValue("totalCost") as
                | number
                | null
                | undefined;

            return (
                <div className="font-medium">{formatCurrency(totalCost)}</div>
            );
        },
    },

    // Result Status column
    {
        accessorKey: "resultStatus",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
            const status = row.getValue("resultStatus") as string;

            const getStatusBadge = (status: string) => {
                switch (status.toUpperCase()) {
                    case "COMPLETED":
                        return (
                            <Badge className="bg-green-100 text-green-800">
                                Completed
                            </Badge>
                        );
                    case "PARTIAL":
                        return (
                            <Badge className="bg-yellow-100 text-yellow-800">
                                Partial
                            </Badge>
                        );
                    case "FAILED":
                        return (
                            <Badge className="bg-red-100 text-red-800">
                                Failed
                            </Badge>
                        );
                    case "PENDING":
                        return (
                            <Badge className="bg-blue-100 text-blue-800">
                                Pending
                            </Badge>
                        );
                    default:
                        return <Badge variant="outline">{status}</Badge>;
                }
            };

            return getStatusBadge(status);
        },
        filterFn: (row, id, value) => {
            const status = row.getValue(id) as string;
            if (value === "all") return true;
            return status.toUpperCase() === value;
        },
    },

    // Inventory Status column
    {
        id: "inventoryStatus",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Inventory" />
        ),
        cell: ({ row }) => {
            const inventoryEntries = row.original.inventoryEntries || [];
            const inInventory = inventoryEntries.length > 0;
            const quantity = inventoryEntries.reduce(
                (sum, entry) => sum + entry.quantity,
                0,
            );

            return (
                <Badge
                    variant={inInventory ? "default" : "outline"}
                    className={inInventory ? "bg-green-100 text-green-800" : ""}
                >
                    {inInventory ? `In Stock (${quantity})` : "Not Added"}
                </Badge>
            );
        },
    },

    // Completion Date (if available)
    {
        accessorKey: "completionDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Completed On" />
        ),
        cell: ({ row }) => {
            const dateValue = row.getValue("completionDate") as
                | string
                | null
                | undefined;
            if (!dateValue)
                return <div className="text-muted-foreground">-</div>;

            const formatted = format(new Date(dateValue), "PPP");
            return <div>{formatted}</div>;
        },
    },

    // Actions column with dropdown menu
    {
        id: "actions",
        cell: ({ row }) => {
            const process = row.original;

            // Handler for adding to inventory
            const handleAddToInventory = async () => {
                try {
                    const response = await fetch(
                        `/api/inventory/add-dyeing-thread`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                dyeingProcessId: process.id,
                                quantity: process.outputQuantity,
                            }),
                        },
                    );

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(
                            data.error || "Failed to add to inventory",
                        );
                    }

                    toast.success("Thread added to inventory successfully!");
                    // Refresh the page to show updated inventory status
                    window.location.reload();
                } catch (error) {
                    console.error("Error adding to inventory:", error);
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : "Failed to add thread to inventory",
                    );
                }
            };

            // Handler for updating the status
            const handleUpdateStatus = async (status: string) => {
                try {
                    const response = await fetch(
                        `/api/dyeing/process/${process.id}`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                resultStatus: status,
                                // If status is COMPLETED, also set the completion date to now
                                ...(status === "COMPLETED"
                                    ? {
                                          completionDate:
                                              new Date().toISOString(),
                                      }
                                    : {}),
                            }),
                        },
                    );

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(
                            data.error || "Failed to update status",
                        );
                    }

                    toast.success(`Status updated to ${status}`);
                    // Refresh the page to show updated status
                    window.location.reload();
                } catch (error) {
                    console.error("Error updating status:", error);
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : "Failed to update status",
                    );
                }
            };

            // Handler for page refresh
            const handleRefresh = () => {
                window.location.reload();
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

                            {/* View details */}
                            <DropdownMenuItem asChild>
                                <DyeingDetailsDialog
                                    dyeingProcess={{
                                        ...process,
                                        inventoryEntries:
                                            process.inventoryEntries?.map(
                                                (entry) => ({
                                                    ...entry,
                                                    unitCost: 0, // Adding the missing unitCost property
                                                }),
                                            ),
                                        fabricProductions:
                                            process.fabricProductions?.map(
                                                (production) => ({
                                                    ...production,
                                                    totalCost: 0, // Adding the missing totalCost property
                                                }),
                                            ),
                                    }}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            className="hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer items-center justify-start rounded-sm px-2 py-1.5 text-sm font-normal transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                        >
                                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                            View Details
                                        </Button>
                                    }
                                    onUpdate={handleRefresh}
                                />
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Inventory actions - only show if not already in inventory */}
                            {(!process.inventoryEntries ||
                                process.inventoryEntries.length === 0) && (
                                <DropdownMenuItem
                                    onClick={handleAddToInventory}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add to Inventory
                                </DropdownMenuItem>
                            )}

                            {/* Status update actions - based on current status */}
                            {process.resultStatus !== "COMPLETED" && (
                                <DropdownMenuItem
                                    onClick={() =>
                                        handleUpdateStatus("COMPLETED")
                                    }
                                >
                                    <FileEdit className="mr-2 h-4 w-4" />
                                    Mark as Completed
                                </DropdownMenuItem>
                            )}

                            {process.resultStatus !== "FAILED" && (
                                <DropdownMenuItem
                                    onClick={() => handleUpdateStatus("FAILED")}
                                >
                                    <FileEdit className="mr-2 h-4 w-4" />
                                    Mark as Failed
                                </DropdownMenuItem>
                            )}

                            {/* Delete action */}
                            <DeleteActionCell
                                process={process}
                                onRefresh={handleRefresh}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    },
];
