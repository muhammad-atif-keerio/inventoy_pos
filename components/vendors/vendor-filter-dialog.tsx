"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Calendar, FilterIcon, SearchIcon, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function VendorFilterDialog() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = React.useState(false);

    // Initialize filter state from URL params
    const [filters, setFilters] = React.useState({
        search: searchParams.get("search") || "",
        hasActiveOrders: searchParams.get("hasActiveOrders") === "true",
        city: searchParams.get("city") || "",
        sortBy: searchParams.get("sortBy") || "name",
        sortOrder: searchParams.get("sortOrder") || "asc",
    });

    const [activeFilters, setActiveFilters] = React.useState<string[]>([]);

    // Update active filters display
    React.useEffect(() => {
        const newActiveFilters: string[] = [];

        if (filters.search) newActiveFilters.push("Search");
        if (filters.hasActiveOrders) newActiveFilters.push("Active Orders");
        if (filters.city) newActiveFilters.push("City");
        if (filters.sortBy !== "name" || filters.sortOrder !== "asc")
            newActiveFilters.push("Sort");

        setActiveFilters(newActiveFilters);
    }, [filters]);

    // Handle filter changes
    const handleFilterChange = (key: string, value: string | boolean) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    // Apply filters
    const applyFilters = () => {
        const params = new URLSearchParams();

        if (filters.search) params.set("search", filters.search);
        if (filters.hasActiveOrders) params.set("hasActiveOrders", "true");
        if (filters.city) params.set("city", filters.city);
        if (filters.sortBy !== "name") params.set("sortBy", filters.sortBy);
        if (filters.sortOrder !== "asc")
            params.set("sortOrder", filters.sortOrder);

        router.push(`${pathname}?${params.toString()}`);
        setOpen(false);
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            search: "",
            hasActiveOrders: false,
            city: "",
            sortBy: "name",
            sortOrder: "asc",
        });

        router.push(pathname);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    <span>Filter</span>
                    {activeFilters.length > 0 && (
                        <Badge
                            variant="secondary"
                            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                        >
                            {activeFilters.length}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Filter Vendors</DialogTitle>
                    <DialogDescription>
                        Apply filters to find specific vendors or sort the
                        results.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Search */}
                    <div className="space-y-2">
                        <Label htmlFor="search" className="flex items-center">
                            <SearchIcon className="mr-2 h-4 w-4" />
                            Search
                        </Label>
                        <Input
                            id="search"
                            placeholder="Search by name, contact, or email"
                            value={filters.search}
                            onChange={(e) =>
                                handleFilterChange("search", e.target.value)
                            }
                        />
                        <p className="text-muted-foreground text-sm">
                            Search across vendor name, contact number, email,
                            and city
                        </p>
                    </div>

                    <Separator />

                    {/* City filter */}
                    <div className="space-y-2">
                        <Label htmlFor="city" className="flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            City
                        </Label>
                        <Input
                            id="city"
                            placeholder="Filter by city"
                            value={filters.city}
                            onChange={(e) =>
                                handleFilterChange("city", e.target.value)
                            }
                        />
                        <p className="text-muted-foreground text-sm">
                            Show vendors from a specific city
                        </p>
                    </div>

                    <Separator />

                    {/* Active orders checkbox */}
                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="hasActiveOrders"
                            checked={filters.hasActiveOrders}
                            onCheckedChange={(checked) =>
                                handleFilterChange(
                                    "hasActiveOrders",
                                    checked === true,
                                )
                            }
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor="hasActiveOrders"
                                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Show only vendors with active orders
                            </Label>
                            <p className="text-muted-foreground text-sm">
                                Filter out vendors that don&apos;t have any
                                current orders
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* Sorting */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label
                                htmlFor="sortBy"
                                className="flex items-center"
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                Sort By
                            </Label>
                            <Select
                                value={filters.sortBy}
                                onValueChange={(value) =>
                                    handleFilterChange("sortBy", value)
                                }
                            >
                                <SelectTrigger id="sortBy">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="city">City</SelectItem>
                                    <SelectItem value="activeOrders">
                                        Active Orders
                                    </SelectItem>
                                    <SelectItem value="totalPurchases">
                                        Total Purchases
                                    </SelectItem>
                                    <SelectItem value="createdAt">
                                        Date Added
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sortOrder">Order</Label>
                            <Select
                                value={filters.sortOrder}
                                onValueChange={(value) =>
                                    handleFilterChange("sortOrder", value)
                                }
                            >
                                <SelectTrigger id="sortOrder">
                                    <SelectValue placeholder="Sort order" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="asc">
                                        Ascending
                                    </SelectItem>
                                    <SelectItem value="desc">
                                        Descending
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {activeFilters.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        <div className="text-sm font-medium">
                            Active filters:
                        </div>
                        {activeFilters.map((filter) => (
                            <Badge key={filter} variant="secondary">
                                {filter}
                            </Badge>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={clearFilters}>
                        Clear All
                    </Button>
                    <Button onClick={applyFilters}>Apply Filters</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
