"use client";

import * as React from "react";

import {
    ColumnDef,
    ColumnFiltersState,
    RowSelectionState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    DownloadIcon,
    Loader2,
    PlusCircle,
    RefreshCw,
    SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData[];
    isLoading?: boolean;
    searchPlaceholder?: string;
    onRefresh?: () => void;
    // eslint-disable-next-line no-unused-vars
    onSelectedRowsChange?: (rows: TData[]) => void;
    addNewButton?: () => void;
    addNewButtonLabel?: string;
    onExport?: () => void;
    exportButtonLabel?: string;
    tableSummary?: React.ReactNode;
}

export function DataTable<TData>({
    columns,
    data,
    isLoading = false,
    searchPlaceholder = "Filter records...",
    onRefresh,
    onSelectedRowsChange,
    addNewButton,
    addNewButtonLabel = "Add New",
    onExport,
    exportButtonLabel = "Export",
    tableSummary,
}: DataTableProps<TData>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );
    const [globalFilter, setGlobalFilter] = React.useState("");

    // Create table instance
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        enableRowSelection: true,
        enableMultiRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        // Use a generic row ID function that works for objects with or without id
        getRowId: (originalRow, index) => {
            // @ts-expect-error - We know this might not be type-safe but it's the best approach here
            return originalRow.id?.toString?.() || index.toString();
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
    });

    // When rowSelection changes, call the onSelectedRowsChange callback
    React.useEffect(() => {
        if (onSelectedRowsChange) {
            // Use the table's selected rows directly instead of calculating from rowSelection
            const selectedItems = table
                .getSelectedRowModel()
                .rows.map((row) => row.original);
            onSelectedRowsChange(selectedItems);
        }
    }, [rowSelection, table, onSelectedRowsChange]);

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col items-start gap-2 py-4 md:flex-row md:items-center">
                <Input
                    placeholder={searchPlaceholder}
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-full md:w-auto md:max-w-sm"
                />
                <div className="flex-1" />
                <div className="flex flex-wrap items-center gap-2">
                    {onRefresh && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto gap-1"
                            onClick={onRefresh}
                            disabled={isLoading}
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </Button>
                    )}

                    {addNewButton && (
                        <Button
                            size="sm"
                            className="gap-1"
                            onClick={addNewButton}
                        >
                            <PlusCircle className="h-4 w-4" />
                            {addNewButtonLabel}
                        </Button>
                    )}

                    {onExport && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExport}
                            className="gap-1"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            {exportButtonLabel}
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-auto gap-1"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                View
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                                                .replace(/^./, function (str) {
                                                    return str.toUpperCase();
                                                })}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className="whitespace-nowrap"
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
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="text-primary h-6 w-6 animate-spin" />
                                        <p className="text-muted-foreground text-sm">
                                            Loading data...
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                    className={`${row.getIsSelected() ? "bg-muted/40" : ""}`}
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
                                    No results found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-2">
                {tableSummary || (
                    <div className="text-muted-foreground flex gap-1 text-sm">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s)
                        selected.
                    </div>
                )}

                <div className="flex items-center justify-between space-x-2">
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
