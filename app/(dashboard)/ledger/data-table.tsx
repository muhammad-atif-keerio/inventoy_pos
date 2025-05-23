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
import { ChevronDown, Download, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

import { DataItem } from "@/app/lib/types";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchPlaceholder?: string;
    isLoading?: boolean;
}

export function DataTable<TData extends DataItem, TValue>({
    columns,
    data,
    searchPlaceholder = "Search...",
    isLoading = false,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "entryDate", desc: true }, // Default sort by date, newest first
    ]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [searchValue, setSearchValue] = React.useState("");

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: rowsPerPage,
            },
        },
    });

    // Apply page size when it changes
    React.useEffect(() => {
        table.setPageSize(rowsPerPage);
    }, [rowsPerPage, table]);

    // Reset page when filters change
    React.useEffect(() => {
        const filtersCount = table.getState().columnFilters.length;
        const filtersExist = filtersCount > 0;
        if (filtersExist) {
            table.resetPageIndex();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, table.getState().columnFilters.length]);

    // Handle search input with debounce
    React.useEffect(() => {
        const handler = setTimeout(() => {
            table.getColumn("description")?.setFilterValue(searchValue);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchValue, table]);

    // Get available entry types and statuses from data
    const entryTypes = React.useMemo(() => {
        const types = new Set<string>();
        data.forEach((item) => {
            if (item.entryType) types.add(item.entryType);
        });
        return Array.from(types);
    }, [data]);

    const statuses = React.useMemo(() => {
        const statusSet = new Set<string>();
        data.forEach((item) => {
            if (item.status) statusSet.add(item.status);
        });
        return Array.from(statusSet);
    }, [data]);

    // Export to CSV
    const exportToCSV = () => {
        if (!data.length) return;

        // Get visible columns, excluding actions
        const visibleColumns = table
            .getVisibleLeafColumns()
            .filter((col) => col.id !== "actions");

        // Create header row
        const headers = visibleColumns
            .map((col) => col.id.replace(/([A-Z])/g, " $1").trim())
            .join(",");

        // Create data rows
        const rows = table
            .getFilteredRowModel()
            .rows.map((row) => {
                return visibleColumns
                    .map((col) => {
                        // Get raw value and handle special cases
                        const value = row.getValue(col.id);
                        if (value === null || value === undefined) return "";

                        // Format to avoid CSV injection and handle quotes
                        const strValue = String(value).replace(/"/g, '""');
                        return `"${strValue}"`;
                    })
                    .join(",");
            })
            .join("\n");

        // Combine and download
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const fileName = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearFilters = () => {
        setColumnFilters([]);
        setSearchValue("");
    };

    // Show message if filtered data is empty
    const filteredRowsCount = table.getFilteredRowModel().rows.length;
    const hasActiveFilters = columnFilters.length > 0;

    // Determine if we should show the empty state
    const showNoMatchesState = hasActiveFilters && filteredRowsCount === 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:space-x-4">
                <div className="relative w-full max-w-md">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="w-full pr-9 pl-9"
                    />
                    {searchValue && (
                        <button
                            onClick={() => setSearchValue("")}
                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Entry Type Filter */}
                    <Select
                        value={
                            (table
                                .getColumn("entryType")
                                ?.getFilterValue() as string) ?? ""
                        }
                        onValueChange={(value) =>
                            table
                                .getColumn("entryType")
                                ?.setFilterValue(
                                    value === "_all" ? undefined : value,
                                )
                        }
                    >
                        <SelectTrigger className="h-10 w-[150px]">
                            <SelectValue placeholder="Entry Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all">All Types</SelectItem>
                            {entryTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type === "PAYABLE"
                                        ? "Payable"
                                        : "Receivable"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select
                        value={
                            (table
                                .getColumn("status")
                                ?.getFilterValue() as string) ?? ""
                        }
                        onValueChange={(value) =>
                            table
                                .getColumn("status")
                                ?.setFilterValue(
                                    value === "_all" ? undefined : value,
                                )
                        }
                    >
                        <SelectTrigger className="h-10 w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all">All Statuses</SelectItem>
                            {statuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {status.charAt(0) +
                                        status.slice(1).toLowerCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="h-10"
                        >
                            Clear
                            <X className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {/* Export to CSV */}
                    <Button
                        variant="outline"
                        className="h-10"
                        onClick={exportToCSV}
                        disabled={data.length === 0 || isLoading}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>

                    {/* Column visibility dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-10">
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                            <DropdownMenuLabel>
                                Toggle columns
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id
                                                .replace(/([A-Z])/g, " $1")
                                                .trim()}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {showNoMatchesState ? (
                <div className="bg-background flex flex-col items-center justify-center rounded-md border py-12 text-center">
                    <p className="text-muted-foreground mb-3">
                        No entries match your filters
                    </p>
                    <Button
                        variant="secondary"
                        onClick={clearFilters}
                        size="sm"
                    >
                        Clear all filters
                    </Button>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-md border shadow-sm">
                    {isLoading && (
                        <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                                <p className="text-muted-foreground text-sm">
                                    Loading data...
                                </p>
                            </div>
                        </div>
                    )}

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
                                                          header.column
                                                              .columnDef.header,
                                                          header.getContext(),
                                                      )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={
                                            row.getIsSelected() && "selected"
                                        }
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
                                        className="h-32 text-center"
                                    >
                                        {isLoading
                                            ? "Loading data..."
                                            : data.length === 0
                                              ? "No entries found"
                                              : "No results match your search"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-muted-foreground text-sm">
                    {filteredRowsCount === 0
                        ? "No entries"
                        : `${table.getFilteredRowModel().rows.length} of ${table.getCoreRowModel().rows.length} entries shown`}
                </div>
                <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium whitespace-nowrap">
                            Rows per page
                        </p>
                        <Select
                            value={String(rowsPerPage)}
                            onValueChange={(value) =>
                                setRowsPerPage(Number(value))
                            }
                        >
                            <SelectTrigger className="h-9 w-[70px]">
                                <SelectValue
                                    placeholder={String(rowsPerPage)}
                                />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 20, 50].map((pageSize) => (
                                    <SelectItem
                                        key={pageSize}
                                        value={String(pageSize)}
                                    >
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="h-9 w-9 p-0"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <ChevronDown className="h-4 w-4 rotate-90" />
                        </Button>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                            <p className="text-sm font-medium">Page</p>
                            <span className="text-sm font-medium">
                                {table.getState().pagination.pageIndex + 1} of{" "}
                                {table.getPageCount() || 1}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            className="h-9 w-9 p-0"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            <ChevronDown className="h-4 w-4 -rotate-90" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
