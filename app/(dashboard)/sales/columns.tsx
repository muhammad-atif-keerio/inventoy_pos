"use client";

import {
    ChequeStatus,
    PaymentMode,
    PaymentStatus,
    ProductType,
} from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
    AlertTriangle,
    Banknote,
    CheckCircle2,
    Clock,
    MoreHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper function to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
    }).format(amount);
};

// Interface representing a sale in the data table
export interface SalesOrderItem {
    id: number;
    orderNumber: string;
    orderDate: string;
    customerName: string;
    customerId: number;
    customerPhone?: string;
    customerEmail?: string;
    productType: ProductType;
    productId: number;
    quantitySold: number;
    unitPrice: number; // Main field matching the database field name
    salePrice?: number; // For backward compatibility with API that returns unitPrice as salePrice
    totalSale: number;
    discount?: number;
    tax?: number;
    deliveryDate?: string;
    deliveryAddress?: string;
    remarks?: string;
    paymentMode?: PaymentMode;
    chequeStatus?: ChequeStatus;
    chequeNumber?: string;
    bank?: string;
    paymentStatus: PaymentStatus;
    // Customer object with additional fields
    customer?: {
        id: number;
        name: string;
        contact: string;
        email?: string | null;
        address?: string | null;
        city?: string | null;
        notes?: string | null;
        createdAt?: string | Date;
        updatedAt?: string | Date;
    };
    // Relations
    threadPurchase?: {
        id: number;
        threadType: string;
        color?: string | null;
        colorStatus: string;
        vendorName?: string;
    } | null;
    fabricProduction?: {
        id: number;
        fabricType: string;
        dimensions?: string;
        batchNumber?: string;
    } | null;
    inventoryEntries?: {
        id: number;
        quantity: number;
        transactionType: string;
        transactionDate: string;
        inventoryId?: number;
        inventoryCode?: string;
    }[];
    payments?: {
        id: number;
        amount: number;
        mode: PaymentMode;
        transactionDate: string;
        referenceNumber?: string;
        description?: string;
        chequeTransaction?: {
            id: number;
            chequeNumber: string;
            bank: string;
            branch?: string;
            chequeAmount: number;
            chequeStatus: ChequeStatus;
            clearanceDate?: string;
        } | null;
    }[];
    // Product name for display
    productName?: string;
    // Multiple items in an order
    items?: Array<{
        id: number;
        productType: ProductType;
        productId: number;
        productName?: string;
        quantitySold: number;
        unitPrice: number;
        discount?: number;
        tax?: number;
        subtotal: number;
        threadPurchase?: {
            id: number;
            threadType: string;
            color?: string | null;
            colorStatus: string;
        } | null;
        fabricProduction?: {
            id: number;
            fabricType: string;
            dimensions?: string;
        } | null;
    }>;
}

// Define a type for the items in a sale
type SaleItem = NonNullable<SalesOrderItem["items"]>[number];

// Define the columns for the sales data table
export const columns: ColumnDef<SalesOrderItem>[] = [
    // Order ID column
    {
        accessorKey: "orderNumber",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Order #" />
        ),
        cell: ({ row }) => (
            <div className="text-sm font-medium">
                {row.getValue("orderNumber") || `#${row.original.id}`}
            </div>
        ),
    },

    // Order Date column
    {
        accessorKey: "orderDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
            const date = new Date(row.getValue("orderDate"));
            return <div className="text-sm">{format(date, "PPP")}</div>;
        },
    },

    // Customer Name column
    {
        accessorKey: "customerName",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Customer" />
        ),
        cell: ({ row }) => (
            <div className="max-w-[200px] truncate text-sm font-medium">
                {row.getValue("customerName")}
            </div>
        ),
    },

    // Product Type column
    {
        accessorKey: "productType",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Product Type" />
        ),
        cell: ({ row }) => {
            const type = row.getValue("productType") as ProductType;
            return (
                <Badge
                    variant={
                        type === ProductType.THREAD ? "secondary" : "default"
                    }
                    className="text-xs font-medium"
                >
                    {type}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },

    // Product Details column
    {
        accessorKey: "productName",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Product Details" />
        ),
        cell: ({ row }) => {
            const data = row.original;
            const productType = data.productType;

            // Check if there are multiple items
            const hasMultipleItems = (data.items?.length ?? 0) > 1;

            const productName = data.productName || `#${data.productId}`;

            // Display for single item
            if (!hasMultipleItems) {
                return (
                    <div className="max-w-[200px]">
                        <div className="truncate font-medium">
                            {productName}
                        </div>
                        {productType === "THREAD" && data.threadPurchase ? (
                            <div className="text-muted-foreground flex items-center truncate text-xs">
                                <span className="truncate">
                                    {data.threadPurchase.threadType}
                                </span>
                                {data.threadPurchase.color && (
                                    <span className="ml-1">
                                        ({data.threadPurchase.color})
                                    </span>
                                )}
                            </div>
                        ) : productType === "FABRIC" &&
                          data.fabricProduction ? (
                            <div className="text-muted-foreground flex items-center truncate text-xs">
                                <span className="truncate">
                                    {data.fabricProduction.fabricType}
                                </span>
                                {data.fabricProduction.dimensions && (
                                    <span className="ml-1">
                                        ({data.fabricProduction.dimensions})
                                    </span>
                                )}
                            </div>
                        ) : null}
                    </div>
                );
            }

            // Display for multiple items
            return (
                <div className="max-w-[200px]">
                    <div className="font-medium">
                        Multiple Products ({data.items?.length || 0})
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                        <span className="truncate">
                            {data.items
                                ?.map((item: SaleItem) => item.productType)
                                .filter(
                                    (
                                        v: ProductType,
                                        i: number,
                                        a: ProductType[],
                                    ) => a.indexOf(v) === i,
                                )
                                .join(", ") || ""}
                        </span>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-primary mt-1 cursor-help text-xs underline">
                                    View all items
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="w-[200px] p-0">
                                <div className="max-h-[150px] overflow-y-auto p-2">
                                    <div className="mb-1 text-xs font-medium">
                                        Order contains:
                                    </div>
                                    <ul className="space-y-1">
                                        {data.items?.map(
                                            (item: SaleItem, index: number) => (
                                                <li
                                                    key={index}
                                                    className="text-xs"
                                                >
                                                    •{" "}
                                                    {item.productName ||
                                                        `#${item.productId}`}{" "}
                                                    ({item.quantitySold} units)
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            );
        },
    },

    // Quantity Sold column
    {
        accessorKey: "quantitySold",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Quantity" />
        ),
        cell: ({ row }) => (
            <div className="text-right text-sm">
                {row.getValue("quantitySold")}
            </div>
        ),
    },

    // Unit Price column
    {
        accessorKey: "unitPrice",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Unit Price" />
        ),
        cell: ({ row }) => {
            // Try to get valid price from different fields
            const unitPrice = row.getValue("unitPrice");
            const salePrice = row.original.salePrice;

            // Choose the first valid number
            let amount = 0;
            if (typeof unitPrice === "number" && !isNaN(unitPrice)) {
                amount = unitPrice;
            } else if (typeof salePrice === "number" && !isNaN(salePrice)) {
                amount = salePrice;
            } else {
                // Try parsing as a last resort
                const parsedUnitPrice = parseFloat(String(unitPrice || 0));
                const parsedSalePrice = parseFloat(String(salePrice || 0));

                if (!isNaN(parsedUnitPrice)) {
                    amount = parsedUnitPrice;
                } else if (!isNaN(parsedSalePrice)) {
                    amount = parsedSalePrice;
                }
            }

            return (
                <div className="text-right text-sm font-medium">
                    {formatCurrency(amount)}
                </div>
            );
        },
    },

    // Total Sale column
    {
        accessorKey: "totalSale",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Total" />
        ),
        cell: ({ row }) => {
            // Get amount and ensure it's a number
            let amount = row.getValue("totalSale");
            if (typeof amount !== "number" || isNaN(amount)) {
                const parsed = parseFloat(amount as string);
                amount = !isNaN(parsed) ? parsed : 0;
            }

            // Check if there's a discount
            const discount = row.original.discount;
            let discountValue = 0;
            if (discount !== undefined && discount !== null) {
                discountValue =
                    typeof discount === "number"
                        ? discount
                        : parseFloat(discount as string);
                if (isNaN(discountValue)) discountValue = 0;
            }

            return (
                <div className="text-right">
                    {discountValue > 0 ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="inline-flex flex-col">
                                        <span className="text-sm font-medium">
                                            {formatCurrency(amount as number)}
                                        </span>
                                        <span className="text-xs text-green-600">
                                            Disc:{" "}
                                            {formatCurrency(discountValue)}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p className="text-sm">
                                        Total after discount:{" "}
                                        {formatCurrency(amount as number)}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <span className="text-sm font-medium">
                            {formatCurrency(amount as number)}
                        </span>
                    )}
                </div>
            );
        },
    },

    // Payment Mode column
    {
        accessorKey: "paymentMode",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Payment Mode" />
        ),
        cell: ({ row }) => {
            const paymentMode = row.getValue("paymentMode") as
                | PaymentMode
                | undefined;
            const data = row.original;

            if (!paymentMode)
                return (
                    <div className="text-muted-foreground text-xs">Not set</div>
                );

            // For CHEQUE payments, check the cheque status
            const chequeStatus = data.chequeStatus;
            const isCheque = paymentMode === PaymentMode.CHEQUE;

            // Determine color for badge
            let badgeClass = "";
            switch (paymentMode) {
                case PaymentMode.CASH:
                    badgeClass = "bg-green-50 text-green-700 border-green-200";
                    break;
                case PaymentMode.CHEQUE:
                    if (chequeStatus === ChequeStatus.CLEARED) {
                        badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    } else if (chequeStatus === ChequeStatus.BOUNCED) {
                        badgeClass = "bg-red-50 text-red-700 border-red-200";
                    } else {
                        badgeClass =
                            "bg-yellow-50 text-yellow-700 border-yellow-200";
                    }
                    break;
                case PaymentMode.ONLINE:
                    badgeClass =
                        "bg-purple-50 text-purple-700 border-purple-200";
                    break;
            }

            // Determine icon
            let Icon = Banknote; // Default icon
            if (isCheque) {
                if (chequeStatus === ChequeStatus.CLEARED) {
                    Icon = CheckCircle2;
                } else if (chequeStatus === ChequeStatus.BOUNCED) {
                    Icon = AlertTriangle;
                } else {
                    Icon = Clock;
                }
            }

            return (
                <Badge variant="outline" className={`text-xs ${badgeClass}`}>
                    <div className="flex items-center gap-1">
                        <Icon className="mr-1 h-3 w-3" />
                        {paymentMode}
                        {isCheque && chequeStatus && (
                            <span className="text-[10px]">
                                ({chequeStatus})
                            </span>
                        )}
                    </div>
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },

    // Payment Status column
    {
        accessorKey: "paymentStatus",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
            const paymentStatus = row.getValue(
                "paymentStatus",
            ) as PaymentStatus;

            return (
                <Badge
                    variant="outline"
                    className={`text-xs font-medium ${
                        paymentStatus === PaymentStatus.PAID
                            ? "border-green-200 bg-green-50 text-green-700"
                            : paymentStatus === PaymentStatus.PARTIAL
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : paymentStatus === PaymentStatus.PENDING
                                ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                : "border-red-200 bg-red-50 text-red-700"
                    }`}
                >
                    {paymentStatus}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },

    // Actions column with download button
    {
        id: "actions",
        cell: ({ row }) => {
            const sale = row.original;

            return (
                <div className="flex items-center justify-end gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() =>
                                    window.open(
                                        `/invoice-preview/${sale.id}`,
                                        "_blank",
                                    )
                                }
                            >
                                View Invoice
                            </DropdownMenuItem>
                            {/* <DropdownMenuItem
                                onClick={() =>
                                    window.open(
                                        `/invoice-preview/${sale.id}?pdf=true`,
                                        "_blank",
                                    )
                                }
                            >
                                Download PDF
                            </DropdownMenuItem> */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    // Dispatch a custom event to view sale details
                                    window.dispatchEvent(
                                        new CustomEvent("viewSalesDetails", {
                                            detail: sale,
                                        }),
                                    );
                                }}
                            >
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    // Dispatch a custom event to edit sale
                                    window.dispatchEvent(
                                        new CustomEvent("editSale", {
                                            detail: sale,
                                        }),
                                    );
                                }}
                            >
                                Edit Sale
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    },
];

// Export dialogs so they can be used in the data table
export { SalesDetailsDialog } from "./sales-details-dialog";
export { SalesEditDialog } from "./sales-edit-dialog";
