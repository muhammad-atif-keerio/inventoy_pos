"use client";

import * as React from "react";

import { PaymentStatus, ProductType } from "@prisma/client";
import {
    ColumnDef,
    ColumnFiltersState,
    PaginationState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { FileDown, Filter, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { SalesOrderItem } from "./columns";

// Props for SalesDataTable component
interface SalesDataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    refreshTrigger?: number; // Used to trigger data refresh
}

export function SalesDataTable<TData, TValue>({
    columns,
    refreshTrigger = 0,
}: SalesDataTableProps<TData, TValue>) {
    // State for storing sales data
    const [data, setData] = React.useState<SalesOrderItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [totalCount, setTotalCount] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);

    // Define state for React Table
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = React.useState<string>("");
    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    // Define state for custom filters
    const [filters, setFilters] = React.useState({
        productType: "all",
        paymentStatus: "all",
        customerName: "",
    });

    // Define fetchSalesData outside useEffect
    const fetchSalesData = React.useCallback(async () => {
        setLoading(true);
        try {
            // Build query parameters
            const params = new URLSearchParams();

            if (filters.productType && filters.productType !== "all") {
                params.append("productType", filters.productType);
            }

            if (filters.paymentStatus && filters.paymentStatus !== "all") {
                params.append("paymentStatus", filters.paymentStatus);
            }

            // Add pagination params
            params.append("limit", pagination.pageSize.toString());
            params.append(
                "offset",
                (pagination.pageIndex * pagination.pageSize).toString(),
            );

            // Make API request with filters
            const response = await fetch(`/api/sales?${params.toString()}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Failed to fetch sales data: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
                );
            }

            const responseData = await response.json();

            if (!responseData.success) {
                throw new Error(
                    responseData.error || "Failed to fetch sales data",
                );
            }

            // Update state with the new data
            setData(responseData.data.items);
            setTotalCount(responseData.data.total);
            setError(null);
        } catch (error) {
            console.error("Error fetching sales data:", error);
            setError(
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
            );
            setData([]); // Set empty data on error
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [
        filters.productType,
        filters.paymentStatus,
        pagination.pageIndex,
        pagination.pageSize,
    ]);

    // Fetch sales data on component mount and when dependencies change
    React.useEffect(() => {
        fetchSalesData();
    }, [fetchSalesData, refreshTrigger]);

    // Add an event listener to refresh data when the salesDataUpdated event is fired
    React.useEffect(() => {
        const handleDataUpdate = () => {
            console.log('Sales data updated event received, refreshing data...');
            fetchSalesData();
        };
        
        // Listen for the custom salesDataUpdated event
        window.addEventListener('salesDataUpdated', handleDataUpdate);
        
        // Clean up event listener
        return () => {
            window.removeEventListener('salesDataUpdated', handleDataUpdate);
        };
    }, [fetchSalesData]);

    // Add event listener for refreshSalesData event
    React.useEffect(() => {
        const handleRefresh = () => {
            console.log('Refresh sales data event received');
            fetchSalesData();
        };
        
        window.addEventListener('refreshSalesData', handleRefresh);
        
        return () => {
            window.removeEventListener('refreshSalesData', handleRefresh);
        };
    }, [fetchSalesData]);

    // Handle filter changes
    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));

        // Reset to first page when filters change
        setPagination((prev) => ({
            ...prev,
            pageIndex: 0,
        }));
    };

    // Search by customer name
    const handleCustomerSearch = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = event.target.value;
        table?.getColumn?.("customerName")?.setFilterValue(value);
        handleFilterChange("customerName", value);
    };

    // Product type filter options
    const productTypeOptions = [
        { label: "All Types", value: "all" },
        { label: "Thread", value: ProductType.THREAD },
        { label: "Fabric", value: ProductType.FABRIC },
    ];

    // Payment status filter options
    const paymentStatusOptions = [
        { label: "All Statuses", value: "all" },
        { label: "Paid", value: PaymentStatus.PAID },
        { label: "Partial", value: PaymentStatus.PARTIAL },
        { label: "Pending", value: PaymentStatus.PENDING },
        { label: "Cancelled", value: PaymentStatus.CANCELLED },
    ];

    // Export data function
    const handleExportData = () => {
        toast.info("Exporting sales data...", {
            description: "Your data is being prepared for download",
        });
        // Implement actual export functionality here
    };

    // Initialize react-table - move outside the conditional
    const table = useReactTable({
        data: data as TData[],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "includesString",
        manualPagination: true, // Enable manual pagination
        pageCount: Math.ceil(totalCount / pagination.pageSize), // Calculate total page count
        state: {
            sorting,
            columnFilters,
            pagination,
            globalFilter,
        },
    });

    // Render error state if there's an error
    if (error) {
        return (
            <div className="flex items-center justify-center p-8 text-center">
                <div>
                    <p className="mb-2 text-red-500">Error loading data</p>
                    <p className="text-muted-foreground text-sm">{error}</p>
                    <Button
                        className="mt-4"
                        variant="outline"
                        onClick={() => {
                            setError(null);
                            fetchSalesData();
                        }}
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    // Otherwise, render the table
    return (
        <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="bg-card border-b px-4 py-4 sm:px-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="relative flex max-w-sm flex-1 items-center">
                        <Search className="text-muted-foreground absolute left-3 h-4 w-4" />
                        <Input
                            placeholder="Search by customer name..."
                            value={
                                (table
                                    .getColumn("customerName")
                                    ?.getFilterValue() as string) ?? ""
                            }
                            onChange={handleCustomerSearch}
                            className="bg-background w-full pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <Filter className="h-4 w-4" />
                                    <span>Filter</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-[220px] p-4"
                                align="end"
                            >
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="product-type">
                                            Product Type
                                        </Label>
                                        <Select
                                            value={filters.productType || "all"}
                                            onValueChange={(value) =>
                                                handleFilterChange(
                                                    "productType",
                                                    value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="product-type"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productTypeOptions.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="payment-status">
                                            Payment Status
                                        </Label>
                                        <Select
                                            value={
                                                filters.paymentStatus || "all"
                                            }
                                            onValueChange={(value) =>
                                                handleFilterChange(
                                                    "paymentStatus",
                                                    value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="payment-status"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentStatusOptions.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={handleExportData}
                        >
                            <FileDown className="h-4 w-4" />
                            <span>Export</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table for displaying sales data */}
            <div className="overflow-x-auto">
                <Table className="min-w-full">
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className="font-medium"
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-40"
                                >
                                    <div className="flex h-full items-center justify-center">
                                        <Loader2 className="text-primary h-8 w-8 animate-spin" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-40 text-center"
                                >
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <p className="text-muted-foreground font-medium">
                                            No sales found
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            Add a new sale or try changing your
                                            filters
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                    className="group hover:bg-muted/50 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination controls */}
            {data.length > 0 && (
                <div className="flex items-center justify-between border-t px-4 py-4">
                    <div className="text-muted-foreground text-sm">
                        Showing {table.getRowModel().rows.length} of{" "}
                        {totalCount} results
                    </div>
                    <div className="flex items-center space-x-6 lg:space-x-8">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Rows per page</p>
                            <Select
                                value={`${pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value));
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue
                                        placeholder={pagination.pageSize}
                                    />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 50, 100].map((pageSize) => (
                                        <SelectItem
                                            key={pageSize}
                                            value={`${pageSize}`}
                                        >
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">
                                    Go to previous page
                                </span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="m15 18-6-6 6-6" />
                                </svg>
                            </Button>
                            <div className="text-sm">
                                Page{" "}
                                <span className="font-medium">
                                    {table.getState().pagination.pageIndex + 1}
                                </span>{" "}
                                of{" "}
                                <span className="font-medium">
                                    {table.getPageCount() || 1}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">Go to next page</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="m9 18 6-6-6-6" />
                                </svg>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
