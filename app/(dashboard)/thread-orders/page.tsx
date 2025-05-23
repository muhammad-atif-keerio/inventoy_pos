"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { format } from "date-fns";
import {
    AlertCircle,
    CalendarIcon,
    CheckCircle2,
    Clock,
    Coins,
    FileDown,
    FilePlus,
    Filter,
    Package,
    Palette,
    PieChart,
    Search,
    ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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

import { ThreadPurchase, columns } from "./columns";
import { DataTable } from "./data-table";

// Helper function to format currency
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
    }).format(amount);
};

// Simple DateRangePicker component
interface DateRange {
    from: Date | null;
    to: Date | null;
}

interface DatePickerProps {
    date: DateRange;
    // eslint-disable-next-line no-unused-vars
    onChange: (date: DateRange) => void;
}

function DatePickerWithRange({ date, onChange }: DatePickerProps) {
    return (
        <div className="grid gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date.from && "text-muted-foreground",
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={date.from || undefined}
                        selected={{
                            from: date.from || undefined,
                            to: date.to || undefined,
                        }}
                        onSelect={(selectedDate) => {
                            onChange({
                                from: selectedDate?.from || null,
                                to: selectedDate?.to || null,
                            });
                        }}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

// Define API response type
interface ThreadPurchaseAPIResponse {
    id: number;
    vendorId: number;
    vendor?: {
        id: number;
        name: string;
    };
    vendorName?: string;
    orderDate: string;
    threadType: string;
    color: string | null;
    colorStatus: "COLORED" | "RAW";
    quantity: number;
    unitPrice: number;
    totalCost: number;
    unitOfMeasure: string;
    deliveryDate: string | null;
    remarks?: string | null;
    reference: string | null;
    received: boolean;
    receivedAt: string | null;
    inventoryStatus?: string | null;
    hasDyeingProcess?: boolean;
    dyeingProcessId: number | null;
    dyeingProcess?: {
        id: number;
        colorName?: string;
        colorCode?: string;
        resultStatus: string;
    };
    dyeingStatus?: string | null;
    dyedColor?: string | null;
    dyeingCompleted?: boolean;
    inventory: {
        inventoryId: number;
        currentQuantity: number;
        itemCode: string;
        location: string | null;
    } | null;
    paymentStatus?: string;
    paymentCount?: number;
    totalPaid?: number;
    paymentTransactions?: Array<{
        id: number;
        amount: number;
        mode: string;
        transactionDate: string;
    }>;
}

// Wrap the component in a function to use the searchParams hook safely
function ThreadOrdersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State for thread purchases
    const [threadPurchases, setThreadPurchases] = useState<ThreadPurchase[]>(
        [],
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // State for filters
    const [filters, setFilters] = useState({
        vendorId: searchParams?.get("vendor"),
        colorStatus: searchParams?.get("colorStatus"),
        received: searchParams?.get("received"),
        threadType: searchParams?.get("threadType"),
        dateRange: {
            from: searchParams?.get("from")
                ? new Date(searchParams?.get("from") as string)
                : null,
            to: searchParams?.get("to")
                ? new Date(searchParams?.get("to") as string)
                : null,
        },
        searchQuery: searchParams?.get("search") || "",
    });

    // UI state
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>(
        {},
    );
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("all");

    // Count of selected rows
    const selectedCount = useMemo(() => {
        return Object.values(selectedRows).filter(Boolean).length;
    }, [selectedRows]);

    // Track the previous selection to avoid unnecessary updates
    const previousSelectionRef = React.useRef<string[]>([]);

    // Filter thread purchases based on active tab
    const filteredThreadPurchases = useMemo(() => {
        // Add defensive check to ensure threadPurchases is an array
        if (!Array.isArray(threadPurchases)) {
            return [];
        }

        let filtered = [...threadPurchases];

        // Apply search filter
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(
                (
                    order: ThreadPurchase & {
                        vendor: { id: number; name: string };
                    },
                ) =>
                    (order.reference &&
                        order.reference.toLowerCase().includes(query)) ||
                    (order.threadType &&
                        order.threadType.toLowerCase().includes(query)) ||
                    (order.color &&
                        order.color.toLowerCase().includes(query)) ||
                    (order.vendor &&
                        order.vendor.name &&
                        order.vendor.name.toLowerCase().includes(query)),
            );
        }

        // Apply tab filter
        if (activeTab === "pending") {
            filtered = filtered.filter(
                (order: ThreadPurchase) => !order.received,
            );
        } else if (activeTab === "received") {
            filtered = filtered.filter(
                (order: ThreadPurchase) => order.received,
            );
        }

        return filtered;
    }, [threadPurchases, filters.searchQuery, activeTab]);

    // Get unique thread types for filter dropdown
    const uniqueThreadTypes = useMemo(() => {
        if (!Array.isArray(threadPurchases)) {
            return [];
        }
        const types = threadPurchases
            .map((order) => order.threadType)
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
        return types;
    }, [threadPurchases]);

    // Get unique vendors for filter dropdown
    const uniqueVendors = useMemo(() => {
        if (!Array.isArray(threadPurchases)) {
            return [];
        }

        const vendors = threadPurchases
            .filter((order) => order && order.vendor) // Filter out orders with missing vendor data
            .map((order) => ({
                id: order.vendor?.id?.toString() || `unknown-${Math.random()}`,
                name: order.vendor?.name || "Unknown Vendor",
            }))
            .filter(
                (value, index, self) =>
                    self.findIndex((v) => v.id === value.id) === index,
            )
            .sort((a, b) => a.name.localeCompare(b.name));
        return vendors;
    }, [threadPurchases]);

    // Summary statistics
    const orderStats = useMemo(() => {
        if (!threadPurchases.length) {
            return {
                totalOrders: 0,
                pendingOrders: 0,
                receivedOrders: 0,
                totalValue: 0,
                averageOrder: 0,
                inInventory: 0,
                dyedItems: 0,
            };
        }

        const pendingOrders = threadPurchases.filter(
            (order) => !order.received,
        ).length;
        const receivedOrders = threadPurchases.filter(
            (order) => order.received,
        ).length;
        const totalValue = threadPurchases.reduce(
            (sum, order) => sum + Number(order.totalCost),
            0,
        );
        const averageOrder = totalValue / threadPurchases.length;
        const inInventory = threadPurchases.filter(
            (order) => order.inventory !== null,
        ).length;
        const dyedItems = threadPurchases.filter(
            (order) =>
                order.dyeingProcess &&
                order.dyeingProcess.resultStatus === "COMPLETED",
        ).length;

        return {
            totalOrders: threadPurchases.length,
            pendingOrders,
            receivedOrders,
            totalValue,
            averageOrder,
            inInventory,
            dyedItems,
        };
    }, [threadPurchases]);

    // Handle row selection
    const handleRowSelectionChange = useCallback(
        (selectedThreadPurchases: ThreadPurchase[]) => {
            // Get an array of selected IDs
            const selectedIds = selectedThreadPurchases.map((item) =>
                item.id.toString(),
            );

            // Check if the selection has actually changed by comparing sorted arrays
            const currentSelection = [...selectedIds].sort();
            const previousSelection = [...previousSelectionRef.current].sort();

            // Only update state if truly different selection
            if (
                currentSelection.length !== previousSelection.length ||
                currentSelection.some((id, i) => id !== previousSelection[i])
            ) {
                // Update the ref with current selection
                previousSelectionRef.current = selectedIds;

                // Update the state with selected items as a map
                const newSelectedRows = selectedThreadPurchases.reduce<
                    Record<string, boolean>
                >((acc, item) => {
                    acc[item.id.toString()] = true;
                    return acc;
                }, {});

                setSelectedRows(newSelectedRows);
            }
        },
        [],
    );

    // Update the fetchThreadPurchases function to improve error handling and data normalization
    const fetchThreadPurchases = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Build query params
            const params = new URLSearchParams();

            // Add filters if set
            if (filters.vendorId) {
                params.append("vendorId", filters.vendorId);
            }

            if (filters.colorStatus) {
                params.append("colorStatus", filters.colorStatus);
            }

            if (filters.received) {
                params.append("received", filters.received);
            }

            if (filters.threadType) {
                params.append("threadType", filters.threadType);
            }

            if (filters.dateRange.from) {
                params.append("from", filters.dateRange.from.toISOString());
            }

            if (filters.dateRange.to) {
                params.append("to", filters.dateRange.to.toISOString());
            }

            if (filters.searchQuery) {
                params.append("search", filters.searchQuery);
            }

            // Always include inventory data and payment data
            params.append("includeInventory", "true");
            params.append("includePayments", "true");
            params.append("includeDyeingProcess", "true");

            // Include pagination params
            params.append("page", "1");
            params.append("limit", "500"); // Higher limit to get all data

            // Primary endpoint with fallback logic
            const response = await fetch(`/api/thread?${params.toString()}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(
                    errorData?.error ||
                        `Failed to fetch thread purchases: ${response.status} ${response.statusText}`,
                );
            }

            let data;
            try {
                data = await response.json();
            } catch (error) {
                console.error("Error parsing response:", error);
                throw new Error("Invalid response format from server");
            }

            // Process the data based on API response structure
            let threadPurchaseData: ThreadPurchaseAPIResponse[] = [];

            if (data.data && Array.isArray(data.data)) {
                threadPurchaseData = data.data;
            } else if (Array.isArray(data)) {
                threadPurchaseData = data;
            } else {
                console.warn("Unexpected API response format:", data);
                setThreadPurchases([]);
                setError("Unexpected API response format");
                return;
            }

            // Normalize thread purchase data with improved handling for all fields
            const normalizedPurchases = threadPurchaseData.map(
                (purchase: ThreadPurchaseAPIResponse) => {
                    // Ensure we have a valid colorStatus value
                    let colorStatus = purchase.colorStatus;
                    if (
                        !colorStatus ||
                        !["COLORED", "RAW"].includes(colorStatus)
                    ) {
                        colorStatus = purchase.color ? "COLORED" : "RAW";
                    }

                    // Ensure we have valid payment data
                    const paymentStatus = purchase.paymentStatus || "PENDING";
                    const paymentCount = purchase.paymentCount || 0;
                    const totalPaid = purchase.totalPaid || 0;

                    // Ensure we have valid dyeing process data
                    const hasDyeingProcess = Boolean(
                        purchase.hasDyeingProcess || purchase.dyeingProcessId,
                    );

                    // Handle vendor data properly
                    const vendorName =
                        purchase.vendorName ||
                        (purchase.vendor &&
                        typeof purchase.vendor === "object" &&
                        "name" in purchase.vendor
                            ? purchase.vendor.name
                            : "Unknown Vendor");
                    const vendorId =
                        purchase.vendorId ||
                        (purchase.vendor &&
                        typeof purchase.vendor === "object" &&
                        "id" in purchase.vendor
                            ? purchase.vendor.id
                            : 0);

                    return {
                        id: purchase.id,
                        vendorId: vendorId,
                        vendor: {
                            id: vendorId,
                            name: vendorName,
                        },
                        orderDate: purchase.orderDate,
                        threadType: purchase.threadType,
                        color: purchase.color,
                        colorStatus, // Use the validated value
                        quantity: purchase.quantity,
                        unitPrice: purchase.unitPrice,
                        totalCost: purchase.totalCost,
                        unitOfMeasure: purchase.unitOfMeasure || "meters",
                        deliveryDate: purchase.deliveryDate,
                        remarks: purchase.remarks || null,
                        reference: purchase.reference || null,
                        received: Boolean(purchase.received),
                        receivedAt: purchase.receivedAt,
                        inventoryStatus: purchase.inventoryStatus || null,
                        dyeingProcess: hasDyeingProcess
                            ? {
                                  id: purchase.dyeingProcessId || 0,
                                  colorName: purchase.dyedColor || null,
                                  colorCode:
                                      purchase.dyedColor &&
                                      purchase.dyedColor.startsWith("#")
                                          ? purchase.dyedColor
                                          : null,
                                  resultStatus:
                                      purchase.dyeingStatus ||
                                      (purchase.dyeingCompleted
                                          ? "COMPLETED"
                                          : "PENDING"),
                              }
                            : null,
                        inventory: purchase.inventory
                            ? {
                                  inventoryId:
                                      purchase.inventory.inventoryId || 0,
                                  itemCode:
                                      purchase.inventory.itemCode ||
                                      `THREAD-${purchase.id}`,
                                  currentQuantity:
                                      purchase.inventory.currentQuantity || 0,
                                  location: purchase.inventory.location || null,
                              }
                            : null,
                        paymentStatus,
                        paymentCount,
                        totalPaid,
                    };
                },
            );

            setThreadPurchases(normalizedPurchases);
            console.log(
                `Successfully loaded ${normalizedPurchases.length} thread purchases`,
            );
        } catch (error) {
            console.error("Error fetching thread purchases:", error);
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to fetch thread purchases",
            );
            setThreadPurchases([]);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Initial fetch - add empty dependency array to only run once on mount
    useEffect(() => {
        fetchThreadPurchases();
    }, [fetchThreadPurchases]);

    // Handle filter changes
    const handleFiltersChange = (newFilters: typeof filters) => {
        setFilters(newFilters);
        // Could implement pushing these to URL for shareable filtered views
    };

    // Reset filters
    const resetFilters = () => {
        setFilters({
            vendorId: null,
            colorStatus: null,
            received: null,
            threadType: null,
            dateRange: {
                from: null,
                to: null,
            },
            searchQuery: "",
        });
        setIsFilterOpen(false);
    };

    // Handle tab change
    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    // Create new thread order
    const handleCreateOrder = () => {
        router.push("/thread-orders/new");
    };

    // Export selected orders
    const handleExport = async () => {
        if (selectedCount === 0) {
            toast.error("No orders selected for export");
            return;
        }

        try {
            setIsExporting(true);

            // Get selected thread purchases
            const selectedItems = threadPurchases.filter(
                (purchase) => selectedRows[purchase.id.toString()],
            );

            if (selectedItems.length === 0) {
                toast.error("No orders found to export");
                return;
            }

            // Prepare CSV headers
            const headers = [
                "Order ID",
                "Reference",
                "Vendor",
                "Order Date",
                "Thread Type",
                "Color",
                "Color Status",
                "Quantity",
                "Unit",
                "Unit Price",
                "Total Cost",
                "Delivery Date",
                "Status",
                "Received Date",
                "Dyeing Status",
                "Inventory ID",
                "Current Stock",
                "Remarks",
            ];

            // Format data for CSV
            const csvContent = [
                headers.join(","),
                ...selectedItems.map((purchase) => {
                    // Format date values
                    const orderDate = purchase.orderDate
                        ? new Date(purchase.orderDate).toLocaleDateString()
                        : "";
                    const deliveryDate = purchase.deliveryDate
                        ? new Date(purchase.deliveryDate).toLocaleDateString()
                        : "";
                    const receivedDate = purchase.receivedAt
                        ? new Date(purchase.receivedAt).toLocaleDateString()
                        : "";

                    // Format other values with proper escaping for CSV
                    return [
                        purchase.id,
                        `"${purchase.reference || ""}"`,
                        `"${purchase.vendor?.name || "Unknown"}"`,
                        orderDate,
                        `"${purchase.threadType}"`,
                        `"${purchase.color || ""}"`,
                        purchase.colorStatus,
                        purchase.quantity,
                        `"${purchase.unitOfMeasure}"`,
                        purchase.unitPrice,
                        purchase.totalCost,
                        deliveryDate,
                        purchase.received ? "Received" : "Pending",
                        receivedDate,
                        `"${purchase.dyeingProcess ? purchase.dyeingProcess.resultStatus || "Not Started" : "N/A"}"`,
                        purchase.inventory
                            ? purchase.inventory.inventoryId
                            : "",
                        purchase.inventory
                            ? purchase.inventory.currentQuantity
                            : "",
                        `"${purchase.remarks || ""}"`,
                    ].join(",");
                }),
            ].join("\n");

            // Create a downloadable blob
            const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);

            // Create a temporary link and trigger download
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `thread-orders-export-${new Date().toISOString().slice(0, 10)}.csv`,
            );
            document.body.appendChild(link);
            link.click();

            // Clean up
            link.remove();
            URL.revokeObjectURL(url);

            toast.success(
                `Successfully exported ${selectedItems.length} orders`,
            );
        } catch (error) {
            console.error("Error exporting thread purchases:", error);
            toast.error("Failed to export data");
        } finally {
            setIsExporting(false);
        }
    };

    // View analytics
    const handleViewAnalytics = () => {
        router.push("/thread-orders/analytics");
    };

    // Custom TabPanel component for tab content
    const TabPanel = ({
        value,
        children,
    }: {
        value: string;
        children: React.ReactNode;
    }) => (
        <div role="tabpanel" hidden={activeTab !== value} className="m-0">
            {activeTab === value && children}
        </div>
    );

    return (
        <div className="container space-y-4 p-4 py-4 sm:space-y-6 sm:py-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        Thread Orders
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Manage your thread purchases and inventory
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={handleCreateOrder}
                        className="w-full gap-1.5 sm:w-auto"
                    >
                        <FilePlus className="h-4 w-4" />
                        New Order
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="w-full gap-1.5 sm:w-auto"
                        disabled={isExporting}
                    >
                        <FileDown className="h-4 w-4" />
                        {isExporting ? "Exporting..." : "Export"}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleViewAnalytics}
                        className="w-full gap-1.5 sm:w-auto"
                    >
                        <PieChart className="h-4 w-4" />
                        Analytics
                    </Button>
                </div>
            </div>

            {/* Stats overview */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                            Total Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="flex items-center">
                                <Package className="mr-2 h-5 w-5 text-blue-500" />
                                <div className="text-xl font-bold sm:text-2xl">
                                    {orderStats.totalOrders}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                            Received Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="flex items-center">
                                <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-500" />
                                <div className="text-xl font-bold sm:text-2xl">
                                    {orderStats.receivedOrders}
                                    <span className="text-muted-foreground ml-2 text-xs sm:text-sm">
                                        (
                                        {Math.round(
                                            (orderStats.receivedOrders /
                                                orderStats.totalOrders) *
                                                100,
                                        ) || 0}
                                        %)
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                            Pending Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="flex items-center">
                                <Clock className="mr-2 h-5 w-5 text-amber-500" />
                                <div className="text-xl font-bold sm:text-2xl">
                                    {orderStats.pendingOrders}
                                    <span className="text-muted-foreground ml-2 text-xs sm:text-sm">
                                        (
                                        {Math.round(
                                            (orderStats.pendingOrders /
                                                orderStats.totalOrders) *
                                                100,
                                        ) || 0}
                                        %)
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                            Total Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="flex items-center">
                                <Coins className="mr-2 h-5 w-5 text-violet-500" />
                                <div className="text-xl font-bold sm:text-2xl">
                                    {formatCurrency(orderStats.totalValue)}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/30 dark:to-cyan-900/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                            In Inventory
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="flex items-center">
                                <ShoppingCart className="mr-2 h-5 w-5 text-cyan-500" />
                                <div className="text-xl font-bold sm:text-2xl">
                                    {orderStats.inInventory}
                                    <span className="text-muted-foreground ml-2 text-xs sm:text-sm">
                                        (
                                        {Math.round(
                                            (orderStats.inInventory /
                                                orderStats.receivedOrders) *
                                                100,
                                        ) || 0}
                                        %)
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-950/30 dark:to-fuchsia-900/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-muted-foreground text-sm font-medium">
                            Dyed Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="flex items-center">
                                <Palette className="mr-2 h-5 w-5 text-fuchsia-500" />
                                <div className="text-xl font-bold sm:text-2xl">
                                    {orderStats.dyedItems}
                                    <span className="text-muted-foreground ml-2 text-xs sm:text-sm">
                                        (
                                        {Math.round(
                                            (orderStats.dyedItems /
                                                orderStats.totalOrders) *
                                                100,
                                        ) || 0}
                                        %)
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs and filters */}
            <div className="flex flex-col gap-4">
                <div
                    role="tablist"
                    className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="bg-muted/60 w-full rounded-md p-1 sm:w-auto">
                        <button
                            role="tab"
                            aria-selected={activeTab === "all"}
                            onClick={() => handleTabChange("all")}
                            className={`w-full rounded-sm px-3 py-1.5 text-sm font-medium transition-all sm:w-auto ${
                                activeTab === "all"
                                    ? "bg-background shadow-sm"
                                    : "text-muted-foreground"
                            }`}
                        >
                            All Orders
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === "pending"}
                            onClick={() => handleTabChange("pending")}
                            className={`w-full rounded-sm px-3 py-1.5 text-sm font-medium transition-all sm:w-auto ${
                                activeTab === "pending"
                                    ? "bg-background shadow-sm"
                                    : "text-muted-foreground"
                            }`}
                        >
                            Pending
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === "received"}
                            onClick={() => handleTabChange("received")}
                            className={`w-full rounded-sm px-3 py-1.5 text-sm font-medium transition-all sm:w-auto ${
                                activeTab === "received"
                                    ? "bg-background shadow-sm"
                                    : "text-muted-foreground"
                            }`}
                        >
                            Received
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Sheet
                            open={isFilterOpen}
                            onOpenChange={setIsFilterOpen}
                        >
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-1.5 sm:w-auto"
                                >
                                    <Filter className="h-4 w-4" />
                                    Filter
                                    {(filters.vendorId ||
                                        filters.colorStatus ||
                                        filters.threadType ||
                                        filters.dateRange.from) && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-1 rounded-sm px-1"
                                        >
                                            {[
                                                filters.vendorId ? 1 : 0,
                                                filters.colorStatus ? 1 : 0,
                                                filters.threadType ? 1 : 0,
                                                filters.dateRange.from ? 1 : 0,
                                            ].reduce((a, b) => a + b, 0)}
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-md">
                                <SheetHeader>
                                    <SheetTitle>
                                        Filter Thread Orders
                                    </SheetTitle>
                                    <SheetDescription>
                                        Apply filters to narrow down your thread
                                        orders list
                                    </SheetDescription>
                                </SheetHeader>

                                <ScrollArea className="mt-6 h-[calc(100vh-220px)] pr-4">
                                    <div className="space-y-6">
                                        {/* Vendor filter */}
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-medium">
                                                Vendor
                                            </h3>
                                            <Select
                                                value={filters.vendorId || ""}
                                                onValueChange={(value) =>
                                                    handleFiltersChange({
                                                        ...filters,
                                                        vendorId:
                                                            value === ""
                                                                ? null
                                                                : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="All vendors" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">
                                                        All vendors
                                                    </SelectItem>
                                                    {uniqueVendors.map(
                                                        (vendor) => (
                                                            <SelectItem
                                                                key={vendor.id}
                                                                value={
                                                                    vendor.id
                                                                }
                                                            >
                                                                {vendor.name}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Thread type filter */}
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-medium">
                                                Thread Type
                                            </h3>
                                            <Select
                                                value={filters.threadType || ""}
                                                onValueChange={(value) =>
                                                    handleFiltersChange({
                                                        ...filters,
                                                        threadType:
                                                            value === ""
                                                                ? null
                                                                : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="All thread types" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">
                                                        All thread types
                                                    </SelectItem>
                                                    {uniqueThreadTypes.map(
                                                        (type) => (
                                                            <SelectItem
                                                                key={type}
                                                                value={type}
                                                            >
                                                                {type}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Color status filter */}
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-medium">
                                                Color Status
                                            </h3>
                                            <Select
                                                value={
                                                    filters.colorStatus || ""
                                                }
                                                onValueChange={(value) =>
                                                    handleFiltersChange({
                                                        ...filters,
                                                        colorStatus:
                                                            value === ""
                                                                ? null
                                                                : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="All color statuses" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">
                                                        All color statuses
                                                    </SelectItem>
                                                    <SelectItem value="RAW">
                                                        Raw
                                                    </SelectItem>
                                                    <SelectItem value="COLORED">
                                                        Colored
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Date range filter */}
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-medium">
                                                Order Date Range
                                            </h3>
                                            <DatePickerWithRange
                                                date={filters.dateRange}
                                                onChange={(dateRange) =>
                                                    handleFiltersChange({
                                                        ...filters,
                                                        dateRange,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </ScrollArea>

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

                        <div className="relative w-full sm:w-auto">
                            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                            <Input
                                type="search"
                                placeholder="Search orders..."
                                value={filters.searchQuery}
                                onChange={(e) =>
                                    handleFiltersChange({
                                        ...filters,
                                        searchQuery: e.target.value,
                                    })
                                }
                                className="w-full pl-8 sm:w-[250px]"
                            />
                        </div>
                    </div>
                </div>

                <TabPanel value="all">
                    <DataTable
                        columns={columns}
                        data={filteredThreadPurchases}
                        isLoading={isLoading}
                        onSelectedRowsChange={handleRowSelectionChange}
                        searchPlaceholder="Search thread orders..."
                        onRefresh={() => fetchThreadPurchases()}
                        addNewButton={handleCreateOrder}
                        addNewButtonLabel="New Order"
                        onExport={handleExport}
                        exportButtonLabel="Export"
                        tableSummary={
                            <div className="text-muted-foreground text-sm">
                                {filteredThreadPurchases.length} orders found
                            </div>
                        }
                    />
                </TabPanel>

                <TabPanel value="pending">
                    <DataTable
                        columns={columns}
                        data={filteredThreadPurchases}
                        isLoading={isLoading}
                        onSelectedRowsChange={handleRowSelectionChange}
                        searchPlaceholder="Search pending orders..."
                        onRefresh={() => fetchThreadPurchases()}
                        addNewButton={handleCreateOrder}
                        addNewButtonLabel="New Order"
                        onExport={handleExport}
                        exportButtonLabel="Export"
                        tableSummary={
                            <div className="text-muted-foreground text-sm">
                                {filteredThreadPurchases.length} pending orders
                            </div>
                        }
                    />
                </TabPanel>

                <TabPanel value="received">
                    <DataTable
                        columns={columns}
                        data={filteredThreadPurchases}
                        isLoading={isLoading}
                        onSelectedRowsChange={handleRowSelectionChange}
                        searchPlaceholder="Search received orders..."
                        onRefresh={() => fetchThreadPurchases()}
                        addNewButton={handleCreateOrder}
                        addNewButtonLabel="New Order"
                        onExport={handleExport}
                        exportButtonLabel="Export"
                        tableSummary={
                            <div className="text-muted-foreground text-sm">
                                {filteredThreadPurchases.length} received orders
                            </div>
                        }
                    />
                </TabPanel>
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border p-4">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
}

// Export the main component with Suspense
export default function ThreadOrdersPage() {
    return (
        <Suspense
            fallback={
                <div className="p-8">
                    <Skeleton className="h-[500px] w-full" />
                </div>
            }
        >
            <ThreadOrdersContent />
        </Suspense>
    );
}
