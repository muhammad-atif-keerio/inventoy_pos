"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import {
    BarChart3,
    Building2,
    Download,
    FileDownIcon,
    Filter,
    PlusCircle,
    RefreshCw,
    Search,
    ShoppingCart,
    TrendingUp,
    UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { columns } from "./columns";
import { VendorItem } from "./columns";
import { DataTable } from "./data-table";
import { OptimisticAction, VendorContext } from "./vendor-context";

// Context type and action types are now imported from vendor-context

export default function VendorsPage() {
    const router = useRouter();

    // State for vendor data and UI state
    const [vendors, setVendors] = React.useState<VendorItem[]>([]);
    const [filteredVendors, setFilteredVendors] = React.useState<VendorItem[]>(
        [],
    );
    const [isLoading, setIsLoading] = React.useState(true);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [selectedVendors, setSelectedVendors] = React.useState<string[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");

    // State for optimistic updates
    const [optimisticActions, setOptimisticActions] = React.useState<
        OptimisticAction[]
    >([]);

    // Filter state
    const [activeFilter, setActiveFilter] = React.useState("all");
    const [cityFilter, setCityFilter] = React.useState<string>("all");

    // Get unique cities for filtering
    const uniqueCities = React.useMemo(() => {
        if (!Array.isArray(vendors)) {
            return [];
        }

        const cities = vendors
            .map((vendor) => vendor.city)
            .filter((city): city is string => Boolean(city))
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
        return cities;
    }, [vendors]);

    // Fetch vendors data
    const fetchVendors = React.useCallback(async () => {
        setIsLoading(true);
        try {
            // Build API URL with appropriate query parameters
            let url = "/api/vendors";

            // Add query parameters
            const params = new URLSearchParams();

            // Add active orders filter if needed
            if (activeFilter === "active") {
                params.append("hasActiveOrders", "true");
            }

            // Add the query parameters to the URL
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch vendors: ${response.statusText}`,
                );
            }

            const data = await response.json();

            // Extract vendors from the response structure
            if (data && Array.isArray(data.vendors)) {
                setVendors(data.vendors);
                // Clear optimistic actions after successful fetch
                setOptimisticActions([]);
            } else {
                console.error("Unexpected API response structure:", data);
                setVendors([]);
            }
        } catch (error) {
            console.error("Error fetching vendors:", error);
            toast.error("Failed to fetch vendors");
            setVendors([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeFilter]);

    // Apply filters to vendors
    React.useEffect(() => {
        // Skip filtering if we're still loading
        if (isLoading) return;

        // Only filter if we have vendors to filter
        if (Array.isArray(vendors) && vendors.length > 0) {
            // Apply optimistic updates to a copy of the vendors list
            let updatedVendors = [...vendors];

            // Apply each optimistic action
            optimisticActions.forEach((action) => {
                if (action.type === "add") {
                    updatedVendors = [action.item, ...updatedVendors];
                } else if (action.type === "update") {
                    updatedVendors = updatedVendors.map((vendor) =>
                        vendor.id === action.item.id ? action.item : vendor,
                    );
                } else if (action.type === "delete") {
                    updatedVendors = updatedVendors.filter(
                        (vendor) => vendor.id !== action.id,
                    );
                }
            });

            // Filter by search query
            let filtered = [...updatedVendors]; // Create a new array to avoid reference issues

            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                filtered = filtered.filter(
                    (vendor) =>
                        vendor.name.toLowerCase().includes(lowerQuery) ||
                        vendor.contact.toLowerCase().includes(lowerQuery) ||
                        (vendor.email &&
                            vendor.email.toLowerCase().includes(lowerQuery)) ||
                        (vendor.city &&
                            vendor.city.toLowerCase().includes(lowerQuery)),
                );
            }

            // Filter by city if selected
            if (cityFilter && cityFilter !== "all") {
                filtered = filtered.filter(
                    (vendor) => vendor.city === cityFilter,
                );
            }

            // Update filtered vendors - using functional update to avoid dependency on filteredVendors
            setFilteredVendors(filtered);
        } else {
            // Set to empty array when no vendors
            setFilteredVendors([]);
        }
    }, [vendors, searchQuery, cityFilter, isLoading, optimisticActions]);

    // Initial data fetch
    React.useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    // Handle tab change
    const handleTabChange = (value: string) => {
        setActiveFilter(value);
    };

    // Handle vendor row selection
    const handleRowSelectionChange = (selection: Record<string, boolean>) => {
        const selectedIds = Object.keys(selection).filter(
            (id) => selection[id],
        );
        setSelectedVendors(selectedIds);
    };

    // Reset filters
    const resetFilters = () => {
        setSearchQuery("");
        setCityFilter("all");
        setFilterOpen(false);
    };

    // Function to handle optimistic updates
    const addOptimisticAction = (action: OptimisticAction) => {
        setOptimisticActions((prev) => [...prev, action]);
    };

    // Calculate stats
    const stats = React.useMemo(() => {
        if (!Array.isArray(vendors)) {
            return {
                totalVendors: 0,
                vendorsWithActiveOrders: 0,
                totalActiveOrders: 0,
                totalPurchases: 0,
            };
        }

        const totalVendors = vendors.length;
        const vendorsWithActiveOrders = vendors.filter(
            (v) => (v.activeOrders || 0) > 0,
        ).length;
        const totalActiveOrders = vendors.reduce(
            (sum, v) => sum + (v.activeOrders || 0),
            0,
        );
        const totalPurchases = vendors.reduce(
            (sum, v) => sum + (v.totalPurchases || 0),
            0,
        );

        return {
            totalVendors,
            vendorsWithActiveOrders,
            totalActiveOrders,
            totalPurchases,
        };
    }, [vendors]);

    // Handle creating a new vendor
    const handleCreateVendor = () => {
        router.push("/vendors/new");
    };

    // Handle exporting selected vendors
    const handleExport = () => {
        if (selectedVendors.length === 0) {
            toast.error("No vendors selected for export");
            return;
        }

        if (!Array.isArray(vendors)) {
            toast.error("No vendor data available");
            return;
        }

        try {
            // Get selected vendors data
            const selectedData = vendors.filter((vendor) =>
                selectedVendors.includes(vendor.id.toString()),
            );

            // Format the data for CSV
            const headers = [
                "ID",
                "Name",
                "Contact",
                "Email",
                "City",
                "Address",
                "Active Orders",
                "Total Purchases (PKR)",
            ];

            const csvContent = [
                headers.join(","),
                ...selectedData.map((vendor) =>
                    [
                        vendor.id,
                        `"${vendor.name}"`,
                        `"${vendor.contact}"`,
                        `"${vendor.email || ""}"`,
                        `"${vendor.city || ""}"`,
                        `"${vendor.address || ""}"`,
                        vendor.activeOrders || 0,
                        vendor.totalPurchases || 0,
                    ].join(","),
                ),
            ].join("\n");

            // Create download link
            const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `vendors-${new Date().toISOString().slice(0, 10)}.csv`,
            );
            document.body.appendChild(link);
            link.click();

            // Clean up
            link.remove();
            URL.revokeObjectURL(url);

            toast.success(`Exported ${selectedData.length} vendors to CSV`);
        } catch (error) {
            console.error("Error exporting vendors:", error);
            toast.error("Failed to export vendors");
        }
    };

    // Handle navigating to analytics
    const handleViewAnalytics = () => {
        router.push("/vendors/analytics");
    };

    // Create context value
    const contextValue = {
        vendors,
        addOptimisticAction,
        refreshVendors: fetchVendors,
    };

    return (
        <VendorContext.Provider value={contextValue}>
            <div className="space-y-6 p-6">
                {/* Page title and actions */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Vendors
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your suppliers and thread purchase vendors
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={handleCreateVendor}
                            className="gap-1.5"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Add Vendor
                        </Button>

                        <Button
                            variant="outline"
                            className="gap-1.5"
                            onClick={fetchVendors}
                            disabled={isLoading}
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-1.5">
                                    <FileDownIcon className="h-4 w-4" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={handleExport}
                                    disabled={selectedVendors.length === 0}
                                    className={
                                        selectedVendors.length === 0
                                            ? "cursor-not-allowed opacity-50"
                                            : ""
                                    }
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Selected ({selectedVendors.length})
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        setSelectedVendors(
                                            vendors.map((v) => v.id.toString()),
                                        )
                                    }
                                >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Select All Vendors
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            onClick={handleViewAnalytics}
                            className="gap-1.5"
                        >
                            <BarChart3 className="h-4 w-4" />
                            Analytics
                        </Button>
                    </div>
                </div>

                {/* Stats overview */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">
                                Total Vendors
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div className="flex items-center">
                                    <Building2 className="mr-2 h-5 w-5 text-blue-500" />
                                    <div className="text-2xl font-bold">
                                        {stats.totalVendors}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-none bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">
                                Active Vendors
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div className="flex items-center">
                                    <UserCheck className="mr-2 h-5 w-5 text-amber-500" />
                                    <div className="text-2xl font-bold">
                                        {stats.vendorsWithActiveOrders}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-none bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">
                                Active Orders
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div className="flex items-center">
                                    <ShoppingCart className="mr-2 h-5 w-5 text-emerald-500" />
                                    <div className="text-2xl font-bold">
                                        {stats.totalActiveOrders}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-none bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">
                                Total Purchases
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div className="flex items-center">
                                    <TrendingUp className="mr-2 h-5 w-5 text-violet-500" />
                                    <div className="text-2xl font-bold">
                                        PKR{" "}
                                        {stats.totalPurchases.toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs and filters */}
                <div className="flex flex-col gap-4">
                    <Tabs
                        defaultValue={activeFilter}
                        onValueChange={handleTabChange}
                        className="w-full"
                    >
                        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <TabsList className="bg-muted/60">
                                <TabsTrigger value="all">
                                    All Vendors
                                </TabsTrigger>
                                <TabsTrigger value="active">
                                    Active Vendors
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex flex-wrap items-center gap-2">
                                <Sheet
                                    open={filterOpen}
                                    onOpenChange={setFilterOpen}
                                >
                                    <SheetTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                        >
                                            <Filter className="h-4 w-4" />
                                            Filter
                                            {cityFilter !== "all" && (
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-1 rounded-sm px-1"
                                                >
                                                    1
                                                </Badge>
                                            )}
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent className="w-full px-4">
                                        <SheetHeader>
                                            <SheetTitle>
                                                Filter Vendors
                                            </SheetTitle>
                                            <SheetDescription>
                                                Apply filters to narrow down
                                                your vendor list.
                                            </SheetDescription>
                                        </SheetHeader>

                                        <div className="mt-6 space-y-6">
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-medium">
                                                    City
                                                </h3>
                                                <Select
                                                    value={cityFilter}
                                                    onValueChange={
                                                        setCityFilter
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select city" />
                                                    </SelectTrigger>
                                                    <SelectContent className="w-full">
                                                        <SelectItem value="all">
                                                            All Cities
                                                        </SelectItem>
                                                        {uniqueCities.map(
                                                            (city) => (
                                                                <SelectItem
                                                                    key={city}
                                                                    value={city}
                                                                >
                                                                    {city}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <SheetFooter className="mt-6 flex justify-between">
                                            <Button
                                                variant="outline"
                                                onClick={resetFilters}
                                            >
                                                Reset Filters
                                            </Button>
                                            <SheetClose asChild>
                                                <Button>Apply Filters</Button>
                                            </SheetClose>
                                        </SheetFooter>
                                    </SheetContent>
                                </Sheet>

                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                                    <Input
                                        type="search"
                                        placeholder="Search vendors..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="w-[200px] pl-8 md:w-[250px]"
                                    />
                                </div>
                            </div>
                        </div>

                        <TabsContent value="all" className="m-0">
                            <DataTable
                                columns={columns}
                                data={filteredVendors}
                                onRowSelectionChange={handleRowSelectionChange}
                                isLoading={isLoading}
                            />
                        </TabsContent>

                        <TabsContent value="active" className="m-0">
                            <DataTable
                                columns={columns}
                                data={filteredVendors}
                                onRowSelectionChange={handleRowSelectionChange}
                                isLoading={isLoading}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </VendorContext.Provider>
    );
}
