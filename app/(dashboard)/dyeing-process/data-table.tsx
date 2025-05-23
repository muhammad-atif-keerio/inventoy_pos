"use client";

import * as React from "react";

import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { format, subDays } from "date-fns";
import { Calendar, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { DyeingProcessItem } from "./columns";

// Props interface for DataTable component
interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
}

export function DataTable<TData, TValue>({
    columns,
}: DataTableProps<TData, TValue>) {
    // State for storing dyeing process data
    const [data, setData] = React.useState<DyeingProcessItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [refreshing, setRefreshing] = React.useState(false);

    // Date range filter state
    const [fromDate, setFromDate] = React.useState<Date | undefined>(undefined);
    const [toDate, setToDate] = React.useState<Date | undefined>(undefined);
    const [dateFilterActive, setDateFilterActive] = React.useState(false);

    // Table sorting and filtering state
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // Fetch dyeing process data function
    const fetchDyeingProcesses = async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        setError(null);

        try {
            // Build URL with filters
            let url = `/api/dyeing?t=${Date.now()}`;

            // Add date range filters if active
            if (dateFilterActive && fromDate) {
                url += `&fromDate=${fromDate.toISOString()}`;
            }

            if (dateFilterActive && toDate) {
                url += `&toDate=${toDate.toISOString()}`;
            }

            const response = await fetch(url, {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch dyeing processes: ${response.statusText}`,
                );
            }

            const result = await response.json();

            // Validate response structure before setting data
            if (Array.isArray(result.data)) {
                // Ensure each item has expected properties
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const processedData = result.data.map((item: any) => {
                    // Handle potential schema differences
                    return {
                        ...item,
                        // Normalize the inventory entries field
                        inventoryEntries:
                            item.inventoryEntries ||
                            (item.inventoryTransaction
                                ? Array.isArray(item.inventoryTransaction)
                                    ? item.inventoryTransaction
                                    : []
                                : []),
                        // Normalize the fabric productions field
                        fabricProductions:
                            item.fabricProductions ||
                            (item.fabricProduction
                                ? Array.isArray(item.fabricProduction)
                                    ? item.fabricProduction
                                    : []
                                : []),
                    };
                });
                setData(processedData);
            } else if (result.data && Array.isArray(result.data.data)) {
                // Handle nested response format
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const processedData = result.data.data.map((item: any) => {
                    return {
                        ...item,
                        // Normalize the inventory entries field
                        inventoryEntries:
                            item.inventoryEntries ||
                            (item.inventoryTransaction
                                ? Array.isArray(item.inventoryTransaction)
                                    ? item.inventoryTransaction
                                    : []
                                : []),
                        // Normalize the fabric productions field
                        fabricProductions:
                            item.fabricProductions ||
                            (item.fabricProduction
                                ? Array.isArray(item.fabricProduction)
                                    ? item.fabricProduction
                                    : []
                                : []),
                    };
                });
                setData(processedData);
            } else {
                setData([]); // Empty array as fallback
                console.warn("API returned unexpected data format:", result);
                toast.warning("API returned data in an unexpected format");
            }
        } catch (error) {
            console.error("Error fetching dyeing processes:", error);
            setError(
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred",
            );
            toast.error("Failed to load dyeing processes. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch data on component mount and when date filters change
    React.useEffect(() => {
        fetchDyeingProcesses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFilterActive, fromDate, toDate]);

    // Clear date filters
    const clearDateFilters = () => {
        setFromDate(undefined);
        setToDate(undefined);
        setDateFilterActive(false);
    };

    // Set date range filters for common periods
    const setDateRange = (days: number) => {
        setFromDate(subDays(new Date(), days));
        setToDate(new Date());
        setDateFilterActive(true);
    };

    // Handle date range application
    const applyDateRange = () => {
        if (fromDate || toDate) {
            setDateFilterActive(true);
        }
    };

    // Initialize react-table
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
        state: {
            sorting,
            columnFilters,
            pagination,
        },
    });

    // Get status options
    const resultStatusOptions = [
        { label: "All statuses", value: "all" },
        { label: "Completed", value: "COMPLETED" },
        { label: "Partial", value: "PARTIAL" },
        { label: "Failed", value: "FAILED" },
        { label: "Pending", value: "PENDING" },
    ];

    return (
        <div>
            {/* Filter section */}
            <div className="flex flex-col items-center justify-between gap-4 py-4 md:flex-row">
                <div className="flex w-full items-center gap-2 md:max-w-sm">
                    <Search className="text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by thread type or color..."
                        value={
                            (table
                                .getColumn("threadPurchaseId")
                                ?.getFilterValue() as string) ?? ""
                        }
                        onChange={(event) =>
                            table
                                .getColumn("threadPurchaseId")
                                ?.setFilterValue(event.target.value)
                        }
                        className="w-full"
                    />
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                    {/* Status filter */}
                    <Select
                        value={
                            (table
                                .getColumn("resultStatus")
                                ?.getFilterValue() as string) ?? "all"
                        }
                        onValueChange={(value) => {
                            table
                                .getColumn("resultStatus")
                                ?.setFilterValue(
                                    value === "all" ? undefined : value,
                                );
                        }}
                    >
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            {resultStatusOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Date range filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    dateFilterActive &&
                                        "border-primary text-primary",
                                )}
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                {dateFilterActive
                                    ? fromDate && toDate
                                        ? `${format(fromDate, "P")} - ${format(toDate, "P")}`
                                        : fromDate
                                          ? `From ${format(fromDate, "P")}`
                                          : toDate
                                            ? `Until ${format(toDate, "P")}`
                                            : "Date range"
                                    : "Date range"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <div className="border-b p-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium">Date range</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearDateFilters}
                                        disabled={!dateFilterActive}
                                    >
                                        Clear
                                    </Button>
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setDateRange(7)}
                                    >
                                        Last 7 days
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setDateRange(30)}
                                    >
                                        Last 30 days
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setDateRange(90)}
                                    >
                                        Last 90 days
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2 p-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="mb-1 text-sm">
                                            From date
                                        </p>
                                        <CalendarComponent
                                            mode="single"
                                            selected={fromDate}
                                            onSelect={setFromDate}
                                            disabled={(date) =>
                                                toDate ? date > toDate : false
                                            }
                                            initialFocus
                                        />
                                    </div>
                                    <div>
                                        <p className="mb-1 text-sm">To date</p>
                                        <CalendarComponent
                                            mode="single"
                                            selected={toDate}
                                            onSelect={setToDate}
                                            disabled={(date) =>
                                                fromDate
                                                    ? date < fromDate
                                                    : false
                                            }
                                            initialFocus
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={applyDateRange}
                                    disabled={!fromDate && !toDate}
                                >
                                    Apply
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Refresh button */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchDyeingProcesses(false)}
                        disabled={refreshing}
                    >
                        <RefreshCw
                            className={cn(
                                "h-4 w-4",
                                refreshing && "animate-spin",
                            )}
                        />
                    </Button>
                </div>
            </div>

            {/* Active filters display */}
            {(dateFilterActive || Object.keys(columnFilters).length > 0) && (
                <div className="bg-muted/50 mb-4 rounded-md px-3 py-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Active filters</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                                clearDateFilters();
                                table.resetColumnFilters();
                            }}
                        >
                            Clear all
                        </Button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {table.getState().columnFilters.map((filter) => (
                            <div
                                key={String(filter.id)}
                                className="bg-background flex items-center rounded-md px-2 py-1 text-xs"
                            >
                                <span className="mr-1 font-medium">
                                    {filter.id === "threadPurchaseId"
                                        ? "Thread:"
                                        : filter.id === "resultStatus"
                                          ? "Status:"
                                          : `${filter.id}:`}
                                </span>
                                <span>{String(filter.value)}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-1 h-4 w-4 p-0"
                                    onClick={() =>
                                        table
                                            .getColumn(String(filter.id))
                                            ?.setFilterValue(undefined)
                                    }
                                >
                                    ×
                                </Button>
                            </div>
                        ))}
                        {dateFilterActive && (
                            <div className="bg-background flex items-center rounded-md px-2 py-1 text-xs">
                                <span className="mr-1 font-medium">
                                    Date range:
                                </span>
                                <span>
                                    {fromDate && toDate
                                        ? `${format(fromDate, "PP")} - ${format(toDate, "PP")}`
                                        : fromDate
                                          ? `From ${format(fromDate, "PP")}`
                                          : toDate
                                            ? `Until ${format(toDate, "PP")}`
                                            : "Custom"}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-1 h-4 w-4 p-0"
                                    onClick={clearDateFilters}
                                >
                                    ×
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error alert */}
            {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
                    <p className="font-medium">Error loading data</p>
                    <p className="text-sm">{error}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => fetchDyeingProcesses()}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Table for displaying dyeing processes */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
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
                            // Loading skeleton rows
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`loading-${i}`}>
                                    {Array.from({ length: columns.length }).map(
                                        (_, j) => (
                                            <TableCell
                                                key={`loading-cell-${i}-${j}`}
                                                className="p-2"
                                            >
                                                <Skeleton className="h-8 w-full" />
                                            </TableCell>
                                        ),
                                    )}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                    className="hover:bg-muted/50"
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
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No dyed threads found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-4">
                <div className="text-muted-foreground flex-1 text-sm">
                    {!loading && (
                        <>
                            Showing{" "}
                            <span className="font-medium">
                                {table.getState().pagination.pageIndex *
                                    table.getState().pagination.pageSize +
                                    1}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                                {Math.min(
                                    (table.getState().pagination.pageIndex +
                                        1) *
                                        table.getState().pagination.pageSize,
                                    table.getFilteredRowModel().rows.length,
                                )}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium">
                                {table.getFilteredRowModel().rows.length}
                            </span>{" "}
                            results
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
