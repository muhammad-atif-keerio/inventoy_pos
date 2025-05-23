"use client";

import * as React from "react";

import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Define props interface for the DataTable component
interface DataTableProps<TData, TValue> {
    columns:
        | ColumnDef<TData, TValue>[]
        // eslint-disable-next-line no-unused-vars
        | ((onDataChange?: () => void) => ColumnDef<TData, TValue>[]);
    data: TData[];
    isLoading?: boolean;
    onDataChange?: () => void; // Callback for when data changes (e.g., after edit)
}

export function DataTable<TData, TValue>({
    columns,
    data,
    isLoading = false,
    onDataChange,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "productionDate", desc: true },
    ]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [searchFilter, setSearchFilter] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<string>("all");

    // Determine columns to use based on type
    const tableColumns = React.useMemo(() => {
        return typeof columns === "function" ? columns(onDataChange) : columns;
    }, [columns, onDataChange]);

    const table = useReactTable({
        data,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    // Update search filter for batchNumber
    React.useEffect(() => {
        if (searchFilter) {
            table.getColumn("batchNumber")?.setFilterValue(searchFilter);
        }
    }, [searchFilter, table]);

    // Update status filter
    React.useEffect(() => {
        if (statusFilter !== "all" && table.getColumn("status")) {
            table.getColumn("status")?.setFilterValue(statusFilter);
        } else if (statusFilter === "all" && table.getColumn("status")) {
            table.getColumn("status")?.setFilterValue("");
        }
    }, [statusFilter, table]);

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="w-full sm:w-[280px]">
                    <Input
                        placeholder="Search by batch number..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* Status Filter */}
                    <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                    >
                        <SelectTrigger className="h-9 w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="IN_PROGRESS">
                                In Progress
                            </SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Data Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            // Loading state
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`loading-${index}`}>
                                    {Array.from({
                                        length: tableColumns.length,
                                    }).map((_, colIndex) => (
                                        <TableCell
                                            key={`loading-cell-${index}-${colIndex}`}
                                        >
                                            <Skeleton className="h-8 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            // Data rows
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
                            // Empty state
                            <TableRow>
                                <TableCell
                                    colSpan={tableColumns.length}
                                    className="h-24 text-center"
                                >
                                    No fabric production records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                    {table.getFilteredRowModel().rows.length} record(s) found
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value));
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue
                                    placeholder={
                                        table.getState().pagination.pageSize
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
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
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage() || isLoading}
                        >
                            <span className="sr-only">Go to first page</span>
                            <span>«</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage() || isLoading}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <span>‹</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage() || isLoading}
                        >
                            <span className="sr-only">Go to next page</span>
                            <span>›</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() =>
                                table.setPageIndex(table.getPageCount() - 1)
                            }
                            disabled={!table.getCanNextPage() || isLoading}
                        >
                            <span className="sr-only">Go to last page</span>
                            <span>»</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
