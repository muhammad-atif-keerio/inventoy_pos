"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import { format } from "date-fns";
import { CalendarIcon, Filter, Package, Palette, Store, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";

interface ThreadFiltersProps {
    filters: {
        vendorId: string | null;
        colorStatus: string | null;
        received: string | null;
        dateRange: {
            from: Date | null;
            to: Date | null;
        };
        searchQuery: string;
    };
    // eslint-disable-next-line no-unused-vars
    onFiltersChange: (filters: ThreadFiltersProps["filters"]) => void;
    onClearFilters?: () => void;
}

export function ThreadFilters({
    filters,
    onFiltersChange,
    onClearFilters,
}: ThreadFiltersProps) {
    const [vendors, setVendors] = useState<{ id: number; name: string }[]>([]);
    const [isLoadingVendors, setIsLoadingVendors] = useState(false);
    const [date, setDate] = useState<{
        from: Date | null;
        to: Date | null;
    }>(filters.dateRange);

    // Count active filters
    const activeFilterCount = React.useMemo(() => {
        let count = 0;
        if (filters.vendorId) count++;
        if (filters.colorStatus) count++;
        if (filters.received) count++;
        if (filters.dateRange.from || filters.dateRange.to) count++;
        if (filters.searchQuery) count++;
        return count;
    }, [filters]);

    // Fetch vendors for the filter
    useEffect(() => {
        const fetchVendors = async () => {
            setIsLoadingVendors(true);
            try {
                const response = await fetch("/api/vendors");
                if (!response.ok) {
                    throw new Error("Failed to fetch vendors");
                }
                const vendorData = await response.json();
                setVendors(vendorData);
            } catch (error) {
                console.error("Error fetching vendors:", error);
            } finally {
                setIsLoadingVendors(false);
            }
        };

        fetchVendors();
    }, []);

    // Handle changes to individual filter values
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFiltersChange({
            ...filters,
            searchQuery: e.target.value,
        });
    };

    const handleVendorChange = (vendorId: string | null) => {
        onFiltersChange({
            ...filters,
            vendorId,
        });
    };

    const handleColorStatusChange = (colorStatus: string | null) => {
        onFiltersChange({
            ...filters,
            colorStatus,
        });
    };

    const handleReceivedChange = (received: string | null) => {
        onFiltersChange({
            ...filters,
            received,
        });
    };

    // Handle date range changes
    const handleDateRangeChange = (range: {
        from: Date | null;
        to: Date | null;
    }) => {
        setDate(range);
        onFiltersChange({
            ...filters,
            dateRange: range,
        });
    };

    // Clear all filters
    const handleClearFilters = () => {
        if (onClearFilters) {
            onClearFilters();
        } else {
            setDate({ from: null, to: null });
            onFiltersChange({
                vendorId: null,
                colorStatus: null,
                received: null,
                dateRange: { from: null, to: null },
                searchQuery: "",
            });
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg font-medium">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span>Filter Orders</span>
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </div>
                    {activeFilterCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFilters}
                            className="text-muted-foreground h-8 px-2"
                        >
                            <X className="mr-1 h-4 w-4" />
                            Clear all
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
                {/* Search Query */}
                <div className="space-y-2">
                    <Label htmlFor="search">Search Orders</Label>
                    <div className="relative">
                        <Input
                            id="search"
                            placeholder="Search by thread type, color, reference..."
                            value={filters.searchQuery}
                            onChange={handleSearchChange}
                            className="w-full"
                        />
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Search across thread type, color, reference, and vendor
                        name
                    </p>
                </div>

                <Separator />

                {/* Vendor Filter */}
                <div className="space-y-2">
                    <Label htmlFor="vendor" className="flex items-center gap-2">
                        <Store className="text-muted-foreground h-4 w-4" />
                        Vendor
                    </Label>
                    <Select
                        value={filters.vendorId || ""}
                        onValueChange={(value) =>
                            handleVendorChange(value || null)
                        }
                    >
                        <SelectTrigger
                            id="vendor"
                            className={isLoadingVendors ? "opacity-70" : ""}
                        >
                            <SelectValue placeholder="All vendors" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All vendors</SelectItem>
                            {vendors.map((vendor) => (
                                <SelectItem
                                    key={vendor.id}
                                    value={vendor.id.toString()}
                                >
                                    {vendor.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Color Status */}
                <div className="space-y-2">
                    <Label
                        htmlFor="colorStatus"
                        className="flex items-center gap-2"
                    >
                        <Palette className="text-muted-foreground h-4 w-4" />
                        Color Status
                    </Label>
                    <Select
                        value={filters.colorStatus || ""}
                        onValueChange={(value) =>
                            handleColorStatusChange(value || null)
                        }
                    >
                        <SelectTrigger id="colorStatus">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All statuses</SelectItem>
                            <SelectItem value="RAW">Raw</SelectItem>
                            <SelectItem value="COLORED">Colored</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Received Status */}
                <div className="space-y-2">
                    <Label
                        htmlFor="received"
                        className="flex items-center gap-2"
                    >
                        <Package className="text-muted-foreground h-4 w-4" />
                        Received Status
                    </Label>
                    <Select
                        value={filters.received || ""}
                        onValueChange={(value) =>
                            handleReceivedChange(value || null)
                        }
                    >
                        <SelectTrigger id="received">
                            <SelectValue placeholder="All orders" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All orders</SelectItem>
                            <SelectItem value="true">Received</SelectItem>
                            <SelectItem value="false">Pending</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Separator />

                {/* Date Range Picker */}
                <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center gap-2">
                        <CalendarIcon className="text-muted-foreground h-4 w-4" />
                        Order Date Range
                    </Label>
                    <div className="grid gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date.from &&
                                            !date.to &&
                                            "text-muted-foreground",
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y")}{" "}
                                                - {format(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        "Select date range"
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date.from || new Date()}
                                    selected={{
                                        from: date.from || undefined,
                                        to: date.to || undefined,
                                    }}
                                    onSelect={(selectedRange) => {
                                        handleDateRangeChange({
                                            from: selectedRange?.from || null,
                                            to: selectedRange?.to || null,
                                        });
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Clear Date Range Button */}
                        {(date.from || date.to) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    handleDateRangeChange({
                                        from: null,
                                        to: null,
                                    })
                                }
                                className="mt-2"
                            >
                                <X className="mr-1 h-4 w-4" />
                                Clear Date Range
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
